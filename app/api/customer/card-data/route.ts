import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSessionToken,
} from '@/lib/customerSession'

export const preferredRegion = 'sin1'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizePhones(raw: string) {
  let decoded = String(raw || '')
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // Keep original if decoding fails
  }

  const digits = decoded.replace(/\D/g, '')
  if (!digits || digits.length < 9) {
    return { formatted94: '', local0: '', plus94: '', raw9: '' }
  }

  const formatted94 = digits.startsWith('94')
    ? digits
    : `94${digits.replace(/^0+/, '')}`
  const local0 = formatted94.replace(/^94/, '0')
  const plus94 = `+${formatted94}`
  const raw9 = formatted94.replace(/^94/, '')

  return { formatted94, local0, plus94, raw9 }
}

async function verifySessionForPhone(formatted94: string) {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value
  const session = verifyCustomerSessionToken(rawToken)

  if (!session) return { ok: false, status: 401 }
  if (formatted94 && session.phone !== formatted94) return { ok: false, status: 403 }
  return { ok: true, status: 200, session }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body?.action || '')
    const supabase = getAdminClient()

    // 1. PUBLIC STORE BRANDING FOR LOGIN SCREEN (Only safe public fields)
    if (action === 'store_info') {
      const storeId = String(body?.storeId || '').trim()
      if (!storeId) {
        return NextResponse.json({ store: null })
      }

      const { data: storeData } = await supabase
        .from('stores')
        .select('id, store_name, logo_url, default_cashback_percent, target_visits')
        .eq('id', storeId)
        .maybeSingle()

      if (storeData) {
        return NextResponse.json({
          store: {
            id: String(storeData.id),
            name: storeData.store_name || 'Partner Store',
            logoUrl: storeData.logo_url || null,
            cashbackPercent: storeData.default_cashback_percent,
            targetVisits: storeData.target_visits,
          },
        })
      }

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id, business_name, store_name, logo_url, default_cashback_percent, target_visits')
        .eq('id', storeId)
        .maybeSingle()

      if (merchantData) {
        return NextResponse.json({
          store: {
            id: String(merchantData.id),
            name: merchantData.store_name || merchantData.business_name || 'Partner Store',
            logoUrl: merchantData.logo_url || null,
            cashbackPercent: merchantData.default_cashback_percent,
            targetVisits: merchantData.target_visits,
          },
        })
      }

      return NextResponse.json({ store: null })
    }

    // 2. FETCH OR INITIALIZE SINGLE CUSTOMER LOYALTY CARD
    if (action === 'get_card') {
      const paramId = String(body?.paramId || '').trim()
      const { formatted94, local0, plus94, raw9 } = normalizePhones(body?.phone || '')

      if (!paramId || !formatted94) {
        return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
      }

      const authCheck = await verifySessionForPhone(formatted94)
      if (!authCheck.ok) {
        return NextResponse.json(
          { error: 'Unauthorized', accessDenied: authCheck.status === 403 },
          { status: authCheck.status }
        )
      }

      const claimPhoneFilter = `customer_phone.eq.${formatted94},customer_phone.eq.${local0},customer_phone.eq.${plus94},customer_phone.eq.${raw9}`
      const customerPhoneFilter = `phone_number.eq.${formatted94},phone_number.eq.${local0},phone_number.eq.${plus94},phone_number.eq.${raw9}`

      let currentClaim: any = null

      const { data: claimById } = await supabase
        .from('cashback_claims')
        .select(`
          *,
          stores:store_id (
            id, store_name, store_slug, logo_url, location_url, review_url, target_visits, default_cashback_percent
          )
        `)
        .eq('id', paramId)
        .maybeSingle()

      if (claimById) {
        currentClaim = claimById
      } else {
        const { data: claimByStore } = await supabase
          .from('cashback_claims')
          .select(`
            *,
            stores:store_id (
              id, store_name, store_slug, logo_url, location_url, review_url, target_visits, default_cashback_percent
            )
          `)
          .eq('store_id', paramId)
          .or(claimPhoneFilter)
          .maybeSingle()

        currentClaim = claimByStore
      }

      if (!currentClaim) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('id')
          .eq('id', paramId)
          .maybeSingle()

        if (storeData) {
          let customerUuid: string | null = null
          const { data: existingCust } = await supabase
            .from('customers')
            .select('id')
            .or(customerPhoneFilter)
            .maybeSingle()

          if (existingCust) {
            customerUuid = existingCust.id
          } else {
            const { data: newCust } = await supabase
              .from('customers')
              .insert({ phone_number: formatted94, store_id: storeData.id })
              .select('id')
              .maybeSingle()
            if (newCust) customerUuid = newCust.id
          }

          const { data: newClaimData } = await supabase
            .from('cashback_claims')
            .upsert(
              {
                store_id: storeData.id,
                customer_id: customerUuid,
                customer_phone: formatted94,
                claimable_amount: 0,
                visit_count: 0,
                status: 'PENDING',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'customer_phone,store_id' }
            )
            .select(`
              *,
              stores:store_id (
                id, store_name, store_slug, logo_url, location_url, review_url, target_visits, default_cashback_percent
              )
            `)
            .maybeSingle()

          if (newClaimData) {
            currentClaim = newClaimData
          }
        }
      }

      if (!currentClaim) {
        return NextResponse.json({ claim: null })
      }

      // Strict ownership check
      if (currentClaim.customer_phone) {
        const { formatted94: claimPhone94 } = normalizePhones(currentClaim.customer_phone)
        if (claimPhone94 !== formatted94) {
          return NextResponse.json({ accessDenied: true }, { status: 403 })
        }
      }

      let resolvedTxObj: any = null
      let walletSummary: any = null

      if (currentClaim.store_id) {
        const [lastTxRes, summaryRes] = await Promise.all([
          supabase
            .from('cashback_history')
            .select('bill_amount, cashback_percentage, cashback_amount, net_paid_amount, transaction_type, created_at')
            .eq('claim_id', currentClaim.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('customer_wallet_summary')
            .select('last_bill_amount, total_redeemed_amount, current_balance, status')
            .eq('store_id', currentClaim.store_id)
            .or(claimPhoneFilter)
            .maybeSingle(),
        ])

        const lastTx = lastTxRes.data
        walletSummary = summaryRes.data

        if (lastTx) {
          const calculatedBill =
            walletSummary?.last_bill_amount && walletSummary.last_bill_amount > 0
              ? walletSummary.last_bill_amount
              : lastTx.bill_amount

          const isTxRedeemed = String(lastTx.transaction_type || '')
            .toUpperCase()
            .includes('REDEEMED')
          const redeemedAmt = isTxRedeemed
            ? Number(lastTx.cashback_amount || walletSummary?.total_redeemed_amount || 0)
            : Number(walletSummary?.total_redeemed_amount || 0)

          const netPaid =
            lastTx.net_paid_amount !== undefined && lastTx.net_paid_amount !== null
              ? lastTx.net_paid_amount
              : Math.max(0, calculatedBill - (isTxRedeemed ? redeemedAmt : 0))

          resolvedTxObj = {
            ...lastTx,
            bill_amount: calculatedBill,
            net_paid_amount: netPaid,
            redeemed_amount: redeemedAmt,
            total_redeemed: walletSummary?.total_redeemed_amount || 0,
            summary_status: currentClaim.status || walletSummary?.status,
          }
        }
      }

      return NextResponse.json({
        claim: currentClaim,
        latestTransaction: resolvedTxObj,
        walletSummary,
      })
    }

    // 3. FETCH STORE OFFERS
    if (action === 'get_offers') {
      const storeId = String(body?.storeId || '').trim()
      if (!storeId) return NextResponse.json({ offers: [] })

      const { data } = await supabase
        .from('store_offers')
        .select('id, title, description, image_url, expires_at, created_at')
        .eq('store_id', storeId)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      return NextResponse.json({ offers: data || [] })
    }

    // 4. FETCH FULL CUSTOMER HISTORY FOR THIS STORE
    if (action === 'get_history') {
      const storeId = String(body?.storeId || '').trim()
      const { formatted94, local0, plus94, raw9 } = normalizePhones(body?.phone || '')
      if (!storeId || !formatted94) return NextResponse.json({ history: [] })

      const authCheck = await verifySessionForPhone(formatted94)
      if (!authCheck.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: authCheck.status })
      }

      const claimPhoneFilter = `customer_phone.eq.${formatted94},customer_phone.eq.${local0},customer_phone.eq.${plus94},customer_phone.eq.${raw9}`

      const { data } = await supabase
        .from('cashback_history')
        .select('id, visit_count, bill_amount, net_paid_amount, cashback_amount, transaction_type, created_at')
        .eq('store_id', storeId)
        .or(claimPhoneFilter)
        .order('created_at', { ascending: false })

      return NextResponse.json({ history: data || [] })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: any) {
    console.error('Customer card-data API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}