'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Store, Phone, Lock, ArrowRight, WalletCards, CheckCircle2, AlertCircle } from 'lucide-react'

export default function MerchantAuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [storeName, setStoreName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Check if merchant is already logged in
  useEffect(() => {
    const savedMerchant = localStorage.getItem('retcash_merchant')
    if (savedMerchant) {
      window.location.href = '/merchant/dashboard'
    }
  }, [])

  const formatPhoneNumber = (inputPhone: string) => {
    let cleaned = inputPhone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    if (!cleaned.startsWith('94')) {
      cleaned = '94' + cleaned
    }
    return cleaned
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    const cleanedPhone = formatPhoneNumber(phoneNumber)

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const { data: store, error } = await supabase
          .from('stores')
          .select('id, store_name, phone_number, default_cashback_percent, target_visits, password')
          .eq('phone_number', cleanedPhone)
          .maybeSingle()

        if (error || !store) {
          throw new Error('இந்த போன் நம்பரில் கணக்கு எதுவுமில்லை. தயவுசெய்து பதிவு செய்யவும்.')
        }

        if (store.password !== password) {
          throw new Error('கடவுச்சொல் (Password) தவறானது.')
        }

        // Save session and redirect
        const merchantSession = {
          id: store.id,
          store_name: store.store_name,
          phone_number: store.phone_number,
          default_cashback_percent: store.default_cashback_percent ?? 5,
          target_visits: store.target_visits ?? 6
        }

        localStorage.setItem('retcash_merchant', JSON.stringify(merchantSession))
        window.location.href = '/merchant/dashboard'

      } else {
        // --- REGISTER LOGIC ---
        if (!storeName.trim()) {
          throw new Error('கடைக் பெயரை உள்ளிடவும்.')
        }

        // Check existing store
        const { data: existing } = await supabase
          .from('stores')
          .select('id')
          .eq('phone_number', cleanedPhone)
          .maybeSingle()

        if (existing) {
          throw new Error('இந்த போன் நம்பர் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. Login செய்யவும்.')
        }

        // Insert new store
        const { data: newStore, error: insertError } = await supabase
          .from('stores')
          .insert({
            store_name: storeName.trim(),
            phone_number: cleanedPhone,
            password: password,
            default_cashback_percent: 5,
            target_visits: 6
          })
          .select()
          .single()

        if (insertError) throw insertError

        setSuccessMsg('பதிவு வெற்றிகரமாக முடிந்தது! Dashboard-க்கு மாற்றப்படுகிறீர்கள்...')

        const merchantSession = {
          id: newStore.id,
          store_name: newStore.store_name,
          phone_number: newStore.phone_number,
          default_cashback_percent: 5,
          target_visits: 6
        }

        localStorage.setItem('retcash_merchant', JSON.stringify(merchantSession))
        
        setTimeout(() => {
          window.location.href = '/merchant/dashboard'
        }, 1200)
      }
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'ஏதோ கோளாறு ஏற்பட்டுள்ளது.'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans text-slate-800">
      
      {/* Top Brand Banner */}
      <div className="mb-6 text-center space-y-2">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#00875A] text-white shadow-md mx-auto">
          <WalletCards className="size-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Retcash Merchant Portal</h1>
        <p className="text-xs text-slate-500 font-medium">உங்களின் வாடிக்கையாளர்களை எளிதாக நிர்வகிக்கவும்</p>
      </div>

      {/* Main Form Box */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
        
        {/* Tab Switchers */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); setSuccessMsg('') }}
            className={`py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              isLogin ? 'bg-white text-[#00875A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); setSuccessMsg('') }}
            className={`py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              !isLogin ? 'bg-white text-[#00875A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Register
          </button>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-red-700 animate-in fade-in">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-[#00875A] animate-in fade-in">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Store Name - Register Only */}
          {!isLogin && (
            <label className="grid gap-1.5 text-xs font-bold text-slate-700">
              கடையின் பெயர் (Store Name)
              <div className="relative">
                <Store className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-emerald-100 transition"
                  placeholder="Super Grocery Store"
                  required={!isLogin}
                />
              </div>
            </label>
          )}

          {/* Phone Number */}
          <label className="grid gap-1.5 text-xs font-bold text-slate-700">
            போன் எண் (WhatsApp Phone Number)
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-emerald-100 font-mono transition"
                placeholder="0771234567"
                required
              />
            </div>
          </label>

          {/* Password */}
          <label className="grid gap-1.5 text-xs font-bold text-slate-700">
            கடவுச்சொல் (Password)
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-emerald-100 transition"
                placeholder="••••••••"
                required
              />
            </div>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00875A] hover:bg-[#00704a] text-xs font-bold text-white shadow-md shadow-[#00875A]/20 transition cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {loading ? 'செயல்படுகிறது...' : isLogin ? 'உள்நுழைக (Login)' : 'பதிவு செய்க (Register)'}
            <ArrowRight className="size-4" />
          </button>

        </form>

      </div>

    </div>
  )
}