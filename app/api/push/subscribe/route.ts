import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizePhone(raw: string): string {
  const cleaned = String(raw || '').replace(/\D/g, '')
  if (!cleaned) return ''
  return cleaned.startsWith('94') ? cleaned : `94${cleaned.replace(/^0/, '')}`
}

export async function POST(req: Request) {
  try {
    const supabase = getAdminClient()
    const body = await req.json()
    const phone = normalizePhone(body.phone)
    const subscription = body.subscription

    if (
      !phone ||
      !subscription?.endpoint ||
      !String(subscription.endpoint).startsWith('https://') ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          customer_phone: phone,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: (req.headers.get('user-agent') || '').slice(0, 500),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('Supabase push_subscriptions upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Subscribe API error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}