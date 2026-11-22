import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

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

function formatMerchantPhone(input: string) {
  const cleaned = String(input || '').replace(/\D/g, '')
  if (!cleaned) return ''

  if (cleaned.startsWith('0')) {
    return '94' + cleaned.slice(1)
  }
  if (!cleaned.startsWith('94') && cleaned.length === 9) {
    return '94' + cleaned
  }
  return cleaned
}

function signPayload(payload: Record<string, unknown>) {
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for signing')
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(encoded)
    .digest('base64url')
  return `${encoded}.${signature}`
}

function verifySignedPayload(token: string) {
  if (!token || !token.includes('.') || !serviceRoleKey) return null
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
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body?.action || 'login')

    if (action === 'logout') {
      const response = NextResponse.json({ success: true })
      response.cookies.set('retcash_merchant_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
      return response
    }

    if (action === 'login') {
      const cleanPhone = formatMerchantPhone(body?.phone || '')
      const password = String(body?.password || '')

      if (!cleanPhone || cleanPhone.length < 9) {
        return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
      }

      const supabase = getAdminClient()
      const { data: store, error } = await supabase
        .from('stores')
        .select('id, store_name, phone_number, password_hash, default_cashback_percent, target_visits, logo_url, location_url, review_url, category, trial_ends_at, subscription_status, plan_type')
        .eq('phone_number', cleanPhone)
        .maybeSingle()

      if (error || !store) {
        return NextResponse.json({ notFound: true, cleanPhone }, { status: 404 })
      }

      const isPasswordValid = await bcrypt.compare(password, store.password_hash)
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid password. Please try again.' }, { status: 401 })
      }

      const safeMerchantSession = {
        id: store.id,
        store_name: store.store_name,
        phone_number: store.phone_number,
        default_cashback_percent: store.default_cashback_percent ?? 5,
        target_visits: store.target_visits ?? 6,
        logo_url: store.logo_url ?? '',
        location_url: store.location_url ?? '',
        review_url: store.review_url ?? '',
        category: store.category ?? 'others',
        trial_ends_at: store.trial_ends_at,
        subscription_status: store.subscription_status ?? 'trialing',
        plan_type: store.plan_type ?? 'monthly',
      }

      const signedSessionToken = signPayload({
        purpose: 'merchant_session',
        storeId: String(store.id),
        exp: Date.now() + 60 * 60 * 24 * 30 * 1000,
      })

      const response = NextResponse.json({ merchant: safeMerchantSession })
      response.cookies.set('retcash_merchant_session', signedSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })

      return response
    }

    if (action === 'register') {
      const storeName = String(body?.store_name || '').trim()
      const formattedPhone = formatMerchantPhone(body?.phone_number || '')
      const email = String(body?.email || '').trim().toLowerCase()
      const password = String(body?.password || '')
      const logoUrl = body?.logo_url ? String(body.logo_url) : null
      const locationUrl = body?.location_url ? String(body.location_url).trim() : null
      const reviewUrl = body?.review_url ? String(body.review_url).trim() : null
      const defaultCashbackPercent = parseFloat(String(body?.default_cashback_percent || '10')) || 10

      if (!formattedPhone || formattedPhone.length < 11) {
        return NextResponse.json(
          { error: 'Please enter a valid mobile number (e.g., 0771234567 or 771234567).' },
          { status: 400 }
        )
      }

      if (!storeName || !email || !password) {
        return NextResponse.json({ error: 'All required fields must be filled.' }, { status: 400 })
      }

      const isMinLength = password.length >= 8
      const hasLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password)
      if (!isMinLength || !hasLetterAndNumber) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters and contain letters & numbers.' },
          { status: 400 }
        )
      }

      const supabase = getAdminClient()

      const { data: existingStore } = await supabase
        .from('stores')
        .select('id')
        .eq('phone_number', formattedPhone)
        .maybeSingle()

      if (existingStore) {
        return NextResponse.json({ alreadyExists: true, formattedPhone }, { status: 409 })
      }

      const baseSlug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')

      const phoneSuffix =
        formattedPhone.length >= 4
          ? formattedPhone.slice(-4)
          : String(Math.floor(1000 + Math.random() * 9000))
      const storeSlug = `${baseSlug}-${phoneSuffix}`

      const hashedPassword = await bcrypt.hash(password, 10)

      const { data, error } = await supabase
        .from('stores')
        .insert([
          {
            store_name: storeName,
            store_slug: storeSlug,
            phone_number: formattedPhone,
            email,
            password_hash: hashedPassword,
            logo_url: logoUrl,
            location_url: locationUrl || null,
            review_url: reviewUrl || null,
            default_cashback_percent: defaultCashbackPercent,
          },
        ])
        .select('id, phone_number')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, formattedPhone, storeId: data?.id })
    }

    if (action === 'forgot_send_otp') {
      const cleanEmail = String(body?.email || '').trim().toLowerCase()
      if (!cleanEmail) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      }

      const supabase = getAdminClient()
      const { data: store, error } = await supabase
        .from('stores')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (error || !store) {
        return NextResponse.json({ error: 'No store found with this email address.' }, { status: 404 })
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = Date.now() + 5 * 60 * 1000

      const sendOtpUrl = new URL('/api/merchant/send-otp', req.url).toString()
      const emailResponse = await fetch(sendOtpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: store.email, otp }),
      })

      const emailResult = await emailResponse.json().catch(() => ({}))
      if (!emailResponse.ok) {
        return NextResponse.json(
          { error: emailResult.error || 'Failed to send email.' },
          { status: 500 }
        )
      }

      const otpToken = signPayload({
        purpose: 'merchant_otp',
        email: store.email,
        otp,
        exp: expiresAt,
      })

      return NextResponse.json({
        email: store.email,
        otpToken,
        expiresAt,
      })
    }

    if (action === 'forgot_verify_otp') {
      const otpInput = String(body?.otp || '').trim()
      const otpToken = String(body?.otpToken || '')

      const payload = verifySignedPayload(otpToken)
      if (!payload || payload.purpose !== 'merchant_otp') {
        return NextResponse.json({ error: 'Invalid OTP session. Please request a new OTP.' }, { status: 400 })
      }

      if (Date.now() > Number(payload.exp || 0)) {
        return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
      }

      if (otpInput !== String(payload.otp)) {
        return NextResponse.json({ error: 'Invalid OTP. Please check and try again.' }, { status: 400 })
      }

      const resetToken = signPayload({
        purpose: 'merchant_reset',
        email: payload.email,
        exp: Date.now() + 10 * 60 * 1000,
      })

      return NextResponse.json({ success: true, resetToken })
    }

    if (action === 'forgot_reset_password') {
      const resetToken = String(body?.resetToken || '')
      const newPassword = String(body?.newPassword || '')

      const payload = verifySignedPayload(resetToken)
      if (!payload || payload.purpose !== 'merchant_reset') {
        return NextResponse.json({ error: 'Reset session expired. Please verify OTP again.' }, { status: 401 })
      }

      if (Date.now() > Number(payload.exp || 0)) {
        return NextResponse.json({ error: 'Reset session expired. Please verify OTP again.' }, { status: 401 })
      }

      const isMinLength = newPassword.length >= 8
      const hasLetterAndNumber = /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword)
      if (!isMinLength || !hasLetterAndNumber) {
        return NextResponse.json(
          { error: 'Please enter a strong password meeting the requirements below.' },
          { status: 400 }
        )
      }

      const supabase = getAdminClient()
      const hashedNewPassword = await bcrypt.hash(newPassword, 10)

      const { error: updateError } = await supabase
        .from('stores')
        .update({ password_hash: hashedNewPassword })
        .eq('email', String(payload.email).trim().toLowerCase())

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err) {
    console.error('Merchant auth API error:', err)
    return NextResponse.json({ error: 'Request failed. Please try again.' }, { status: 500 })
  }
}