import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // 1. Verify OTP in Database
    const { data: otpRecord, error: otpError } = await supabase
      .from('customer_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP code' }, { status: 400 });
    }

    // 2. Mark OTP as used
    await supabase
      .from('customer_otps')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    // 3. Update User Password in Database
    const { error: updateError } = await supabase
      .from('customers')
      .update({ password: newPassword })
      .eq('email', email);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password reset successful' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}