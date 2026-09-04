import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Generate 6-Digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Invalidate old active OTPs for this email
    await supabase
      .from('customer_otps')
      .update({ is_used: true })
      .eq('email', email);

    // 3. Save new OTP to Database
    const { error: dbError } = await supabase
      .from('customer_otps')
      .insert([{ email, otp }]);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save OTP' }, { status: 500 });
    }

    // 4. Send Email via Resend (OTP response-இல் வராது!)
    const { error: mailError } = await resend.emails.send({
      from: 'Retcash <support@retcashapp.com>',
      to: [email],
      subject: 'RETCASH Customer Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #0B0F19; color: #ffffff; border-radius: 10px; max-width: 450px;">
          <h2 style="color: #EA580C; text-align: center;">RETCASH Security Code</h2>
          <p style="text-align: center; color: #A0AEC0;">Use the code below to reset your password:</p>
          <div style="background: #161B26; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 30px; font-weight: bold; letter-spacing: 6px; color: #EA580C;">${otp}</span>
          </div>
          <p style="text-align: center; color: #A0AEC0; font-size: 12px;">This code is valid for 5 minutes only.</p>
        </div>
      `,
    });

    if (mailError) {
      return NextResponse.json({ error: mailError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent to email' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}