import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const alertRateMap = new Map<string, { count: number; resetAt: number }>()

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const now = Date.now()
    const record = alertRateMap.get(ip)

    if (record && now < record.resetAt) {
      if (record.count >= 2) {
        return NextResponse.json({ error: 'Too many alert requests' }, { status: 429 })
      }
      record.count += 1
    } else {
      alertRateMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 })
    }

    const resend = new Resend(apiKey)
    const { reason, attempts, time, userAgent } = await req.json()

    await resend.emails.send({
      from: 'Retcash Security <onboarding@resend.dev>',
      to: ['retcashdigital@gmail.com'],
      subject: '🚨 Retcash Admin Security Alert',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc2626;">அட்மின் பக்கத்தில் பாதுகாப்பு எச்சரிக்கை!</h2>
            <p>உங்கள் அட்மின் வலைதள பக்கத்தில் பாதுகாப்பற்ற/தவறான முயற்சி கண்டறியப்பட்டுள்ளது.</p>
            <hr />
            <p><strong>காரணம்:</strong> ${escapeHtml(reason)}</p>
            <p><strong>முயற்சிகள் எண்ணிக்கை:</strong> ${escapeHtml(String(attempts || 0))}</p>
            <p><strong>நேரம்:</strong> ${escapeHtml(time)}</p>
            <p><strong>IP முகவரி:</strong> ${escapeHtml(ip)}</p>
            <p><strong>சாதனம் (User Agent):</strong> ${escapeHtml(userAgent)}</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}