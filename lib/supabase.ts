import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
// URL-ன் இறுதியில் உள்ள ஸ்லாஷை (/) நீக்குதல்
const supabaseUrl = rawUrl.replace(/\/+$|$/, '')
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)