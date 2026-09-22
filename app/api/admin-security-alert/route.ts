import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, reason, attempts, time, userAgent } = await req.json();

    await resend.emails.send({
      from: 'Retcash Security <onboarding@resend.dev>',
      to: [to || 'retcashdigital@gmail.com'],
      subject: '🚨 Retcash Admin Security Alert',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc2626;">அட்மின் பக்கத்தில் பாதுகாப்பு எச்சரிக்கை!</h2>
            <p>உங்கள் அட்மின் லாகின் பக்கத்தில் பாதுகாப்பற்ற/தவறான முயற்சி கண்டறியப்பட்டுள்ளது.</p>
            <hr />
            <p><strong>காரணம்:</strong> ${reason}</p>
            <p><strong>முயற்சிகள் எண்ணிக்கை:</strong> ${attempts}</p>
            <p><strong>நேரம்:</strong> ${time}</p>
            <p><strong>சாதனம் (User Agent):</strong> ${userAgent}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}