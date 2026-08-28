import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// URL-ன் இறுதியில் தவறுதலாக சேர்க்கப்படும் '/' குறியை நீக்கும் லாஜிக்
const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, '')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)