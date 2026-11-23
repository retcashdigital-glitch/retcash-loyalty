import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const preferredRegion = 'sin1'

function getVerifiedMerchantStoreId(req: Request, serviceRoleKey: string): string | null {
  if (!serviceRoleKey) return null
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('retcash_merchant_session='))

  if (!match) return null
  const token = decodeURIComponent(match.split('=').slice(1).join('='))
  if (!token.includes('.')) return null

  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  const expectedSig = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(encoded)
    .digest('base64url')

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>
    if (payload.purpose !== 'merchant_session') return null
    if (Date.now() > Number(payload.exp || 0)) return null
    return payload.storeId ? String(payload.storeId) : null
  } catch {
    return null
  }
}

function formatCustomerPhone(inputPhone: string) {
  let cleaned = String(inputPhone || '').replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
  if (!cleaned.startsWith('94')) cleaned = '94' + cleaned
  return cleaned
}

async function broadcastCustomerUpdate(
  supabaseAdmin: any,
  supabaseUrl: string,
  serviceKey: string,
  claimId?: string | number | null,
  customerPhone?: string | null
) {
  const tasks: Promise<unknown>[] = []
  const cleanPhone = customerPhone ? formatCustomerPhone(customerPhone) : ''

  const sendToTopic = async (channelName: string, event: string, payload: Record<string, unknown>) => {
    try {
      const ch = supabaseAdmin.channel(channelName)
      if (typeof (ch as any).httpSend === 'function') {
        await (ch as any).httpSend(event, payload)
      } else {
        await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                topic: `realtime:${channelName}`,
                event,
                payload,
              },
            ],
          }),
        })
      }
      await supabaseAdmin.removeChannel(ch)
    } catch {
      // Never block redemption response if broadcast fails
    }
  }

  if (claimId) {
    tasks.push(
      sendToTopic(`realtime-card-${claimId}`, 'claim_updated', {
        claimId: String(claimId),
        ts: Date.now(),
      })
    )
  }

  if (cleanPhone) {
    tasks.push(
      sendToTopic(`realtime-wallet-${cleanPhone}`, 'wallet_updated', {
        phone: cleanPhone,
        ts: Date.now(),
      })
    )
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { claimId, storeId } = body

    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL in environment' }, { status: 500 })
    }

    if (!serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY in environment' }, { status: 500 })
    }

    const sessionStoreId = getVerifiedMerchantStoreId(request, serviceKey)
    if (!sessionStoreId) {
      return NextResponse.json({ error: 'Unauthorized merchant session' }, { status: 401 })
    }

    if (storeId && String(storeId) !== String(sessionStoreId)) {
      return NextResponse.json({ error: 'Store session mismatch.' }, { status: 403 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 1. Verify claim exists
    const { data: claimData, error: fetchError } = await supabaseAdmin
      .from('cashback_claims')
      .select('*')
      .eq('id', claimId)
      .maybeSingle()

    if (fetchError || !claimData) {
      return NextResponse.json({ error: 'Invalid QR Code or Claim not found' }, { status: 400 })
    }

    // 2. Verify store ownership against authenticated merchant session
    if (String(claimData.store_id) !== String(sessionStoreId)) {
      return NextResponse.json({ error: 'Invalid QR Code or does not belong to this store.' }, { status: 400 })
    }

    // 3. Ensure reward is active and has a positive balance
    const currentAmount = Number(claimData.claimable_amount || 0)
    const lastBillAmt = Number(claimData.bill_amount || 0)
    const calculatedNetPaid = Math.max(0, Math.round((lastBillAmt - currentAmount) * 100) / 100)

    if (claimData.status === 'REDEEMED' || currentAmount <= 0) {
      return NextResponse.json({ error: 'This QR code has already been redeemed or has zero balance.' }, { status: 400 })
    }

    // 4. Mark as REDEEMED and reset balance while keeping completed visit count visible until next visit
    const { data, error } = await supabaseAdmin
      .from('cashback_claims')
      .update({
        status: 'REDEEMED',
        claimable_amount: 0,
        cashback_amount: 0,
        visit_count: claimData.visit_count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .select()

    if (error) {
      console.error('Update Error in Redeem Route:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 5. Audit logging in cashback_history + Instant Realtime Broadcast in parallel
    await Promise.allSettled([
      supabaseAdmin
        .from('cashback_history')
        .insert({
          claim_id: claimData.id,
          store_id: claimData.store_id,
          customer_phone: claimData.customer_phone,
          visit_count: claimData.visit_count,
          bill_amount: lastBillAmt,
          cashback_percentage: 0,
          cashback_amount: currentAmount,
          net_paid_amount: calculatedNetPaid,
          transaction_type: 'REDEEMED',
          status: 'REDEEMED',
        }),
      broadcastCustomerUpdate(supabaseAdmin, supabaseUrl, serviceKey, claimData.id, claimData.customer_phone),
    ])

    return NextResponse.json({
      success: true,
      data:
        data && data.length > 0
          ? data[0]
          : { id: claimId, status: 'REDEEMED', claimable_amount: 0, visit_count: claimData.visit_count },
    })
  } catch (err: any) {
    console.error('Redeem Route Catch Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}