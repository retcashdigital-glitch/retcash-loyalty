import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

function verifyAdminSession(req: Request): boolean {
  if (!serviceRoleKey) return false
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('admin_authenticated='))

  if (!match) return false
  const token = decodeURIComponent(match.split('=').slice(1).join('='))
  if (!token.includes('.')) return false

  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return false

  const expectedSig = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(encoded)
    .digest('hex')

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>
    if (payload.role !== 'admin') return false
    if (Date.now() > Number(payload.exp || 0)) return false
    return true
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized admin session' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const action = String(body?.action || '')
    const supabase = getAdminClient()

    if (action === 'list_stores') {
      const { data, error } = await supabase
        .from('stores')
        .select('id, store_name, phone_number, plan_type, subscription_status, trial_ends_at')
        .order('store_name', { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ stores: data || [] })
    }

    if (action === 'adjust_months') {
      const storeId = String(body?.storeId || '').trim()
      const months = Number(body?.months || 0)
      const plan = body?.plan ? String(body.plan).trim() : null

      if (!storeId || !months || isNaN(months)) {
        return NextResponse.json({ error: 'Invalid storeId or months' }, { status: 400 })
      }

      const { data: store, error: fetchErr } = await supabase
        .from('stores')
        .select('id, trial_ends_at, plan_type')
        .eq('id', storeId)
        .single()

      if (fetchErr || !store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
      }

      const now = new Date()
      const currentEnd = store.trial_ends_at ? new Date(store.trial_ends_at) : now
      const baseDate =
        months > 0
          ? currentEnd > now
            ? new Date(currentEnd)
            : new Date(now)
          : new Date(currentEnd)

      baseDate.setMonth(baseDate.getMonth() + months)

      const isFuture = baseDate.getTime() > now.getTime()
      const newStatus = isFuture ? 'active' : 'expired'
      const resolvedPlan = plan || store.plan_type || 'monthly'

      const { error: updateErr } = await supabase
        .from('stores')
        .update({
          trial_ends_at: baseDate.toISOString(),
          subscription_status: newStatus,
          plan_type: resolvedPlan,
        })
        .eq('id', storeId)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'set_expiry_date') {
      const storeId = String(body?.storeId || '').trim()
      const dateStr = String(body?.date || '').trim() // YYYY-MM-DD

      if (!storeId || !dateStr) {
        return NextResponse.json({ error: 'Store ID and date are required' }, { status: 400 })
      }

      const parsedDate = new Date(`${dateStr}T23:59:59.000Z`)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }

      const isFuture = parsedDate.getTime() > Date.now()
      const newStatus = isFuture ? 'active' : 'expired'

      const { error: updateErr } = await supabase
        .from('stores')
        .update({
          trial_ends_at: parsedDate.toISOString(),
          subscription_status: newStatus,
        })
        .eq('id', storeId)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: any) {
    console.error('Admin subscriptions API error:', err)
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    )
  }
}