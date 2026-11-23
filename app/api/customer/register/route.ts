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

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getAdminClient()
    const { full_name, email, phone_number, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const rawDigits = phone_number ? String(phone_number).replace(/\D/g, '') : ''

    let cleanPhone = rawDigits
    if (cleanPhone.startsWith('0') && cleanPhone.length >= 10) {
      cleanPhone = `94${cleanPhone.slice(1)}`
    } else if (!cleanPhone.startsWith('94') && cleanPhone.length === 9) {
      cleanPhone = `94${cleanPhone}`
    }

    const phoneWithZero = cleanPhone.startsWith('94') ? `0${cleanPhone.slice(2)}` : cleanPhone

    // 1. Check existing records by Email OR Phone (in both 94... and 0... formats)
    const conditions = [`email.ilike.${cleanEmail}`]
    if (cleanPhone) {
      conditions.push(`phone_number.eq.${cleanPhone}`)
      conditions.push(`phone_number.eq.${phoneWithZero}`)
    }

    const { data: existingUsers, error: searchError } = await supabaseAdmin
      .from('customers')
      .select('id, email, phone_number, password, full_name')
      .or(conditions.join(','))
      .limit(5)

    if (searchError) {
      console.error('Supabase Customer Lookup Error:', searchError)
      return NextResponse.json({ error: 'Database lookup failed. Please try again.' }, { status: 500 })
    }

    const hashedPassword = await bcrypt.hash(String(password).trim(), 10)

    if (existingUsers && existingUsers.length > 0) {
      const registeredWithEmail = existingUsers.find(
        (u) => u.email && u.email.toLowerCase() === cleanEmail && u.password
      )
      if (registeredWithEmail) {
        return NextResponse.json(
          { error: 'Account with this email already exists. Please Login.' },
          { status: 400 }
        )
      }

      const registeredWithPhone = existingUsers.find(
        (u) => (u.phone_number === cleanPhone || u.phone_number === phoneWithZero) && u.password
      )
      if (registeredWithPhone) {
        return NextResponse.json(
          { error: 'Account with this phone number already exists. Please Login.' },
          { status: 400 }
        )
      }

      // Claim pre-created POS customer record so store visits & cashback remain intact
      const posCustomer = existingUsers[0]
      const { data: updatedCustomer, error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          full_name: full_name ? String(full_name).trim() : posCustomer.full_name || 'Customer',
          email: cleanEmail,
          phone_number: cleanPhone || posCustomer.phone_number,
          password: hashedPassword,
        })
        .eq('id', posCustomer.id)
        .select()
        .single()

      if (updateError) {
        console.error('Supabase Customer Claim Update Error:', updateError)
        return NextResponse.json(
          { error: `Registration Failed: ${updateError.message}` },
          { status: 500 }
        )
      }

      const res = NextResponse.json({
        success: true,
        message: 'Registration successful',
        customer: {
          id: updatedCustomer.id,
          email: updatedCustomer.email,
          phone_number: updatedCustomer.phone_number,
          full_name: updatedCustomer.full_name,
        },
      })

      if (updatedCustomer.id && updatedCustomer.phone_number) {
        const token = createCustomerSessionToken({
          customerId: String(updatedCustomer.id),
          phone: String(updatedCustomer.phone_number),
        })
        res.cookies.set(CUSTOMER_SESSION_COOKIE, token, getCustomerSessionCookieOptions())
      }

      return res
    }

    // 2. Create a new row for a brand new customer in Supabase
    const { data: newCustomer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert([
        {
          full_name: full_name ? String(full_name).trim() : 'Customer',
          email: cleanEmail,
          phone_number: cleanPhone,
          password: hashedPassword,
          visit_count: 0,
          total_cashback: 0,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Supabase Customer Registration Insert Error:', insertError)
      return NextResponse.json(
        { error: `Registration Failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    const res = NextResponse.json({
      success: true,
      message: 'Registration successful',
      customer: {
        id: newCustomer.id,
        email: newCustomer.email,
        phone_number: newCustomer.phone_number,
        full_name: newCustomer.full_name,
      },
    })

    if (newCustomer.id && newCustomer.phone_number) {
      const token = createCustomerSessionToken({
        customerId: String(newCustomer.id),
        phone: String(newCustomer.phone_number),
      })
      res.cookies.set(CUSTOMER_SESSION_COOKIE, token, getCustomerSessionCookieOptions())
    }

    return res
  } catch (err: any) {
    console.error('Register Exception:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}