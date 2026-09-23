import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Server-only Secure Client using Service Role Key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanOtp = otp.toString().trim();

        // 1. Check OTP in customer_otps table
        const { data: otpRecords, error: otpError } = await supabaseAdmin
            .from('customer_otps')
            .select('*')
            .ilike('email', cleanEmail)
            .eq('otp', cleanOtp)
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (otpError || !otpRecords || otpRecords.length === 0) {
            return NextResponse.json({ error: 'Invalid or expired OTP code' }, { status: 400 });
        }

        const otpRecord = otpRecords[0];

        // 2. Hash New Password
        const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

        // 3. Securely Update Password in customers table via Service Role
        const { data: updatedUser, error: updateError } = await supabaseAdmin
            .from('customers')
            .update({ password: hashedPassword })
            .ilike('email', cleanEmail)
            .select();

        if (updateError) {
            console.error("Supabase Update Error:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        if (!updatedUser || updatedUser.length === 0) {
            return NextResponse.json({ 
                error: 'Customer account with this email was not found.' 
            }, { status: 404 });
        }

        // 4. Mark OTP as used
        await supabaseAdmin
            .from('customer_otps')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

        return NextResponse.json({ success: true, message: 'Password reset successful' });

    } catch (err: any) {
        console.error("Reset Password API Exception:", err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}