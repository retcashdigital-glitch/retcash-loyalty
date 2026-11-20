import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

function normalizePhone(input: string) {
  let cleaned = (input || '').replace(/\D/g, '')
  if (cleaned.startsWith('94') && cleaned.length >= 11) {
    cleaned = cleaned.slice(2)
  } else if (cleaned.startsWith('0') && cleaned.length >= 10) {
    cleaned = cleaned.slice(1)
  }
  cleaned = cleaned.slice(0, 9)
  if (cleaned.length !== 9) return null
  return {
    full: `94${cleaned}`,
    local: `0${cleaned}`,
  }
}

function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pin, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

function verifyPin(pin: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false
  const [salt, originalHash] = stored.split(':')
  const hashBuffer = crypto.scryptSync(pin, salt, 32)
  const originalBuffer = Buffer.from(originalHash, 'hex')
  if (hashBuffer.length !== originalBuffer.length) return false
  return crypto.timingSafeEqual(hashBuffer, originalBuffer)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, phone, pin, full_name, store_id } = body

    const phoneObj = normalizePhone(phone)
    if (!phoneObj) {
      return NextResponse.json(
        { error: 'Please enter a valid 9 or 10 digit mobile number.' },
        { status: 400 }
      )
    }

    // Fetch existing customer rows (supports both 94... and 0... formats)
    const { data: existingRows, error: fetchError } = await supabase
      .from('customers')
      .select('id, full_name, phone_number, pin_hash')
      .or(`phone_number.eq.${phoneObj.full},phone_number.eq.${phoneObj.local}`)

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError)
      return NextResponse.json({ error: 'Database connection error.' }, { status: 500 })
    }

    const rowWithPin = existingRows?.find((r) => Boolean(r.pin_hash))
    const primaryCustomer = rowWithPin || existingRows?.[0] || null

    // ─── ACTION 1: CHECK PHONE STATUS ────────────────────────────────────────
    if (action === 'check') {
      return NextResponse.json({
        exists: Boolean(primaryCustomer),
        hasPin: Boolean(rowWithPin),
        fullName: primaryCustomer?.full_name || '',
      })
    }

    // ─── ACTION 2: LOGIN WITH 4-DIGIT PIN ────────────────────────────────────
    if (action === 'login') {
      const cleanPin = String(pin || '').trim()
      if (!/^\d{4}$/.test(cleanPin)) {
        return NextResponse.json({ error: 'Please enter a valid 4-digit PIN.' }, { status: 400 })
      }

      if (!rowWithPin || !rowWithPin.pin_hash) {
        return NextResponse.json(
          { error: 'PIN not set for this number yet.', needsSetup: true },
          { status: 404 }
        )
      }

      const isValid = verifyPin(cleanPin, rowWithPin.pin_hash)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Incorrect 4-digit PIN. Please try again.' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        customer: {
          id: rowWithPin.id,
          full_name: rowWithPin.full_name || '',
          phone_number: phoneObj.full,
        },
      })
    }

    // ─── ACTION 3: FIRST-TIME PIN SETUP (AUTO-REGISTER + AUTO-LOGIN) ─────────
    if (action === 'setup') {
      const cleanPin = String(pin || '').trim()
      if (!/^\d{4}$/.test(cleanPin)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 })
      }

      if (rowWithPin) {
        return NextResponse.json(
          { error: 'PIN is already set for this number. Please enter your PIN to login.' },
          { status: 409 }
        )
      }

      const pinHash = hashPin(cleanPin)
      const cleanName = String(full_name || '').trim()
      let activeCustomer = primaryCustomer

      if (existingRows && existingRows.length > 0) {
        const updatePayload: Record<string, any> = { pin_hash: pinHash }
        if (cleanName) {
          updatePayload.full_name = cleanName
        }

        const { error: updateErr } = await supabase
          .from('customers')
          .update(updatePayload)
          .or(`phone_number.eq.${phoneObj.full},phone_number.eq.${phoneObj.local}`)

        if (updateErr) throw updateErr
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('customers')
          .insert({
            phone_number: phoneObj.full,
            full_name: cleanName || null,
            pin_hash: pinHash,
          })
          .select('id, full_name, phone_number, pin_hash')
          .single()

        if (insertErr) throw insertErr
        activeCustomer = inserted
      }

      return NextResponse.json({
        success: true,
        customer: {
          id: activeCustomer?.id,
          full_name: cleanName || activeCustomer?.full_name || '',
          phone_number: phoneObj.full,
        },
      })
    }

    // ─── ACTION 4: SMART STORE CHECK FOR FORGOT PIN ──────────────────────────
    if (action === 'recovery-info') {
      if (!rowWithPin) {
        return NextResponse.json(
          { error: 'No PIN account found for this mobile number.' },
          { status: 404 }
        )
      }

      const { data: claims } = await supabase
        .from('cashback_claims')
        .select('store_id, updated_at')
        .or(`customer_phone.eq.${phoneObj.full},customer_phone.eq.${phoneObj.local}`)
        .order('updated_at', { ascending: false })
        .limit(1)

      const lastVisitedStoreId = claims?.[0]?.store_id || null

      let storeOptions: { id: string; store_name: string }[] = []
      if (lastVisitedStoreId) {
        const { data: allStores } = await supabase
          .from('stores')
          .select('id, store_name')
          .limit(15)

        const visitedStore = allStores?.find((s) => String(s.id) === String(lastVisitedStoreId))
        const otherStores = (allStores || [])
          .filter((s) => String(s.id) !== String(lastVisitedStoreId))
          .slice(0, 3)

        if (visitedStore) {
          storeOptions = [visitedStore, ...otherStores].sort(() => Math.random() - 0.5)
        }
      }

      return NextResponse.json({
        hasStoreVerification: storeOptions.length >= 2,
        storeOptions,
      })
    }

    // ─── ACTION 5: RESET PIN VIA LAST VISITED STORE ──────────────────────────
    if (action === 'reset-pin') {
      const cleanPin = String(pin || '').trim()
      if (!/^\d{4}$/.test(cleanPin)) {
        return NextResponse.json({ error: 'New PIN must be exactly 4 digits.' }, { status: 400 })
      }

      if (!rowWithPin) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
      }

      if (!store_id) {
        return NextResponse.json(
          { error: 'Please select the store you last visited.' },
          { status: 400 }
        )
      }

      const { data: claims } = await supabase
        .from('cashback_claims')
        .select('store_id')
        .or(`customer_phone.eq.${phoneObj.full},customer_phone.eq.${phoneObj.local}`)
        .order('updated_at', { ascending: false })
        .limit(1)

      const isVerified =
        Boolean(claims?.[0]?.store_id) && String(claims?.[0]?.store_id) === String(store_id)

      if (!isVerified) {
        return NextResponse.json(
          { error: 'Incorrect store selected. Please pick the store where you last earned cashback.' },
          { status: 401 }
        )
      }

      const newPinHash = hashPin(cleanPin)

      const { error: resetErr } = await supabase
        .from('customers')
        .update({ pin_hash: newPinHash })
        .or(`phone_number.eq.${phoneObj.full},phone_number.eq.${phoneObj.local}`)

      if (resetErr) throw resetErr

      return NextResponse.json({
        success: true,
        customer: {
          id: rowWithPin.id,
          full_name: rowWithPin.full_name || '',
          phone_number: phoneObj.full,
        },
      })
    }

    // ─── ACTION 6: MERCHANT COUNTER PIN RESET ────────────────────────────────
    if (action === 'merchant-reset-pin') {
      const { error: clearErr } = await supabase
        .from('customers')
        .update({ pin_hash: null })
        .or(`phone_number.eq.${phoneObj.full},phone_number.eq.${phoneObj.local}`)

      if (clearErr) throw clearErr

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (err: any) {
    console.error('PIN Auth API Error:', err)
    return NextResponse.json(
      { error: err.message || 'Server error occurred.' },
      { status: 500 }
    )
  }
}