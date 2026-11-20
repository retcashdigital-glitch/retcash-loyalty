'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import {
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  User,
  Store,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

interface StoreBrandInfo {
  id: string
  name: string
  logoUrl: string | null
  cashbackPercent?: number
  targetVisits?: number
}

function CustomerPinLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectParam = searchParams.get('redirect') || ''
  const phoneParam = searchParams.get('phone') || ''
  const storeParam = searchParams.get('store') || searchParams.get('storeId') || ''

  const [storeInfo, setStoreInfo] = useState<StoreBrandInfo | null>(null)
  const [logoLoadError, setLogoLoadError] = useState(false)

  const [step, setStep] = useState<'phone' | 'login' | 'setup'>('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [existingName, setExistingName] = useState('')

  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', ''])
  const [showPin, setShowPin] = useState(false)
  const [fullName, setFullName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const autoSubmittedPinRef = useRef<string>('')

  const pin = pinDigits.join('')

  const normalizePhone = (input: string) => {
    let cleaned = input.replace(/\D/g, '')
    if (cleaned.startsWith('94') && cleaned.length >= 11) {
      cleaned = cleaned.slice(2)
    } else if (cleaned.startsWith('0') && cleaned.length >= 10) {
      cleaned = cleaned.slice(1)
    }
    cleaned = cleaned.slice(0, 9)
    return cleaned.length === 9 ? `94${cleaned}` : ''
  }

  // 1. Fetch scanned store branding (Logo, Name & Cashback Rules) if ?store= is present
  useEffect(() => {
    if (!storeParam || !supabase) return

    let isMounted = true
    const loadStoreBranding = async () => {
      try {
        let { data } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeParam)
          .maybeSingle()

        if (!data) {
          const fallback = await supabase
            .from('merchants')
            .select('*')
            .eq('id', storeParam)
            .maybeSingle()
          data = fallback.data
        }

        if (isMounted && data) {
          const resolvedName =
            data.store_name || data.business_name || data.name || 'Partner Store'
          const resolvedLogo =
            data.logo_url || data.store_logo || data.avatar_url || null

          setLogoLoadError(false)
          setStoreInfo({
            id: String(data.id),
            name: resolvedName,
            logoUrl: resolvedLogo,
            cashbackPercent: data.default_cashback_percent,
            targetVisits: data.target_visits,
          })
          localStorage.setItem('retcash_last_scanned_store', String(data.id))
        }
      } catch {
        // Fail silently and keep standard RETCASH login UI
      }
    }

    loadStoreBranding()
    return () => {
      isMounted = false
    }
  }, [storeParam])

  // 2. Check existing session (Server HttpOnly cookie + localStorage) for instant wallet redirect
  useEffect(() => {
    let isMounted = true

    const checkSessionAndPrefill = async () => {
      const targetUrl = (phone: string) =>
        redirectParam && redirectParam.startsWith('/') ? redirectParam : `/wallet/${phone}`

      const savedPhone =
        localStorage.getItem('customer_phone') || localStorage.getItem('retcash_phone') || ''

      if (savedPhone) {
        const hasLocalSession =
          localStorage.getItem(`retcash_wallet_session_${savedPhone}`) === 'true' ||
          localStorage.getItem(`retcash_wallet_auth_${savedPhone}`) === 'true'

        if (hasLocalSession) {
          router.replace(targetUrl(savedPhone))
          return
        }

        const localDisplay = savedPhone.startsWith('94') ? `0${savedPhone.slice(2)}` : savedPhone
        if (isMounted) setPhoneInput(localDisplay)
      }

      try {
        const res = await fetch('/api/customer/pin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'session' }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.authenticated && data?.phone) {
            localStorage.setItem(`retcash_wallet_session_${data.phone}`, 'true')
            localStorage.setItem(`retcash_wallet_auth_${data.phone}`, 'true')
            localStorage.setItem('customer_phone', data.phone)
            localStorage.setItem('retcash_phone', data.phone)
            router.replace(targetUrl(data.phone))
            return
          }
        }
      } catch {
        // Ignore network errors and let user log in normally
      }

      if (phoneParam && isMounted) {
        const localFromUrl = phoneParam.startsWith('94') ? `0${phoneParam.slice(2)}` : phoneParam
        setPhoneInput(localFromUrl)
      }
    }

    checkSessionAndPrefill()
    return () => {
      isMounted = false
    }
  }, [router, redirectParam, phoneParam])

  // Focus first PIN box automatically when entering login/setup step
  useEffect(() => {
    if (step === 'login' || step === 'setup') {
      autoSubmittedPinRef.current = ''
      const timer = setTimeout(() => {
        pinInputRefs.current[0]?.focus()
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [step])

  const completeSessionAndRedirect = (customer: {
    id?: string
    full_name?: string
    phone_number: string
  }) => {
    const cleanPhone = customer.phone_number
    localStorage.setItem(`retcash_wallet_session_${cleanPhone}`, 'true')
    localStorage.setItem(`retcash_wallet_auth_${cleanPhone}`, 'true')
    localStorage.setItem('customer_phone', cleanPhone)
    localStorage.setItem('retcash_phone', cleanPhone)

    if (customer.id) {
      localStorage.setItem('customer_card_id', customer.id)
    }
    if (customer.full_name) {
      localStorage.setItem(`customer_name_${cleanPhone}`, customer.full_name)
    }

    setTimeout(() => {
      if (redirectParam && redirectParam.startsWith('/')) {
        router.replace(redirectParam)
      } else {
        router.replace(`/wallet/${cleanPhone}`)
      }
    }, 450)
  }

  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const cleanPhone = normalizePhone(phoneInput)
    if (!cleanPhone) {
      setError('Please enter a valid mobile number (e.g., 0771234567)')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/customer/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          phone: cleanPhone,
          ...(storeInfo?.id ? { storeId: storeInfo.id } : {}),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Could not verify phone number.')
      }

      setPinDigits(['', '', '', ''])
      if (data.hasPin) {
        setExistingName(data.fullName || '')
        setStep('login')
      } else {
        setFullName(data.fullName || '')
        setStep('setup')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check phone number.')
    } finally {
      setLoading(false)
    }
  }

  const submitPinLogin = async (pinValue: string) => {
    setError('')
    setMessage('')

    const cleanPhone = normalizePhone(phoneInput)
    if (!/^\d{4}$/.test(pinValue)) {
      setError('Please enter your 4-digit PIN.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/customer/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          phone: cleanPhone,
          pin: pinValue,
          ...(storeInfo?.id ? { storeId: storeInfo.id } : {}),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.needsSetup) {
          setStep('setup')
          setPinDigits(['', '', '', ''])
          return
        }
        throw new Error(data.error || 'Incorrect PIN.')
      }

      setMessage('Welcome back! Opening your wallet...')
      completeSessionAndRedirect(data.customer)
    } catch (err: any) {
      setError(err.message || 'Login failed.')
      setPinDigits(['', '', '', ''])
      setTimeout(() => pinInputRefs.current[0]?.focus(), 80)
    } finally {
      setLoading(false)
    }
  }

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitPinLogin(pin)
  }

  const handlePinSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const cleanPhone = normalizePhone(phoneInput)
    if (!/^\d{4}$/.test(pin)) {
      setError('Please create a 4-digit numeric PIN.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/customer/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup',
          phone: cleanPhone,
          pin,
          full_name: fullName.trim(),
          ...(storeInfo?.id ? { storeId: storeInfo.id } : {}),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create PIN.')
      }

      setMessage('PIN created! Opening your wallet...')
      completeSessionAndRedirect(data.customer)
    } catch (err: any) {
      setError(err.message || 'Setup failed.')
    } finally {
      setLoading(false)
    }
  }

  // Handle individual PIN box input
  const handleDigitChange = (index: number, rawVal: string) => {
    const digit = rawVal.replace(/\D/g, '').slice(-1)
    const nextDigits = [...pinDigits]
    nextDigits[index] = digit
    setPinDigits(nextDigits)
    setError('')

    if (digit && index < 3) {
      pinInputRefs.current[index + 1]?.focus()
    }

    // Auto-unlock immediately on 4th digit for returning users
    const combined = nextDigits.join('')
    if (
      step === 'login' &&
      combined.length === 4 &&
      !loading &&
      autoSubmittedPinRef.current !== combined
    ) {
      autoSubmittedPinRef.current = combined
      submitPinLogin(combined)
    }
  }

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      const nextDigits = [...pinDigits]
      nextDigits[index - 1] = ''
      setPinDigits(nextDigits)
      pinInputRefs.current[index - 1]?.focus()
    }
  }

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pasted) return
    const nextDigits = ['', '', '', '']
    pasted.split('').forEach((ch, idx) => {
      nextDigits[idx] = ch
    })
    setPinDigits(nextDigits)
    const focusIdx = Math.min(pasted.length, 3)
    pinInputRefs.current[focusIdx]?.focus()

    if (step === 'login' && pasted.length === 4 && !loading) {
      autoSubmittedPinRef.current = pasted
      submitPinLogin(pasted)
    }
  }

  return (
    <div className="min-h-dvh w-full bg-white sm:max-w-md sm:mx-auto sm:border-x sm:border-slate-200/80 flex flex-col justify-between">
      {/* TOP NATIVE APP BAR */}
      <div>
        <header className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center p-1.5">
              <Image src="/logo.png" alt="RETCASH" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <span className="text-base font-black tracking-wider text-[#00875A] uppercase block leading-none">
                RETCASH
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide">
                Cashback Wallet
              </span>
            </div>
          </div>

          {step !== 'phone' && (
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setPinDigits(['', '', '', ''])
                setError('')
              }}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>
          )}
        </header>

        {/* SCANNED PARTNER STORE CO-BRANDING STRIP */}
        {storeInfo && (
          <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50/90 to-amber-50/50 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {storeInfo.logoUrl && !logoLoadError ? (
                <img
                  src={storeInfo.logoUrl}
                  alt={storeInfo.name}
                  onError={() => setLogoLoadError(true)}
                  className="h-11 w-11 rounded-xl border border-orange-200/70 bg-white object-cover shrink-0 shadow-2xs"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F97316] text-white font-black text-base shrink-0">
                  {storeInfo.name.charAt(0).toUpperCase() || <Store className="size-5" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#F97316]">
                  Official Partner Store
                </p>
                <p className="text-sm font-black text-slate-900 truncate">
                  {storeInfo.name}
                </p>
                {storeInfo.cashbackPercent ? (
                  <p className="text-[11px] font-semibold text-[#00875A] mt-0.5">
                    Earn {storeInfo.cashbackPercent}% Cashback
                    {storeInfo.targetVisits ? ` • Visit #${storeInfo.targetVisits} Reward` : ''}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* MAIN LEFT-ALIGNED CONTENT AREA */}
        <main className="px-5 pt-7">
          <div className="space-y-1.5 mb-6">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {step === 'phone'
                ? 'Enter your mobile number'
                : step === 'login'
                ? existingName
                  ? `Welcome back, ${existingName}`
                  : 'Enter your 4-digit PIN'
                : 'Create your wallet PIN'}
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              {step === 'phone'
                ? 'Access your cashback balance and loyalty rewards instantly.'
                : step === 'login'
                ? `Enter the 4-digit PIN linked to ${phoneInput}`
                : 'Set a quick 4-digit PIN to keep your rewards safe.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200/80 p-3.5 text-xs font-bold text-red-600">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-xs font-bold text-[#00875A]">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* STEP 1: MOBILE NUMBER */}
          {step === 'phone' && (
            <form id="phone-step-form" onSubmit={handleCheckPhone} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Mobile Number
                </label>
                <div className="flex items-center w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3.5 focus-within:border-[#00875A] focus-within:bg-white transition">
                  <Phone className="size-5 text-slate-400 mr-3 shrink-0" />
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    autoFocus
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="077 123 4567"
                    className="w-full bg-transparent text-lg font-extrabold tracking-wide text-slate-900 placeholder:text-slate-300 outline-none"
                  />
                </div>
              </div>
            </form>
          )}

          {/* STEP 2A: ENTER 4-DIGIT PIN (4 INDIVIDUAL BOXES) */}
          {step === 'login' && (
            <form id="login-step-form" onSubmit={handlePinLogin} className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    4-Digit Security PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    <span>{showPin ? 'Hide' : 'Show'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3" onPaste={handleDigitPaste}>
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        pinInputRefs.current[idx] = el
                      }}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      aria-label={`PIN digit ${idx + 1}`}
                      className="h-15 w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 text-center text-2xl font-black text-slate-900 outline-none focus:border-[#00875A] focus:bg-white focus:ring-4 focus:ring-[#00875A]/10 transition"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setPinDigits(['', '', '', ''])
                    setError('')
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Change number
                </button>
                <Link
                  href={`/customer/forgot-password?phone=${encodeURIComponent(phoneInput)}`}
                  className="text-xs font-extrabold text-[#00875A] hover:underline"
                >
                  Forgot PIN?
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2B: FIRST-TIME PIN SETUP */}
          {step === 'setup' && (
            <form id="setup-step-form" onSubmit={handlePinSetup} className="space-y-5">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Your Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kasun Perera"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 pl-11 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#00875A] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Create 4-Digit PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    <span>{showPin ? 'Hide' : 'Show'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3" onPaste={handleDigitPaste}>
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        pinInputRefs.current[idx] = el
                      }}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      aria-label={`New PIN digit ${idx + 1}`}
                      className="h-15 w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 text-center text-2xl font-black text-slate-900 outline-none focus:border-[#00875A] focus:bg-white focus:ring-4 focus:ring-[#00875A]/10 transition"
                    />
                  ))}
                </div>
              </div>
            </form>
          )}
        </main>
      </div>

      {/* BOTTOM-ANCHORED THUMB ACTION FOOTER */}
      <footer className="px-5 pt-6 pb-7 bg-white space-y-3">
        {step === 'phone' && (
          <button
            type="submit"
            form="phone-step-form"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#00875A] py-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:bg-[#059669] active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Checking...' : 'Continue'}</span>
            {!loading && <ChevronRight className="size-4" />}
          </button>
        )}

        {step === 'login' && (
          <button
            type="submit"
            form="login-step-form"
            disabled={loading || pin.length !== 4}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#00875A] py-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:bg-[#059669] active:scale-[0.99] transition disabled:opacity-40 cursor-pointer"
          >
            <span>{loading ? 'Unlocking Wallet...' : 'Open My Wallet'}</span>
            {!loading && <ChevronRight className="size-4" />}
          </button>
        )}

        {step === 'setup' && (
          <button
            type="submit"
            form="setup-step-form"
            disabled={loading || pin.length !== 4}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#00875A] py-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:bg-[#059669] active:scale-[0.99] transition disabled:opacity-40 cursor-pointer"
          >
            <span>{loading ? 'Creating Wallet...' : 'Save PIN & Open Wallet'}</span>
            {!loading && <ChevronRight className="size-4" />}
          </button>
        )}

        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 text-center">
          <ShieldCheck className="size-3.5 text-[#00875A]" />
          <span>No app download needed • Instant cashback</span>
        </p>
      </footer>
    </div>
  )
}

export default function CustomerLoginPage() {
  return (
    <div className="min-h-dvh w-full bg-white sm:bg-slate-50 font-sans text-[#0F172A]">
      <Suspense
        fallback={
          <div className="min-h-dvh w-full bg-white sm:max-w-md sm:mx-auto flex items-center justify-center text-xs font-bold text-slate-500">
            Loading wallet...
          </div>
        }
      >
        <CustomerPinLoginContent />
      </Suspense>
    </div>
  )
}