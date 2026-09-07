// app/api/redeem/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Server-side Service Role Key (இது பிரவுசருக்குத் தெரியாது, Vercel Server-ல் மட்டும் இருக்கும்)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
)

export async function POST(request: Request) {
  const { claimId, customerId } = await request.json()

  // 1. கார்டு மற்றும் கஸ்டமர் பொருந்துகிறார்களா என சர்வரில் சரிபார்
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

  // 2. சர்வர் மூலம் பாதுகாப்பாக REDEEMED என மாற்று
  await supabaseAdmin
    .from('cashback_claims')
    .update({ status: 'REDEEMED' })
    .eq('id', claimId)

  return NextResponse.json({ success: true, message: 'Redeemed successfully' })
}