import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
    }

    const resend = new Resend(apiKey)
    const body = await request.json()
    const cleanEmail = String(body?.email || '').trim().toLowerCase()

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Rate-limit: 45 வினாடிகளுக்குள் மீண்டும் OTP அனுப்புவதைத் தடுத்தல்
    const cooldownIso = new Date(Date.now() - 45 * 1000).toISOString()
    const { data: recentOtp } = await supabase
      .from('customer_otps')
      .select('id')
      .eq('email', cleanEmail)
      .eq('is_used', false)
      .gte('created_at', cooldownIso)
      .limit(1)

    if (recentOtp && recentOtp.length > 0) {
      return NextResponse.json(
        { error: 'Please wait 45 seconds before requesting another OTP.' },
        { status: 429 }
      )
    }

    // 1. Generate 6-Digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // 2. Invalidate old active OTPs for this email
    await supabase
      .from('customer_otps')
      .update({ is_used: true })
      .eq('email', cleanEmail)

    // 3. Save new OTP to Database
    const { error: dbError } = await supabase
      .from('customer_otps')
      .insert([{ email: cleanEmail, otp }])

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save OTP' }, { status: 500 })
    }

    // 4. Send Email via Resend with RETCASH Emerald Green Branding & Logo
    const { error: mailError } = await resend.emails.send({
      from: 'Retcash <support@retcashapp.com>',
      to: [cleanEmail],
      subject: 'RETCASH Customer Password Reset Code',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; background-color: #f8fafc; border-radius: 16px; max-width: 450px; margin: 0 auto; border: 1px solid #e2e8f0;">
          
          <!-- RETCASH Logo & Title Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #00875A, #059669); padding: 12px; border-radius: 14px; margin-bottom: 8px;">
              <img src="https://retcashapp.com/logo.png" alt="RETCASH Logo" style="width: 32px; height: 32px; display: block;" />
            </div>
            <h1 style="color: #00875A; font-size: 18px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase;">RETCASH</h1>
          </div>

          <!-- Email Content Body -->
          <div style="background-color: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #f1f5f9; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <h2 style="color: #1e293b; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Password Reset Verification</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0;">Use the 6-digit verification code below to reset your account password:</p>
            
            <!-- OTP Display Box in Emerald Green Tone -->
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; text-align: center; border-radius: 12px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #00875A; font-family: monospace;">${otp}</span>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">This code is valid for <strong>5 minutes</strong> only. Do not share this code with anyone.</p>
          </div>

          <!-- Email Footer -->
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #94a3b8; font-size: 11px; margin: 0;">©️ ${new Date().getFullYear()} RETCASH. All rights reserved.</p>
          </div>

        </div>
      `,
    })

    if (mailError) {
      return NextResponse.json({ error: mailError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'OTP sent to email' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}