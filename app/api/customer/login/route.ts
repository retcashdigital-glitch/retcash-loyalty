import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionToken,
  getCustomerSessionCookieOptions,
} from '@/lib/customerSession'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizePhone94(raw?: string | null): string {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('94') && digits.length >= 11) return digits.slice(0, 11)
  if (digits.startsWith('0') && digits.length >= 10) return `94${digits.slice(1, 10)}`
  if (digits.length === 9) return `94${digits}`
  return digits
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getAdminClient()
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()

    // 1. Check if Customer exists
    const { data: customers, error: findError } = await supabaseAdmin
      .from('customers')
      .select('id, email, phone_number, full_name, password')
      .ilike('email', cleanEmail)
      .limit(5)

    if (findError) {
      console.error('Supabase Customer Login Lookup Error:', findError)
      return NextResponse.json(
        { error: 'Database error while verifying account. Please try again.' },
        { status: 500 }
      )
    }

    // 2. If Customer Truly Not Found
    if (!customers || customers.length === 0) {
      return NextResponse.json(
        {
          error: 'Account not found. Redirecting to registration...',
          isNewUser: true,
        },
        { status: 404 }
      )
    }

    // Pick the record that has a password set
    const customer = customers.find((c) => Boolean(c.password)) || customers[0]

    // 3. Verify Password
    if (!customer.password) {
      return NextResponse.json(
        {
          error: 'Password not set for this account. Please register or reset your password.',
        },
        { status: 400 }
      )
    }

    const isMatch = await bcrypt.compare(String(password).trim(), customer.password)

    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 })
    }

    // 4. Success -> Return customer session details and attach signed session cookie
    const res = NextResponse.json({
      success: true,
      message: 'Login successful',
      customer: {
        id: customer.id,
        email: customer.email,
        phone_number: customer.phone_number,
        full_name: customer.full_name,
      },
    })

    const normalizedPhone = normalizePhone94(customer.phone_number)
    if (customer.id && normalizedPhone) {
      const token = createCustomerSessionToken({
        customerId: String(customer.id),
        phone: normalizedPhone,
      })
      res.cookies.set(CUSTOMER_SESSION_COOKIE, token, getCustomerSessionCookieOptions())
    }

    return res
  } catch (err: any) {
    console.error('Login Exception:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}