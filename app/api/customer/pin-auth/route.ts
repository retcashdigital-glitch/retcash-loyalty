import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionToken,
  verifyCustomerSessionToken,
  getCustomerSessionCookieOptions,
} from '@/lib/customerSession'

export const preferredRegion = 'sin1'

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

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

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Signed Stateless OTP Token (expires in 10 minutes, tamper-proof via HMAC)
function createSignedOtpChallenge(payload: {
  purpose: 'link_email' | 'verify_old_email' | 'reset_pin'
  phone: string
  targetEmail: string
  otp: string
}): string {
  const data = {
    ...payload,
    exp: Date.now() + 10 * 60 * 1000, // 10 mins
  }
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(encoded)
    .digest('hex')
  return `${encoded}.${sig}`
}

function verifySignedOtpChallenge(
  token: string,
  expectedPurpose: string,
  expectedPhone: string,
  submittedOtp: string
): { valid: boolean; targetEmail?: string; error?: string } {
  if (!token || !token.includes('.') || !serviceRoleKey) {
    return { valid: false, error: 'Invalid or missing verification session. Please request a new code.' }
  }
  const [encoded, sig] = token.split('.')
  const expectedSig = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(encoded)
    .digest('hex')

  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: 'Invalid verification token.' }
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (Date.now() > Number(parsed.exp || 0)) {
      return { valid: false, error: 'Verification code has expired. Please request a new one.' }
    }
    if (parsed.purpose !== expectedPurpose || parsed.phone !== expectedPhone) {
      return { valid: false, error: 'Verification session mismatch.' }
    }
    if (String(parsed.otp) !== String(submittedOtp).trim()) {
      return { valid: false, error: 'Incorrect 6-digit verification code.' }
    }
    return { valid: true, targetEmail: String(parsed.targetEmail || '').toLowerCase().trim() }
  } catch {
    return { valid: false, error: 'Corrupted verification session.' }
  }
}

async function sendOtpEmail(toEmail: string, otp: string, title: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Email service is not configured on server.')
  }
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: 'Retcash Security <noreply@retcashapp.com>',
    to: [toEmail],
    subject: `${otp} is your RETCASH Verification Code`,
    html: `
      <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 16px; border: 1px solid #e2e8f0;">
          <h2 style="margin: 0 0 8px; color: #00875A; font-size: 18px;">RETCASH Digital Loyalty</h2>
          <p style="margin: 0 0 18px; color: #334155; font-size: 14px;">${title}</p>
          <div style="background: #ecfdf5; border: 1px dashed #00875A; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 18px;">
            <span style="font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #0f172a;">${otp}</span>
          </div>
          <p style="margin: 0; color: #64748b; font-size: 12px;">This code is valid for 10 minutes. Never share this code with anyone.</p>
        </div>
      </div>
    `,
  })
  if (error) {
    throw new Error(error.message || 'Failed to send verification email.')
  }
}

function attachCustomerSessionCookie(
  res: NextResponse,
  customerId: string,
  normalizedPhone: string
) {
  const token = createCustomerSessionToken({
    customerId,
    phone: normalizedPhone,
  })
  res.cookies.set(CUSTOMER_SESSION_COOKIE, token, getCustomerSessionCookieOptions())
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient()
    const body = await request.json()
    const { action, phone, pin, full_name, email, otp, challengeToken } = body

    // ─── ACTION 0A: VERIFY SIGNED SESSION COOKIE ─────────────────────────────
    if (action === 'session') {
      const cookieStore = await cookies()
      const rawToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value
      const session = verifyCustomerSessionToken(rawToken)

      const requestedPhoneObj = phone ? normalizePhone(phone) : null
      if (!session) {
        return NextResponse.json({ authenticated: false }, { status: 401 })
      }

      if (requestedPhoneObj && session.phone !== requestedPhoneObj.full) {
        return NextResponse.json({ authenticated: false }, { status: 403 })
      }

      return NextResponse.json({
        authenticated: true,
        session: {
          customerId: session.customerId,
          phone: session.phone,
        },
      })
    }

    // ─── ACTION 0B: LOGOUT & CLEAR SESSION COOKIE ───────────────────────────
    if (action === 'logout') {
      const res = NextResponse.json({ success: true })
      res.cookies.set(CUSTOMER_SESSION_COOKIE, '', {
        ...getCustomerSessionCookieOptions(),
        maxAge: 0,
      })
      return res
    }

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
      .select('id, full_name, phone_number, pin_hash, email')
      .or(`phone_number.eq.${phoneObj.full},phone_number.eq.${phoneObj.local}`)

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError)
      return NextResponse.json({ error: 'Database connection error.' }, { status: 500 })
    }

    const rowWithPin = existingRows?.find((r) => Boolean(r.pin_hash))
    const rowWithEmail = existingRows?.find((r) => Boolean(r.email))
    const primaryCustomer = rowWithPin || existingRows?.[0] || null
    const verifiedEmail = rowWithEmail?.email ? String(rowWithEmail.email).trim().toLowerCase() : ''

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

      const res = NextResponse.json({
        success: true,
        customer: {
          id: rowWithPin.id,
          full_name: rowWithPin.full_name || '',
          phone_number: phoneObj.full,
        },
      })

      attachCustomerSessionCookie(res, String(rowWithPin.id), phoneObj.full)
      return res
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
          .select('id, full_name, phone_number, pin_hash, email')
          .single()

        if (insertErr) throw insertErr
        activeCustomer = inserted
      }

      const res = NextResponse.json({
        success: true,
        customer: {
          id: activeCustomer?.id,
          full_name: cleanName || activeCustomer?.full_name || '',
          phone_number: phoneObj.full,
        },
      })

      if (activeCustomer?.id) {
        attachCustomerSessionCookie(res, String(activeCustomer.id), phoneObj.full)
      }
      return res
    }

    // ─── ACTION 3B: LOGGED-IN USER SENDS OTP TO LINK OR CHANGE EMAIL ──────────
    if (action === 'send-email-link-otp') {
      const cookieStore = await cookies()
      const rawToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value
      const session = verifyCustomerSessionToken(rawToken)

      if (!session || session.phone !== phoneObj.full) {
        return NextResponse.json({ error: 'Unauthorized session. Please login again.' }, { status: 401 })
      }

      const mode = String(body?.mode || 'link') // 'link' | 'verify_old'
      const generatedOtp = String(crypto.randomInt(100000, 999999))

      if (mode === 'verify_old') {
        if (!verifiedEmail) {
          return NextResponse.json({ error: 'No existing email found to verify.' }, { status: 400 })
        }
        await sendOtpEmail(
          verifiedEmail,
          generatedOtp,
          'Verify your current email address before changing your RETCASH recovery email:'
        )
        const token = createSignedOtpChallenge({
          purpose: 'verify_old_email',
          phone: phoneObj.full,
          targetEmail: verifiedEmail,
          otp: generatedOtp,
        })
        return NextResponse.json({
          success: true,
          challengeToken: token,
          maskedEmail: maskEmail(verifiedEmail),
        })
      }

      // Linking a new email (only allowed if no email exists OR old email was already verified)
      const cleanNewEmail = String(email || '').trim().toLowerCase()
      if (!isValidEmail(cleanNewEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      }

      if (verifiedEmail) {
        const oldCheck = verifySignedOtpChallenge(
          String(body?.oldEmailVerifiedToken || ''),
          'verify_old_email',
          phoneObj.full,
          String(body?.oldOtp || '')
        )
        if (!oldCheck.valid) {
          return NextResponse.json(
            { error: 'Please verify your existing email address first.' },
            { status: 403 }
          )
        }
      }

      // Ensure email is not already bound to another phone number
      const { data: duplicateEmailRows } = await supabase
        .from('customers')
        .select('id, phone_number')
        .ilike('email', cleanNewEmail)

      const usedByOther = duplicateEmailRows?.some(
        (r) => r.phone_number !== phoneObj.full && r.phone_number !== phoneObj.local
      )
      if (usedByOther) {
        return NextResponse.json(
          { error: 'This email is already linked to another mobile number.' },
          { status: 409 }
        )
      }

      await sendOtpEmail(
        cleanNewEmail,
        generatedOtp,
        'Use this code to link your recovery email to your RETCASH Loyalty Wallet:'
      )

      const token = createSignedOtpChallenge({
        purpose: 'link_email',
        phone: phoneObj.full,
        targetEmail: cleanNewEmail,
        otp: generatedOtp,
      })

      return NextResponse.json({ success: true, challengeToken: token })
    }

    // ─── ACTION 3C: LOGGED-IN USER VERIFIES OTP & SAVES EMAIL ────────────────
    if (action === 'confirm-email-link') {
      const cookieStore = await cookies()
      const rawToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value
      const session = verifyCustomerSessionToken(rawToken)

      if (!session || session.phone !== phoneObj.full) {
        return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
      }

      const check = verifySignedOtpChallenge(
        String(challengeToken || ''),
        'link_email',
        phoneObj.full,
        String(otp || '')
      )

      if (!check.valid || !check.targetEmail) {
        return NextResponse.json({ error: check.error || 'Verification failed.' }, { status: 400 })
      }

      const { error: updateErr } = await supabase
        .from('customers')
        .update({ email: check.targetEmail })
        .or(`phone_number.eq.${phoneObj.full},phone_number.eq.${phoneObj.local}`)

      if (updateErr) throw updateErr

      return NextResponse.json({
        success: true,
        email: check.targetEmail,
      })
    }

    // ─── ACTION 4: SECURE RECOVERY INFO & SEND OTP FOR FORGOT PIN ────────────
    if (action === 'recovery-info') {
      if (!rowWithPin) {
        return NextResponse.json(
          { error: 'No PIN account found for this mobile number.' },
          { status: 404 }
        )
      }

      if (!verifiedEmail) {
        return NextResponse.json({
          hasVerifiedEmail: false,
        })
      }

      const generatedOtp = String(crypto.randomInt(100000, 999999))
      await sendOtpEmail(
        verifiedEmail,
        generatedOtp,
        'Use this verification code to reset your 4-digit RETCASH Wallet PIN:'
      )

      const token = createSignedOtpChallenge({
        purpose: 'reset_pin',
        phone: phoneObj.full,
        targetEmail: verifiedEmail,
        otp: generatedOtp,
      })

      return NextResponse.json({
        hasVerifiedEmail: true,
        maskedEmail: maskEmail(verifiedEmail),
        challengeToken: token,
      })
    }

    // ─── ACTION 5: RESET PIN ONLY VIA VERIFIED EMAIL OTP ─────────────────────
    if (action === 'reset-pin') {
      const cleanPin = String(pin || '').trim()
      if (!/^\d{4}$/.test(cleanPin)) {
        return NextResponse.json({ error: 'New PIN must be exactly 4 digits.' }, { status: 400 })
      }

      if (!rowWithPin || !verifiedEmail) {
        return NextResponse.json(
          { error: 'Recovery email not configured for this account.' },
          { status: 403 }
        )
      }

      const check = verifySignedOtpChallenge(
        String(challengeToken || ''),
        'reset_pin',
        phoneObj.full,
        String(otp || '')
      )

      if (!check.valid || check.targetEmail !== verifiedEmail) {
        return NextResponse.json(
          { error: check.error || 'Invalid or expired verification code.' },
          { status: 401 }
        )
      }

      const newPinHash = hashPin(cleanPin)

      const { error: resetErr } = await supabase
        .from('customers')
        .update({ pin_hash: newPinHash })
        .or(`phone_number.eq.${phoneObj.full},phone_number.eq.${phoneObj.local}`)

      if (resetErr) throw resetErr

      const res = NextResponse.json({
        success: true,
        customer: {
          id: rowWithPin.id,
          full_name: rowWithPin.full_name || '',
          phone_number: phoneObj.full,
        },
      })

      attachCustomerSessionCookie(res, String(rowWithPin.id), phoneObj.full)
      return res
    }

    // ─── ACTION 6: MERCHANT COUNTER PIN RESET (Requires Merchant/Admin Cookie) ─
    if (action === 'merchant-reset-pin') {
      const cookieStore = await cookies()
      const hasMerchantSession = Boolean(cookieStore.get('retcash_merchant_session')?.value)
      const hasAdminSession = Boolean(cookieStore.get('admin_authenticated')?.value)

      if (!hasMerchantSession && !hasAdminSession) {
        return NextResponse.json({ error: 'Unauthorized PIN reset request.' }, { status: 403 })
      }

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