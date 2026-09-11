import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { claimId } = await request.json()

    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 })
    }

    // Service Role Key இல்லை என்றால் உடனடியாக Fail Fast செய்ய வேண்டும்
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // Status-ஐ மாற்றுவதுடன் claimable_amount-ஐயும் 0 ஆக மாற்ற வேண்டும்
    const { data, error } = await supabaseAdmin
      .from('cashback_claims')
      .update({ 
        status: 'REDEEMED',
        claimable_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', claimId)
      .neq('status', 'REDEEMED') // ஏற்கனவே REDEEMED செய்யப்பட்டிருந்தால் மீண்டும் செய்யாது
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Claim not found or already redeemed' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}