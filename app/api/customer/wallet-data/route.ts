import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables (SUPABASE_SERVICE_ROLE_KEY)')
  }
  if (serviceRoleKey.startsWith('sb_publishable_')) {
    throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY: publishable key used instead of secret key')
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
    // Keep original string if URI decoding fails
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

function sanitizeStoreRow(store: any) {
  if (!store || typeof store !== 'object') return store
  const {
    password,
    password_hash,
    pin_hash,
    ...safeStore
  } = store
  return safeStore
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
        const { formatted94, local0, plus94, raw9 } = normalizePhones(String(formData.get('phone') || ''))

        if (!file || !customerId || !formatted94) {
          return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 })
        }

        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: 'Invalid image format. Only JPG, PNG, WEBP, or GIF allowed.' },
            { status: 400 }
          )
        }

        if (file.size > MAX_AVATAR_SIZE_BYTES) {
          return NextResponse.json(
            { error: 'Image size must be less than 5MB.' },
            { status: 400 }
          )
        }

        const { data: ownerCheck } = await supabase
          .from('customers')
          .select('id')
          .eq('id', customerId)
          .or(`phone_number.eq.${formatted94},phone_number.eq.${local0},phone_number.eq.${plus94},phone_number.eq.${raw9}`)
          .maybeSingle()

        if (!ownerCheck) {
          return NextResponse.json({ error: 'Unauthorized profile update' }, { status: 403 })
        }

        const rawExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
        const fileExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'png'
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
      const { formatted94, local0, plus94, raw9 } = normalizePhones(body?.phone || '')
      if (!formatted94) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }

      const customerPhoneFilter = `phone_number.eq.${formatted94},phone_number.eq.${local0},phone_number.eq.${plus94},phone_number.eq.${raw9}`
      const claimPhoneFilter = `customer_phone.eq.${formatted94},customer_phone.eq.${local0},customer_phone.eq.${plus94},customer_phone.eq.${raw9}`

      const [customerRes, claimsRes, summariesRes, offersRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, full_name, email, avatar_url, phone_number')
          .or(customerPhoneFilter)
          .limit(1),
        supabase
          .from('cashback_claims')
          .select('*')
          .or(claimPhoneFilter),
        supabase
          .from('customer_wallet_summary')
          .select('*')
          .or(claimPhoneFilter),
        supabase
          .from('store_offers')
          .select(`
            *,
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

      if (claimsRes.error) {
        console.error('Wallet claims query error:', claimsRes.error)
        return NextResponse.json(
          { error: `Claims DB Error: ${claimsRes.error.message}` },
          { status: 500 }
        )
      }

      const customer = customerRes.data?.[0] || null
      const rawClaims = claimsRes.data || []

      // Sort claims by updated_at or created_at safely in JS
      const claimsData = [...rawClaims].sort((a: any, b: any) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime()
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime()
        return timeB - timeA
      })

      const walletSummaries = summariesRes.data || []
      const activeOffers = offersRes.data || []

      let lastRedeemedTxs: any[] = []
      let userStores: any[] = []

      if (claimsData.length > 0) {
        const claimIds = claimsData.map((c: any) => c.id).filter(Boolean)
        const storeIds = Array.from(
          new Set(claimsData.map((c: any) => c.store_id).filter(Boolean))
        )

        const [redeemedRes, storesRes] = await Promise.all([
          claimIds.length > 0
            ? supabase
                .from('cashback_history')
                .select('*')
                .in('claim_id', claimIds)
                .eq('transaction_type', 'REDEEMED')
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          storeIds.length > 0
            ? supabase
                .from('stores')
                .select('*')
                .in('id', storeIds)
            : Promise.resolve({ data: [], error: null }),
        ])

        if (storesRes.error) {
          console.error('Wallet stores query error:', storesRes.error)
          return NextResponse.json(
            { error: `Stores DB Error: ${storesRes.error.message}` },
            { status: 500 }
          )
        }

        lastRedeemedTxs = redeemedRes.data || []
        userStores = (storesRes.data || []).map(sanitizeStoreRow)
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
      const fullName = String(body?.fullName || '').trim().slice(0, 100)
      const { formatted94, local0, plus94, raw9 } = normalizePhones(body?.phone || '')

      if (!customerId || !formatted94 || !fullName) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      }

      const { data: ownerCheck } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .or(`phone_number.eq.${formatted94},phone_number.eq.${local0},phone_number.eq.${plus94},phone_number.eq.${raw9}`)
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
    console.error('Wallet data API error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}