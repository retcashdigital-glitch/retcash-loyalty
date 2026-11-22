import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

function verifyMerchantSessionCookie(req: Request, expectedStoreId: string): boolean {
  if (!expectedStoreId || !serviceRoleKey) return false
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('retcash_merchant_session='))

  if (!match) return false
  const token = decodeURIComponent(match.split('=').slice(1).join('='))
  if (!token.includes('.')) return false

  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return false

  const expectedSig = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(encoded)
    .digest('base64url')

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>
    if (payload.purpose !== 'merchant_session') return false
    if (Date.now() > Number(payload.exp || 0)) return false
    return String(payload.storeId) === String(expectedStoreId)
  } catch {
    return false
  }
}

function formatCustomerPhone(inputPhone: string) {
  let cleaned = String(inputPhone || '').replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
  if (!cleaned.startsWith('94')) cleaned = '94' + cleaned
  return cleaned
}

export async function POST(req: Request) {
  try {
    const supabase = getAdminClient()
    const contentType = req.headers.get('content-type') || ''

    // 1. HANDLE FILE UPLOADS (Receipt, Store Logo, Offer Poster)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const action = String(formData.get('action') || '')
      const storeId = String(formData.get('storeId') || '').trim()

      if (!storeId) {
        return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
      }

      if (!verifyMerchantSessionCookie(req, storeId)) {
        return NextResponse.json({ error: 'Unauthorized merchant session' }, { status: 401 })
      }

      if (action === 'submit_payment') {
        const file = formData.get('file') as File | null
        const planType = String(formData.get('planType') || 'yearly')
        const amount = Number(formData.get('amount') || 7900)
        const transactionRef = String(formData.get('transactionRef') || '').trim()

        if (!file) {
          return NextResponse.json({ error: 'Receipt file is required' }, { status: 400 })
        }

        const fileExt = file.name.split('.').pop() || 'png'
        const filePath = `receipts/${storeId}_${Date.now()}.${fileExt}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadErr } = await supabase.storage
          .from('payment-receipts')
          .upload(filePath, buffer, {
            contentType: file.type || 'image/png',
            upsert: false,
          })

        if (uploadErr) {
          return NextResponse.json({ error: 'Failed to upload receipt file: ' + uploadErr.message }, { status: 500 })
        }

        const { data: signedData } = await supabase.storage
          .from('payment-receipts')
          .createSignedUrl(filePath, 60 * 60 * 24 * 30)

        const { data: publicUrlData } = supabase.storage
          .from('payment-receipts')
          .getPublicUrl(filePath)

        const receiptUrl = signedData?.signedUrl || publicUrlData.publicUrl

        const { error: dbErr } = await supabase.from('payment_requests').insert({
          store_id: storeId,
          plan_type: planType,
          amount,
          receipt_url: receiptUrl,
          transaction_ref: transactionRef || null,
          status: 'PENDING',
        })

        if (dbErr) {
          return NextResponse.json({ error: 'Failed to log payment request: ' + dbErr.message }, { status: 500 })
        }

        return NextResponse.json({ receiptUrl })
      }

      if (action === 'update_logo') {
        const file = formData.get('file') as File | null
        if (!file) {
          return NextResponse.json({ error: 'Logo file is required' }, { status: 400 })
        }

        const fileExt = file.name.split('.').pop() || 'png'
        const filePath = `store_${storeId}.${fileExt}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabase.storage
          .from('store-logos')
          .upload(filePath, buffer, {
            contentType: file.type || 'image/png',
            upsert: true,
          })

        if (uploadError) {
          return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        const { data: urlData } = supabase.storage
          .from('store-logos')
          .getPublicUrl(filePath)

        const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

        const { error: dbError } = await supabase
          .from('stores')
          .update({ logo_url: publicUrl })
          .eq('id', storeId)

        if (dbError) {
          return NextResponse.json({ error: dbError.message }, { status: 500 })
        }

        return NextResponse.json({ logoUrl: publicUrl })
      }

      if (action === 'add_offer') {
        const file = formData.get('file') as File | null
        const title = String(formData.get('title') || '').trim()
        const description = String(formData.get('description') || '').trim()
        const expiresAt = String(formData.get('expiresAt') || '').trim()

        if (!file || !title || !expiresAt) {
          return NextResponse.json({ error: 'Missing required offer fields' }, { status: 400 })
        }

        const fileExt = file.name.split('.').pop() || 'png'
        const filePath = `${storeId}_${Date.now()}.${fileExt}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabase.storage
          .from('offer-posters')
          .upload(filePath, buffer, {
            contentType: file.type || 'image/png',
            upsert: false,
          })

        if (uploadError) {
          return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        const { data: urlData } = supabase.storage
          .from('offer-posters')
          .getPublicUrl(filePath)

        const { error: dbError } = await supabase
          .from('store_offers')
          .insert({
            store_id: storeId,
            title,
            description,
            image_url: urlData.publicUrl,
            expires_at: new Date(expiresAt).toISOString(),
            is_active: true,
          })

        if (dbError) {
          return NextResponse.json({ error: dbError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
      }

      return NextResponse.json({ error: 'Unsupported upload action' }, { status: 400 })
    }

    // 2. HANDLE JSON ACTIONS
    const body = await req.json()
    const action = String(body?.action || '')
    const storeId = String(body?.storeId || '').trim()

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    if (!verifyMerchantSessionCookie(req, storeId)) {
      return NextResponse.json({ error: 'Unauthorized merchant session' }, { status: 401 })
    }

    if (action === 'verify_session') {
      const { data: realStore, error: storeErr } = await supabase
        .from('stores')
        .select('id, store_name, phone_number, default_cashback_percent, target_visits, logo_url, location_url, review_url, category, trial_ends_at, subscription_status, plan_type')
        .eq('id', storeId)
        .maybeSingle()

      if (storeErr || !realStore) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
      }

      const nowIso = new Date().toISOString()
      const [pendingRes, offersRes, customersRes] = await Promise.all([
        supabase
          .from('payment_requests')
          .select('id, receipt_url, status')
          .eq('store_id', storeId)
          .eq('status', 'PENDING')
          .maybeSingle(),
        supabase
          .from('store_offers')
          .select('*')
          .eq('store_id', storeId)
          .gte('expires_at', nowIso)
          .order('created_at', { ascending: false }),
        supabase
          .from('cashback_claims')
          .select('*')
          .eq('store_id', storeId)
          .order('updated_at', { ascending: false }),
      ])

      return NextResponse.json({
        store: realStore,
        pendingPayment: pendingRes.data || null,
        offers: offersRes.data || [],
        customers: customersRes.data || [],
      })
    }

    if (action === 'update_store_details') {
      const category = String(body?.category || 'others').trim() || 'others'
      const locationUrl = body?.locationUrl ? String(body.locationUrl).trim() : null
      const reviewUrl = body?.reviewUrl ? String(body.reviewUrl).trim() : null

      const { error } = await supabase
        .from('stores')
        .update({
          category,
          location_url: locationUrl || null,
          review_url: reviewUrl || null,
        })
        .eq('id', storeId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'cancel_payment') {
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: 'CANCELLED' })
        .eq('store_id', storeId)
        .eq('status', 'PENDING')

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'check_customer') {
      const phoneNum = String(body?.phoneNum || '').trim()
      const { data } = await supabase
        .from('cashback_claims')
        .select('*')
        .eq('store_id', storeId)
        .eq('customer_phone', phoneNum)
        .maybeSingle()

      return NextResponse.json({ claim: data || null })
    }

    if (action === 'fetch_offers') {
      const { data } = await supabase
        .from('store_offers')
        .select('*')
        .eq('store_id', storeId)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      return NextResponse.json({ offers: data || [] })
    }

    if (action === 'fetch_customers') {
      const { data } = await supabase
        .from('cashback_claims')
        .select('*')
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false })

      return NextResponse.json({ customers: data || [] })
    }

    if (action === 'update_target_visits') {
      const newTarget = Math.min(Math.max(parseInt(String(body?.targetVisits || '6'), 10), 1), 10)
      const { error } = await supabase
        .from('stores')
        .update({ target_visits: newTarget })
        .eq('id', storeId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, targetVisits: newTarget })
    }

    if (action === 'update_cashback_percent') {
      const newPercent = parseFloat(String(body?.cashbackPercent || '5'))
      if (isNaN(newPercent) || newPercent <= 0 || newPercent > 100) {
        return NextResponse.json({ error: 'Invalid percentage' }, { status: 400 })
      }
      const { error } = await supabase
        .from('stores')
        .update({ default_cashback_percent: newPercent })
        .eq('id', storeId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cashbackPercent: newPercent })
    }

    if (action === 'delete_offer') {
      const offerId = String(body?.offerId || '').trim()
      const { error } = await supabase
        .from('store_offers')
        .delete()
        .eq('id', offerId)
        .eq('store_id', storeId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'scan_claim') {
      const claimId = String(body?.claimId || '').trim()
      const { data, error } = await supabase
        .from('cashback_claims')
        .select('*')
        .eq('id', claimId)
        .eq('store_id', storeId)
        .maybeSingle()

      if (error || !data) {
        return NextResponse.json({ error: 'Invalid QR Code or does not belong to this store.' }, { status: 404 })
      }

      return NextResponse.json({ claim: data })
    }

    if (action === 'redeem_reward') {
      const claimId = String(body?.claimId || '').trim()
      const { data: claim, error: fetchErr } = await supabase
        .from('cashback_claims')
        .select('*')
        .eq('id', claimId)
        .eq('store_id', storeId)
        .single()

      if (fetchErr || !claim) {
        return NextResponse.json({ error: 'Claim record not found.' }, { status: 404 })
      }

      const redeemedAmt = Number(claim.claimable_amount || 0)
      const lastBillAmt = Number(claim.bill_amount || 0)
      const calculatedNetPaid = Math.max(0, Math.round((lastBillAmt - redeemedAmt) * 100) / 100)

      const { error: updateErr } = await supabase
        .from('cashback_claims')
        .update({
          claimable_amount: 0,
          cashback_amount: 0,
          visit_count: claim.visit_count,
          status: 'REDEEMED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', claim.id)
        .eq('store_id', storeId)

      if (updateErr) {
        return NextResponse.json({ error: 'Redemption DB Update Failed: ' + updateErr.message }, { status: 500 })
      }

      await supabase.from('cashback_history').insert({
        claim_id: claim.id,
        store_id: storeId,
        customer_phone: claim.customer_phone,
        visit_count: claim.visit_count,
        bill_amount: lastBillAmt,
        cashback_percentage: 0,
        cashback_amount: redeemedAmt,
        net_paid_amount: calculatedNetPaid,
        transaction_type: 'REDEEMED',
        status: 'REDEEMED',
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'generate_cashback') {
      const initialBillNum = parseFloat(String(body?.billAmount || '0'))
      const cleanCustPhone = formatCustomerPhone(String(body?.customerPhone || ''))

      if (!cleanCustPhone || isNaN(initialBillNum) || initialBillNum <= 0) {
        return NextResponse.json({ error: 'Please enter a valid phone and bill amount.' }, { status: 400 })
      }

      const { data: store } = await supabase
        .from('stores')
        .select('id, default_cashback_percent, target_visits, subscription_status, trial_ends_at')
        .eq('id', storeId)
        .single()

      if (!store) {
        return NextResponse.json({ error: 'Store not found.' }, { status: 404 })
      }

      const cashbackPercentage = store.default_cashback_percent || 5
      const targetVisits = Math.min(Math.max(store.target_visits || 6, 1), 10)

      let customerUuid: string | null = null
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, store_id')
        .eq('phone_number', cleanCustPhone)
        .maybeSingle()

      if (existingCust) {
        customerUuid = existingCust.id
        if (!existingCust.store_id) {
          await supabase.from('customers').update({ store_id: storeId }).eq('id', existingCust.id)
        }
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ phone_number: cleanCustPhone, store_id: storeId })
          .select('id')
          .single()

        if (!custErr && newCust) customerUuid = newCust.id
      }

      const { data: existingClaim } = await supabase
        .from('cashback_claims')
        .select('*')
        .eq('store_id', storeId)
        .eq('customer_phone', cleanCustPhone)
        .maybeSingle()

      const isActiveCycle =
        existingClaim &&
        existingClaim.status !== 'REDEEMED' &&
        existingClaim.status !== 'VOIDED' &&
        Number(existingClaim.claimable_amount || 0) > 0

      const existingAmount = isActiveCycle ? Number(existingClaim.claimable_amount || 0) : 0
      const currentVisits = isActiveCycle ? Number(existingClaim.visit_count || 0) : 0

      let newVisitCount = 1
      let cashbackAmount = 0
      let totalClaimable = 0

      if (targetVisits === 1) {
        if (isActiveCycle && existingClaim?.status === 'READY') {
          newVisitCount = 1
          cashbackAmount = 0
          totalClaimable = existingAmount
        } else {
          newVisitCount = 1
          cashbackAmount = Math.round(((initialBillNum * cashbackPercentage) / 100) * 100) / 100
          totalClaimable = Math.round((existingAmount + cashbackAmount) * 100) / 100
        }
      } else {
        newVisitCount = currentVisits >= targetVisits ? targetVisits : currentVisits + 1
        if (newVisitCount >= targetVisits && existingAmount > 0) {
          cashbackAmount = 0
          totalClaimable = existingAmount
        } else {
          cashbackAmount = Math.round(((initialBillNum * cashbackPercentage) / 100) * 100) / 100
          totalClaimable = Math.round((existingAmount + cashbackAmount) * 100) / 100
        }
      }

      const claimStatus = newVisitCount >= targetVisits ? 'READY' : 'PENDING'
      const nowIso = new Date().toISOString()

      const { data: upsertedData, error: upsertError } = await supabase
        .from('cashback_claims')
        .upsert(
          {
            store_id: storeId,
            customer_id: customerUuid,
            customer_phone: cleanCustPhone,
            claimable_amount: totalClaimable,
            visit_count: newVisitCount,
            status: claimStatus,
            bill_amount: initialBillNum,
            cashback_amount: cashbackAmount,
            updated_at: nowIso,
          },
          { onConflict: 'customer_phone, store_id' }
        )
        .select('*')
        .single()

      if (upsertError) {
        return NextResponse.json({ error: 'Cashback claim update failed: ' + upsertError.message }, { status: 500 })
      }

      await supabase.from('cashback_history').insert({
        claim_id: upsertedData?.id,
        store_id: storeId,
        customer_phone: cleanCustPhone,
        visit_count: newVisitCount,
        bill_amount: initialBillNum,
        cashback_percentage: cashbackAmount > 0 ? cashbackPercentage : 0,
        cashback_amount: cashbackAmount,
        net_paid_amount: initialBillNum,
        transaction_type: 'BILL_ADDED',
        status: claimStatus,
      })

      return NextResponse.json({
        upsertedData,
        cashbackAmount,
        totalClaimable,
        newVisitCount,
        targetVisits,
        cleanCustPhone,
      })
    }

    if (action === 'void_cashback') {
      const claimId = String(body?.claimId || '').trim()

      const [storeRes, claimRes] = await Promise.all([
        supabase.from('stores').select('target_visits').eq('id', storeId).single(),
        supabase.from('cashback_claims').select('*').eq('id', claimId).eq('store_id', storeId).single(),
      ])

      const targetVisits = Math.min(Math.max(storeRes.data?.target_visits || 6, 1), 10)
      const freshClaim = claimRes.data

      if (claimRes.error || !freshClaim) {
        return NextResponse.json({ error: 'Transaction record not found.' }, { status: 404 })
      }

      if (freshClaim.status === 'REDEEMED' || freshClaim.status === 'VOIDED') {
        return NextResponse.json({ error: 'This transaction has already been redeemed or voided.' }, { status: 400 })
      }

      const voidCashbackAmt = Number(freshClaim.cashback_amount || 0)
      const voidBillAmt = Number(freshClaim.bill_amount || 0)

      if (voidCashbackAmt <= 0) {
        return NextResponse.json({ error: 'No recent cashback available to undo on this record.' }, { status: 400 })
      }

      const elapsedMs = Date.now() - new Date(freshClaim.updated_at).getTime()
      if (elapsedMs > 15 * 60 * 1000) {
        return NextResponse.json({ error: 'The 15-minute undo window has expired for this transaction.' }, { status: 400 })
      }

      const revertedClaimable = Math.max(
        0,
        Math.round((Number(freshClaim.claimable_amount || 0) - voidCashbackAmt) * 100) / 100
      )

      const currentVisits = Number(freshClaim.visit_count || 0)
      let revertedVisitCount = 0
      if (currentVisits > 1) {
        revertedVisitCount = currentVisits - 1
      } else if (currentVisits === 1 && revertedClaimable > 0) {
        revertedVisitCount = targetVisits
      } else {
        revertedVisitCount = 0
      }

      const revertedStatus =
        revertedVisitCount === 0 && revertedClaimable === 0
          ? 'VOIDED'
          : revertedVisitCount >= targetVisits
          ? 'READY'
          : 'PENDING'

      const { error: updateErr } = await supabase
        .from('cashback_claims')
        .update({
          claimable_amount: revertedClaimable,
          visit_count: revertedVisitCount,
          status: revertedStatus,
          bill_amount: 0,
          cashback_amount: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', freshClaim.id)
        .eq('store_id', storeId)

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to void transaction: ' + updateErr.message }, { status: 500 })
      }

      await supabase.from('cashback_history').insert({
        claim_id: freshClaim.id,
        store_id: storeId,
        customer_phone: freshClaim.customer_phone,
        visit_count: revertedVisitCount,
        bill_amount: voidBillAmt,
        cashback_percentage: 0,
        cashback_amount: -voidCashbackAmt,
        net_paid_amount: 0,
        transaction_type: 'VOIDED',
        status: 'VOIDED',
      })

      return NextResponse.json({
        voidCashbackAmt,
        customerPhone: freshClaim.customer_phone,
      })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err) {
    console.error('Merchant portal API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}