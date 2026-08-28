import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bluytsxovbtomulzyuaq.supabase.co'
const supabaseUrl = rawUrl.replace(/\/+$/, '')
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdXl0c3hvdmJ0b211bHp5dWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzg2MDcsImV4cCI6MjEwMjcxNDYwN30.9GHTdQah9SYXrP49S4nZCpqcd0gnwj73xxf19CmBSJc' // இங்கே உங்கள் Legacy eyJ... எனத் தொடங்கும் ANON_KEY-ஐ வைக்கவும்

export const supabase = createClient(supabaseUrl, supabaseAnonKey)