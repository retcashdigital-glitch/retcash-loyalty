import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

export const preferredRegion = 'sin1'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function hashAdminPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + 'RETCASH_ADMIN_SALT_2026')
    .digest('hex')
}

function createSignedAdminCookie(): string {
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  const payload = {
    role: 'admin',
    exp: Date.now() + 86400 * 1000, // 24 hours
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(encoded)
    .digest('hex')
  return `${encoded}.${signature}`
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function sendServerSecurityAlert(attempts: number, req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'Unknown IP'
    const userAgent = req.headers.get('user-agent') || 'Unknown Device'
    const slTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })

    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: 'Retcash Security <onboarding@resend.dev>',
      to: ['retcashdigital@gmail.com'],
      subject: '🚨 Retcash Admin Brute-Force Lockout Alert',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc2626;">அட்மின் பக்கத்தில் பாதுகாப்பு எச்சரிக்கை!</h2>
            <p>தொடர்ந்து ${attempts} முறை தவறான கடவுச்சொல் உள்ளிடப்பட்டதால் அட்மின் உள்நுழைவு 15 நிமிடங்களுக்குப் பூட்டப்பட்டுள்ளது.</p>
            <hr />
            <p><strong>IP முகவரி:</strong> ${escapeHtml(ip)}</p>
            <p><strong>நேரம் (SL):</strong> ${escapeHtml(slTime)}</p>
            <p><strong>சாதனம்:</strong> ${escapeHtml(userAgent)}</p>
          </div>
        </div>
      `,
    })
  } catch (e) {
    console.error('Failed to send server security alert:', e)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body?.action || '')

    if (action === 'logout') {
      const response = NextResponse.json({ success: true })
      response.cookies.set('admin_authenticated', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      })
      return response
    }

    const supabase = getAdminClient()

    if (action === 'check_setup') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_password_hash')
        .single()

      return NextResponse.json({
        isFirstTime: Boolean(error || !data),
      })
    }

    if (action === 'setup') {
      const password = String(body?.password || '')
      const confirmPassword = String(body?.confirmPassword || '')

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்!' },
          { status: 400 }
        )
      }

      if (password !== confirmPassword) {
        return NextResponse.json(
          { error: 'இரண்டு கடவுச்சொற்களும் பொருத்துப் போகவில்லை!' },
          { status: 400 }
        )
      }

      const { data: existing } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_password_hash')
        .maybeSingle()

      if (existing?.value) {
        return NextResponse.json(
          { error: 'அட்மின் கடவுச்சொல் ஏற்கனவே அமைக்கப்பட்டுவிட்டது!' },
          { status: 409 }
        )
      }

      const hashedPassword = hashAdminPassword(password)
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'admin_password_hash', value: hashedPassword })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const response = NextResponse.json({ success: true })
      response.cookies.set('admin_authenticated', createSignedAdminCookie(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400,
      })
      return response
    }

    if (action === 'login') {
      // 1. Check Brute-Force Lockout State
      const { data: guardRow } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_login_guard')
        .maybeSingle()

      let guard = { attempts: 0, lockedUntil: 0 }
      if (guardRow?.value) {
        try {
          guard = JSON.parse(guardRow.value)
        } catch {
          guard = { attempts: 0, lockedUntil: 0 }
        }
      }

      if (guard.lockedUntil && Date.now() < guard.lockedUntil) {
        const minsLeft = Math.ceil((guard.lockedUntil - Date.now()) / 60000)
        return NextResponse.json(
          {
            error: `பாதுகாப்புக் காரணங்களுக்காக அட்மின் பக்கம் பூட்டப்பட்டுள்ளது. ${minsLeft} நிமிடங்களுக்குப் பிறகு முயற்சிக்கவும்.`,
            locked: true,
          },
          { status: 429 }
        )
      }

      const password = String(body?.password || '')
      const hashedPassword = hashAdminPassword(password)

      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_password_hash')
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'பிழை: கடவுச்சொல் தரவுத்தளத்தில் இல்லை!', notConfigured: true },
          { status: 404 }
        )
      }

      const dbHashBuf = Buffer.from(String(data.value || ''))
      const inputHashBuf = Buffer.from(hashedPassword)
      const isMatch =
        dbHashBuf.length === inputHashBuf.length &&
        crypto.timingSafeEqual(dbHashBuf, inputHashBuf)

      if (!isMatch) {
        const nextAttempts = (guard.attempts || 0) + 1
        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          await supabase.from('app_settings').upsert({
            key: 'admin_login_guard',
            value: JSON.stringify({
              attempts: 0,
              lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
            }),
          })
          await sendServerSecurityAlert(nextAttempts, req)
          return NextResponse.json(
            {
              error: '5 முறை தவறான கடவுச்சொல்! பாதுகாப்புக்காக 15 நிமிடங்களுக்குப் பூட்டப்பட்டுள்ளது.',
              locked: true,
            },
            { status: 429 }
          )
        } else {
          await supabase.from('app_settings').upsert({
            key: 'admin_login_guard',
            value: JSON.stringify({ attempts: nextAttempts, lockedUntil: 0 }),
          })
          return NextResponse.json(
            {
              error: `தவறான அட்மின் கடவுச்சொல்! (மீதமுள்ள முயற்சிகள்: ${MAX_FAILED_ATTEMPTS - nextAttempts})`,
              invalidPassword: true,
            },
            { status: 401 }
          )
        }
      }

      // Reset guard on successful login
      if (guard.attempts > 0 || guard.lockedUntil > 0) {
        await supabase.from('app_settings').upsert({
          key: 'admin_login_guard',
          value: JSON.stringify({ attempts: 0, lockedUntil: 0 }),
        })
      }

      const response = NextResponse.json({ success: true })
      response.cookies.set('admin_authenticated', createSignedAdminCookie(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400,
      })
      return response
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: any) {
    console.error('Admin auth API error:', err)
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    )
  }
}