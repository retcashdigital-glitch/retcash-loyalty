import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@retcashapp.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

function normalizePhone(raw: string): string {
  const cleaned = String(raw || '').replace(/\D/g, '')
  if (!cleaned) return ''
  return cleaned.startsWith('94') ? cleaned : `94${cleaned.replace(/^0/, '')}`
}

export async function POST(req: Request) {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { type, storeId, storeName, amount, visits, targetVisits, offerTitle } = body

    if (!type || !storeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let targetSubs: any[] = []

    if (type === 'CASHBACK') {
      const normalized = normalizePhone(body.phone)
      if (!normalized) {
        return NextResponse.json({ error: 'Phone required for CASHBACK notification' }, { status: 400 })
      }

      const { data } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('customer_phone', normalized)

      targetSubs = data || []
    } else if (type === 'OFFER') {
      // Find all customers linked to this store
      const { data: claims } = await supabase
        .from('cashback_claims')
        .select('customer_phone')
        .eq('store_id', storeId)

      const uniquePhones = Array.from(
        new Set((claims || []).map((c: any) => normalizePhone(c.customer_phone)).filter(Boolean))
      )

      if (uniquePhones.length > 0) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('*')
          .in('customer_phone', uniquePhones)

        targetSubs = data || []
      }
    }

    if (targetSubs.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    let sentCount = 0
    const expiredEndpoints: string[] = []

    await Promise.all(
      targetSubs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        const payload =
          type === 'CASHBACK'
            ? JSON.stringify({
                title: `${storeName || 'RETCASH'} - Cashback Added!`,
                body: `Rs. ${Number(amount || 0).toFixed(2)} added (${visits || 1}/${targetVisits || 6} visits). Tap to view your card.`,
                icon: '/logo.png',
                url: `/card/${storeId}?phone=${sub.customer_phone}`,
              })
            : JSON.stringify({
                title: `New Offer at ${storeName || 'Partner Store'}!`,
                body: `${offerTitle || 'Special deal available'} — Tap to view in your wallet.`,
                icon: '/logo.png',
                url: `/wallet/${sub.customer_phone}?tab=offers`,
              })

        try {
          await webpush.sendNotification(pushSubscription, payload)
          sentCount++
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint)
          } else {
            console.error('WebPush send error:', err?.message || err)
          }
        }
      })
    )

    // Clean up expired subscriptions automatically
    if (expiredEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
    }

    return NextResponse.json({ success: true, sent: sentCount })
  } catch (err: any) {
    console.error('Push send API error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}