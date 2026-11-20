'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  User,
  Sparkles,
} from 'lucide-react'

function CustomerPinLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectParam = searchParams.get('redirect') || ''
  const phoneParam = searchParams.get('phone') || ''

  const [step, setStep] = useState<'phone' | 'login' | 'setup'>('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [existingName, setExistingName] = useState('')

  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [fullName, setFullName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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

  useEffect(() => {
    const savedPhone =
      localStorage.getItem('customer_phone') || localStorage.getItem('retcash_phone') || ''
    if (savedPhone) {
      const hasSession =
        localStorage.getItem(`retcash_wallet_session_${savedPhone}`) === 'true' ||
        localStorage.getItem(`retcash_wallet_auth_${savedPhone}`) === 'true'

      if (hasSession) {
        if (redirectParam && redirectParam.startsWith('/')) {
          router.replace(redirectParam)
        } else {
          router.replace(`/wallet/${savedPhone}`)
        }
        return
      }

      const localDisplay = savedPhone.startsWith('94') ? `0${savedPhone.slice(2)}` : savedPhone
      setPhoneInput(localDisplay)
    }

    if (phoneParam) {
      const localFromUrl = phoneParam.startsWith('94') ? `0${phoneParam.slice(2)}` : phoneParam
      setPhoneInput(localFromUrl)
    }
  }, [router, redirectParam, phoneParam])

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
    }, 500)
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
        body: JSON.stringify({ action: 'check', phone: cleanPhone }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Could not verify phone number.')
      }

      setPin('')
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

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const cleanPhone = normalizePhone(phoneInput)
    if (!/^\d{4}$/.test(pin)) {
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
          pin,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.needsSetup) {
          setStep('setup')
          setPin('')
          return
        }
        throw new Error(data.error || 'Incorrect PIN.')
      }

      setMessage('Welcome back! Opening your wallet...')
      completeSessionAndRedirect(data.customer)
    } catch (err: any) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-md mx-auto mb-3 p-2">
          <Image src="/logo.png" alt="RETCASH" width={48} height={48} className="object-contain" />
        </div>
        <h1 className="text-2xl font-black tracking-wider text-[#00875A] uppercase">RETCASH</h1>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          {step === 'phone'
            ? 'Customer Wallet'
            : step === 'login'
            ? existingName
              ? `Welcome Back, ${existingName}`
              : 'Enter 4-Digit PIN'
            : 'Set Your 4-Digit PIN'}
        </h2>
        <p className="text-xs text-slate-500">
          {step === 'phone'
            ? 'Enter your mobile number to access your cashback'
            : step === 'login'
            ? 'Enter your 4-digit PIN to unlock your wallet'
            : 'Create a quick 4-digit PIN to protect your cashback'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-[#00875A]">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* STEP 1: MOBILE NUMBER */}
      {step === 'phone' && (
        <form onSubmit={handleCheckPhone} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
              Mobile Number
            </label>
            <div className="flex items-center w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 focus-within:border-[#00875A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00875A]/20 transition">
              <Phone className="size-4 text-slate-400 mr-2 shrink-0" />
              <span className="text-slate-500 font-bold text-sm pr-2 border-r border-slate-300">+94</span>
              <input
                type="tel"
                inputMode="tel"
                required
                autoFocus
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="0771234567"
                className="w-full bg-transparent pl-3 text-sm font-bold text-slate-900 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#00875A] py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md hover:bg-[#059669] transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      )}

      {/* STEP 2A: ENTER 4-DIGIT PIN */}
      {step === 'login' && (
        <form onSubmit={handlePinLogin} className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl">
            <span className="text-xs font-bold text-slate-700">{phoneInput}</span>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setPin('')
                setError('')
              }}
              className="text-[11px] font-bold text-[#00875A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="size-3" /> Change
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold uppercase text-slate-500">
                4-Digit PIN
              </label>
              <Link
                href={`/customer/forgot-password?phone=${encodeURIComponent(phoneInput)}`}
                className="text-[11px] font-semibold text-[#00875A] hover:underline"
              >
                Forgot PIN?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                required
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-3.5 text-center text-xl font-black tracking-[0.55em] text-slate-900 outline-none focus:border-[#00875A] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none cursor-pointer"
              >
                {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full rounded-xl bg-[#00875A] py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md hover:bg-[#059669] transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Unlocking...' : 'Open My Wallet'}
          </button>
        </form>
      )}

      {/* STEP 2B: FIRST-TIME PIN SETUP -> AUTO-LOGIN */}
      {step === 'setup' && (
        <form onSubmit={handlePinSetup} className="space-y-4">
          <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200 px-3.5 py-2.5 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#00875A]">
              <Sparkles className="size-3.5" />
              <span>{phoneInput}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setPin('')
                setError('')
              }}
              className="text-[11px] font-bold text-slate-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="size-3" /> Change
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Your Name (Optional)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kasun Perera"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#00875A] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Create 4-Digit PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                required
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-3.5 text-center text-xl font-black tracking-[0.55em] text-slate-900 outline-none focus:border-[#00875A] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none cursor-pointer"
              >
                {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full rounded-xl bg-[#00875A] py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md hover:bg-[#059669] transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Setting up...' : 'Save PIN & Open Wallet'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function CustomerLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-6 font-sans text-[#0F172A]">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center text-xs font-bold text-slate-500 shadow-md">
            Loading wallet login...
          </div>
        }
      >
        <CustomerPinLoginContent />
      </Suspense>
    </div>
  )
}