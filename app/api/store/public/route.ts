import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const preferredRegion = 'sin1'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const SAFE_STORE_COLUMNS =
  'id, store_name, store_slug, logo_url, default_cashback_percent, location_url, review_url'

function getServerClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body?.action || '')
    const supabase = getServerClient()

    if (action === 'get_store') {
      const storeSlug = String(body?.storeSlug || '').trim()
      if (!storeSlug) {
        return NextResponse.json({ store: null }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('stores')
        .select(SAFE_STORE_COLUMNS)
        .eq('store_slug', storeSlug)
        .maybeSingle()

      if ((error || !data) && storeSlug) {
        const { data: idData } = await supabase
          .from('stores')
          .select(SAFE_STORE_COLUMNS)
          .eq('id', storeSlug)
          .maybeSingle()
        return NextResponse.json({ store: idData || null })
      }

      return NextResponse.json({ store: data || null })
    }

    if (action === 'check_balance') {
      const digits = String(body?.phone || '').replace(/\D/g, '')
      if (digits.length < 9) {
        return NextResponse.json({ balances: [] })
      }

      const formatted94 = digits.startsWith('94') ? digits : `94${digits.replace(/^0+/, '')}`
      const local0 = formatted94.replace(/^94/, '0')

      const { data: claims } = await supabase
        .from('cashback_claims')
        .select('store_id, claimable_amount, status, stores(store_name, logo_url)')
        .or(`customer_phone.eq.${formatted94},customer_phone.eq.${local0}`)
        .not('status', 'in', '("REDEEMED","VOIDED")')

      const storeMap: Record<string, any> = {}
      claims?.forEach((c: any) => {
        const amt = Number(c.claimable_amount || 0)
        if (amt <= 0) return
        const sId = c.store_id
        if (!storeMap[sId]) {
          storeMap[sId] = {
            store_name: c.stores?.store_name || 'Store',
            logo_url: c.stores?.logo_url || null,
            total_cashback: 0,
          }
        }
        storeMap[sId].total_cashback += amt
      })

      return NextResponse.json({ balances: Object.values(storeMap) })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: any) {
    console.error('Public store API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}