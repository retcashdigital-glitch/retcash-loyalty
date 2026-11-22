import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return { formatted94: '', local0: '' }
  const formatted94 = digits.startsWith('94')
    ? digits
    : `94${digits.replace(/^0/, '')}`
  const local0 = formatted94.replace(/^94/, '0')
  return { formatted94, local0 }
}

export async function POST(req: Request) {
  try {
    const supabase = getAdminClient()
    const contentType = req.headers.get('content-type') || ''

    // 1. HANDLE AVATAR UPLOAD (Multipart FormData)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const action = String(formData.get('action') || '')

      if (action === 'upload_avatar') {
        const file = formData.get('file') as File | null
        const customerId = String(formData.get('customerId') || '').trim()
        const { formatted94, local0 } = normalizePhones(String(formData.get('phone') || ''))

        if (!file || !customerId || !formatted94) {
          return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 })
        }

        // Verify customer ownership
        const { data: ownerCheck } = await supabase
          .from('customers')
          .select('id')
          .eq('id', customerId)
          .or(`phone_number.eq.${formatted94},phone_number.eq.${local0}`)
          .maybeSingle()

        if (!ownerCheck) {
          return NextResponse.json({ error: 'Unauthorized profile update' }, { status: 403 })
        }

        const fileExt = file.name.split('.').pop() || 'png'
        const filePath = `${customerId}/avatar.${fileExt}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, buffer, {
            contentType: file.type || 'image/png',
            upsert: true,
          })

        if (uploadError) {
          return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

        const { error: updateError } = await supabase
          .from('customers')
          .update({ avatar_url: publicUrl })
          .eq('id', customerId)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ avatarUrl: publicUrl })
      }

      return NextResponse.json({ error: 'Unsupported multipart action' }, { status: 400 })
    }

    // 2. HANDLE JSON ACTIONS
    const body = await req.json()
    const action = String(body?.action || '')

    if (action === 'get_wallet') {
      const { formatted94, local0 } = normalizePhones(body?.phone || '')
      if (!formatted94) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }

      const [customerRes, claimsRes, summariesRes, offersRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, full_name, email, avatar_url')
          .or(`phone_number.eq.${formatted94},phone_number.eq.${local0}`)
          .limit(1),
        supabase
          .from('cashback_claims')
          .select('id, store_id, customer_phone, claimable_amount, cashback_amount, visit_count, status, updated_at, created_at')
          .or(`customer_phone.eq.${formatted94},customer_phone.eq.${local0}`)
          .order('updated_at', { ascending: false }),
        supabase
          .from('customer_wallet_summary')
          .select('store_id, current_balance, status')
          .or(`customer_phone.eq.${formatted94},customer_phone.eq.${local0}`),
        supabase
          .from('store_offers')
          .select(`
            id, store_id, title, description, image_url, expires_at, created_at,
            stores:store_id (
              id,
              store_name,
              logo_url,
              category
            )
          `)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ])

      const customer = customerRes.data?.[0] || null
      const claimsData = claimsRes.data || []
      const walletSummaries = summariesRes.data || []
      const activeOffers = offersRes.data || []

      let lastRedeemedTxs: any[] = []
      let userStores: any[] = []

      if (claimsData.length > 0) {
        const claimIds = claimsData.map((c: any) => c.id)
        const storeIds = Array.from(new Set(claimsData.map((c: any) => String(c.store_id))))

        const [redeemedRes, storesRes] = await Promise.all([
          supabase
            .from('cashback_history')
            .select('claim_id, cashback_amount, created_at')
            .in('claim_id', claimIds)
            .eq('transaction_type', 'REDEEMED')
            .order('created_at', { ascending: false }),
          supabase
            .from('stores')
            .select('id, store_name, store_slug, category, description, logo_url, location_url, review_url, target_visits, default_cashback_percent, created_at')
            .in('id', storeIds),
        ])

        lastRedeemedTxs = redeemedRes.data || []
        userStores = storesRes.data || []
      }

      return NextResponse.json({
        customer,
        claimsData,
        walletSummaries,
        lastRedeemedTxs,
        userStores,
        activeOffers,
      })
    }

    if (action === 'update_profile') {
      const customerId = String(body?.customerId || '').trim()
      const fullName = String(body?.fullName || '').trim()
      const { formatted94, local0 } = normalizePhones(body?.phone || '')

      if (!customerId || !formatted94) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      }

      const { data: ownerCheck } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .or(`phone_number.eq.${formatted94},phone_number.eq.${local0}`)
        .maybeSingle()

      if (!ownerCheck) {
        return NextResponse.json({ error: 'Unauthorized profile update' }, { status: 403 })
      }

      const { error } = await supabase
        .from('customers')
        .update({ full_name: fullName })
        .eq('id', customerId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: any) {
    console.error('Wallet data API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}