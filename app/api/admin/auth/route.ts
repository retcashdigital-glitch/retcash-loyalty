import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

// பழைய SHA-256 + Salt முறையை அப்படியே பின்பற்றுவதால் ஏற்கனவே உள்ள Admin Password மாறாமல் இயங்கும்
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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body?.action || '')
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
        sameSite: 'lax',
        path: '/',
        maxAge: 86400,
      })
      return response
    }

    if (action === 'login') {
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

      if (data.value !== hashedPassword) {
        return NextResponse.json(
          { error: 'தவறான அட்மின் கடவுச்சொல்!', invalidPassword: true },
          { status: 401 }
        )
      }

      const response = NextResponse.json({ success: true })
      response.cookies.set('admin_authenticated', createSignedAdminCookie(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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