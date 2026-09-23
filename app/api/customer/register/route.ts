import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// RLS-ஐ bypass செய்ய Service Role Key பயன்படுத்துதல்
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { full_name, email, phone_number, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone_number ? phone_number.trim() : '';

        // 1. Check if user already exists
        const { data: existingUser } = await supabaseAdmin
            .from('customers')
            .select('id, email')
            .ilike('email', cleanEmail)
            .maybeSingle();

        if (existingUser) {
            return NextResponse.json({ error: 'Account with this email already exists. Please Login.' }, { status: 400 });
        }

        // 2. Hash Password
        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        // 3. Insert directly into customers table
        const { data: newCustomer, error: insertError } = await supabaseAdmin
            .from('customers')
            .insert([
                {
                    full_name: full_name ? full_name.trim() : 'Customer',
                    email: cleanEmail,
                    phone_number: cleanPhone,
                    password: hashedPassword,
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error("Registration Insert Error:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Registration successful',
            customer: {
                id: newCustomer.id,
                email: newCustomer.email,
                phone_number: newCustomer.phone_number
            }
        });

    } catch (err: any) {
        console.error("Register Exception:", err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
