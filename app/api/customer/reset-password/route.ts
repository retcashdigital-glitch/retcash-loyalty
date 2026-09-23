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
        const cleanOtp = otp.toString().trim();

        // 1. Verify OTP in Database
        const { data: otpRecords, error: otpError } = await supabase
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

        // 2. Hash New Password with Bcrypt
        const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

        // 3. First Check if User Exists in Database
        const { data: existingUser, error: findError } = await supabase
            .from('customers')
            .select('id, email')
            .ilike('email', cleanEmail)
            .maybeSingle();

        if (findError || !existingUser) {
            return NextResponse.json({ 
                error: 'Customer account with this email was not found.' 
            }, { status: 404 });
        }

        // 4. Update User Password using Exact ID
        const { data: updatedUser, error: updateError } = await supabase
            .from('customers')
            .update({ password: hashedPassword })
            .eq('id', existingUser.id)
            .select();

        if (updateError) {
            console.error("Supabase Update Error:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        if (!updatedUser || updatedUser.length === 0) {
            return NextResponse.json({ 
                error: 'Database permission denied. Check RLS policies on "customers" table.' 
            }, { status: 403 });
        }

        // 5. Mark OTP as used AFTER password update success
        await supabase
            .from('customer_otps')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

        return NextResponse.json({ success: true, message: 'Password reset successful' });

    } catch (err: any) {
        console.error("Reset Password API Exception:", err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}