import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // frontend-இல் இருந்து claimId மற்றும் storeId இரண்டும் வர வேண்டும்
    const { claimId, storeId } = body 

    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL in Vercel' }, { status: 500 })
    }
    
    if (!serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY in Vercel' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    })

    // 1. முதலில் இந்த Claim ID உள்ளதா மற்றும் இது இந்த கடைக்குரியதா என சரிபார்க்கிறோம்
    const { data: claimData, error: fetchError } = await supabaseAdmin
      .from('cashback_claims')
      .select('*')
      .eq('id', claimId)
      .single()

    if (fetchError || !claimData) {
      return NextResponse.json({ error: 'Invalid QR Code or Claim not found' }, { status: 400 })
    }

    // 2. கடையின் Store ID பொருந்தவில்லையெனில் வீடியோவில் வந்த அதே பிழையைத் தருகிறோம்
    if (storeId && claimData.store_id !== storeId) {
      return NextResponse.json({ error: 'Invalid QR Code or does not belong to this store.' }, { status: 400 })
    }

    // 3. ஏற்கனவே Redeem செய்யப்பட்டிருந்தால்
    if (claimData.status === 'REDEEMED' || claimData.claimable_amount <= 0) {
      return NextResponse.json({ error: 'This QR code has already been redeemed.' }, { status: 400 })
    }

    // 4. நிலையை REDEEMED ஆக மாற்றுகிறோம்
    const { data, error } = await supabaseAdmin
      .from('cashback_claims')
      .update({ 
        status: 'REDEEMED',
        claimable_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', claimId)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}