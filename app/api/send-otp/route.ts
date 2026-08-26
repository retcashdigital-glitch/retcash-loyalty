import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
    try {
        const { email, otp } = await request.json()

        const { data, error } = await resend.emails.send({
            from: 'Retcash <support@retcashapp.com>',
            to: [email],
            subject: 'RETCASH MERCHANT OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; background: #0B0E14; color: #ffffff; border-radius: 12px; max-width: 400px; margin: auto;">
                    <h2 style="color: #FF6B00; margin-bottom: 10px;">Retcash Password Reset</h2>
                    <p style="color: #A0AEC0; font-size: 14px;">Your 6-digit verification OTP code is:</p>
                    <div style="background: #161B26; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #2D3748;">
                        <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #FF6B00;">${otp}</span>
                    </div>
                    <p style="color: #A0AEC0; font-size: 12px;">This code is valid for 5 minutes only. Do not share this with anyone.</p>
                </div>
            `,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, data })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}