import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // frontend-இல் இருந்து claimId மற்றும் optional-ஆக storeId வரலாம்
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

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    })

    // 1. முதலில் இந்த Claim ID உள்ளதா என சரிபார்க்கிறோம்
    const { data: claimData, error: fetchError } = await supabaseAdmin
      .from('cashback_claims')
      .select('*')
      .eq('id', claimId)
      .maybeSingle()

    if (fetchError || !claimData) {
      return NextResponse.json({ error: 'Invalid QR Code or Claim not found' }, { status: 400 })
    }

    // 2. கடையின் Store ID அனுப்பப்பட்டிருந்தால் அது பொருந்துகிறதா என சரிபார்க்கிறோம்
    if (storeId && claimData.store_id !== storeId) {
      return NextResponse.json({ error: 'Invalid QR Code or does not belong to this store.' }, { status: 400 })
    }

    // 3. ஏற்கனவே Redeem செய்யப்பட்டிருந்தால் அல்லது இருப்பு 0 ஆக இருந்தால் (Number conversion உடன்)
    const currentAmount = Number(claimData.claimable_amount || 0)
    if (claimData.status === 'REDEEMED' || currentAmount <= 0) {
      return NextResponse.json({ error: 'This QR code has already been redeemed or has zero balance.' }, { status: 400 })
    }

    // 4. நிலையை REDEEMED ஆகவும் இருப்பை 0 ஆகவும் மாற்றுகிறோம்
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
      console.error('Update Error in Redeem Route:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 5. Redemption History-இல் பதிவிடுதல் (Optional Audit Logging)
    try {
      await supabaseAdmin
        .from('cashback_history')
        .insert({
          claim_id: claimData.id,
          store_id: claimData.store_id,
          customer_phone: claimData.customer_phone,
          visit_count: claimData.visit_count,
          bill_amount: 0,
          cashback_percentage: 0,
          cashback_amount: currentAmount,
          transaction_type: 'REDEEMED',
          status: 'REDEEMED'
        })
    } catch (hErr) {
      console.warn('History log inserted with warning:', hErr)
    }

    return NextResponse.json({ 
      success: true, 
      data: data && data.length > 0 ? data[0] : { id: claimId, status: 'REDEEMED', claimable_amount: 0 } 
    })

  } catch (err: any) {
    console.error('Redeem Route Catch Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}