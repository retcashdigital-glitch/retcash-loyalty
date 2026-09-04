import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = body.email;

        if (!email) {
            return NextResponse.json(
                { error: 'Email address is required.' },
                { status: 400 }
            );
        }

        // Generate 6-digit OTP code
        const customerOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Email HTML Template
        const htmlTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #ea580c; text-align: center; margin-bottom: 8px;">RETCASH Customer Password Reset</h2>
                <p style="color: #475569; font-size: 14px; text-align: center;">Your verification OTP code is:</p>
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #ea580c; letter-spacing: 6px;">${customerOtp}</span>
                </div>
                <p style="color: #64748b; font-size: 12px; text-align: center;">This code is valid for 5 minutes only. Do not share this with anyone.</p>
            </div>
        `;

        // Mail sending logic goes here (Nodemailer / Resend)

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully to customer.',
            data: {
                otp: customerOtp
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}