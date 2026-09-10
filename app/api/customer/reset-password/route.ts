import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();

        // 1. Verify OTP in Database
        const { data: otpRecords, error: otpError } = await supabase
            .from('customer_otps')
            .select('*')
            .eq('email', cleanEmail)
            .eq('otp', otp.trim())
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (otpError || !otpRecords || otpRecords.length === 0) {
            return NextResponse.json({ error: 'Invalid or expired OTP code' }, { status: 400 });
        }

        const otpRecord = otpRecords[0];

        // 2. Mark OTP as used
        await supabase
            .from('customer_otps')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

        // 3. Hash New Password with Bcrypt
        const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

        // 4. Update User Password in Database
        const { data: updatedUser, error: updateError } = await supabase
            .from('customers')
            .update({ password: hashedPassword })
            .eq('email', cleanEmail)
            .select();

        if (updateError || !updatedUser || updatedUser.length === 0) {
            return NextResponse.json({ error: 'Failed to update password. User not found.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Password reset successful' });

    } catch (err: any) {
        console.error("Reset Password API Exception:", err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}