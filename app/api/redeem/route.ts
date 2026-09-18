import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { claimId } = await request.json()

    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    // எந்த Key விடுபட்டுள்ளது என்று துல்லியமாக அறிய தனித்தனியாகச் சரிபார்க்கிறோம்
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL in Vercel' }, { status: 500 })
    }
    
    if (!serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY in Vercel' }, { status: 500 })
    }

    // Server API-இல் Session warnings வராமல் இருக்க persistSession: false சேர்க்கப்பட்டுள்ளது
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    })

    // Status-ஐ மாற்றுவதுடன் claimable_amount-ஐயும் 0 ஆக மாற்றும் உங்களின் சரியான லாஜிக்
    const { data, error } = await supabaseAdmin
      .from('cashback_claims')
      .update({ 
        status: 'REDEEMED',
        claimable_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', claimId)
      .neq('status', 'REDEEMED')
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