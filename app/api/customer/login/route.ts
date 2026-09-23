import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();

        // 1. Check if Customer exists
        const { data: customer, error: findError } = await supabaseAdmin
            .from('customers')
            .select('id, email, phone_number, full_name, password')
            .ilike('email', cleanEmail)
            .maybeSingle();

        // 2. If Customer Not Found
        if (findError || !customer) {
            return NextResponse.json({ 
                error: 'Account not found. Redirecting to registration...',
                isNewUser: true 
            }, { status: 404 });
        }

        // 3. Verify Password
        if (!customer.password) {
            return NextResponse.json({ 
                error: 'Password not set for this account. Please reset your password.',
            }, { status: 400 });
        }

        const isMatch = await bcrypt.compare(password.trim(), customer.password);

        if (!isMatch) {
            return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
        }

        // 4. Success -> Return customer session details with full_name
        return NextResponse.json({ 
            success: true, 
            message: 'Login successful',
            customer: {
                id: customer.id,
                email: customer.email,
                phone_number: customer.phone_number,
                full_name: customer.full_name
            }
        });

    } catch (err: any) {
        console.error("Login Exception:", err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}