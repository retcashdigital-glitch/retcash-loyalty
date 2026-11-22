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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token = String(body?.token || '').trim()

    if (!token) {
      return NextResponse.json({ status: 'error' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // 1. Fetch claim details
    const { data: claim, error: fetchErr } = await supabase
      .from('cashback_claims')
      .select('*, customers(*)')
      .eq('claim_token', token)
      .single()

    if (fetchErr || !claim) {
      return NextResponse.json({ status: 'error' }, { status: 404 })
    }

    // 2. Prevent double claiming if already claimed
    if (claim.status === 'CLAIMED') {
      return NextResponse.json({
        status: 'already_claimed',
        amount: Number(claim.claimable_amount || 0),
      })
    }

    // 3. Update status to CLAIMED
    const { error: updateClaimErr } = await supabase
      .from('cashback_claims')
      .update({ status: 'CLAIMED' })
      .eq('id', claim.id)

    if (updateClaimErr) {
      return NextResponse.json({ status: 'error' }, { status: 500 })
    }

    // 4. Reset customer's total cashback to 0 for next cycle
    if (claim.customer_id) {
      await supabase
        .from('customers')
        .update({ total_cashback: 0 })
        .eq('id', claim.customer_id)
    }

    return NextResponse.json({
      status: 'success',
      amount: Number(claim.claimable_amount || 0),
    })
  } catch (err) {
    console.error('Claim token API error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}