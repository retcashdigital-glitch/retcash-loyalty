import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

  try {
    const { claimId, customerId } = await request.json()

    const { data: claim, error } = await supabaseAdmin
      .from('cashback_claims')
      .select('*')
      .eq('id', claimId)
      .single()

    if (!claim || error) {
      return NextResponse.json({ error: 'invalid claim' }, { status: 400 })
    }

    if (claim.status === 'REDEEMED') {
      return NextResponse.json({ error: 'already redeemed' }, { status: 400 })
    }

    await supabaseAdmin
      .from('cashback_claims')
      .update({ status: 'REDEEMED' })
      .eq('id', claimId)

    return NextResponse.json({ success: true, message: 'Redeemed successfully' })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}