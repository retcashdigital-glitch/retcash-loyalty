'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Phone,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Store,
} from 'lucide-react'

function ForgotPinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<1 | 2>(1)
  const [phoneInput, setPhoneInput] = useState('')
  const [hasStoreVerification, setHasStoreVerification] = useState(false)
  const [storeOptions, setStoreOptions] = useState<{ id: string; store_name: string }[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')

  const [newPin, setNewPin] = useState('')
  const [showNewPin, setShowNewPin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const phoneParam = searchParams.get('phone')
    if (phoneParam) {
      setPhoneInput(phoneParam)
    }
  }, [searchParams])

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

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const cleanPhone = normalizePhone(phoneInput)
    if (!cleanPhone) {
      setError('Please enter a valid mobile number.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/customer/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recovery-info', phone: cleanPhone }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Account not found.')
      }

      setHasStoreVerification(Boolean(data.hasStoreVerification))
      setStoreOptions(data.storeOptions || [])
      setSelectedStoreId('')
      setStep(2)
    } catch (err: any) {
      setError(err.message || 'Could not find account.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const cleanPhone = normalizePhone(phoneInput)
    if (!selectedStoreId) {
      setError('Please select the store you last visited.')
      return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError('New PIN must be exactly 4 digits.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/customer/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-pin',
          phone: cleanPhone,
          pin: newPin,
          store_id: selectedStoreId,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.')
      }

      if (data.customer) {
        const p = data.customer.phone_number
        localStorage.setItem(`retcash_wallet_session_${p}`, 'true')
        localStorage.setItem(`retcash_wallet_auth_${p}`, 'true')
        localStorage.setItem('customer_phone', p)
        localStorage.setItem('retcash_phone', p)
        if (data.customer.full_name) {
          localStorage.setItem(`customer_name_${p}`, data.customer.full_name)
        }
      }

      setMessage('PIN updated! Opening your wallet...')
      setTimeout(() => {
        router.replace(`/wallet/${cleanPhone}`)
      }, 700)
    } catch (err: any) {
      setError(err.message || 'Failed to reset PIN.')
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
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Reset 4-Digit PIN</h2>
        <p className="text-xs text-slate-500">
          {step === 1
            ? 'Enter your mobile number to verify your wallet'
            : 'Quickly verify your recent activity to set a new PIN'}
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

      {step === 1 && (
        <form onSubmit={handleFindAccount} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
              Mobile Number
            </label>
            <div className="flex items-center w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 focus-within:border-[#00875A] focus-within:bg-white transition">
              <Phone className="size-4 text-slate-400 mr-2 shrink-0" />
              <span className="text-slate-500 font-bold text-sm pr-2 border-r border-slate-300">+94</span>
              <input
                type="tel"
                required
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="0771234567"
                className="w-full bg-transparent pl-3 text-sm font-bold text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/customer/login"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 py-3 text-center text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] rounded-xl bg-[#00875A] py-3 text-center text-xs font-extrabold text-white shadow-md hover:bg-[#059669] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </form>
      )}

      {step === 2 && hasStoreVerification && (
        <form onSubmit={handleResetPin} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[#00875A]">
              <Store className="size-3.5" />
              <span>Select the store you last visited</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {storeOptions.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStoreId(st.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    selectedStoreId === st.id
                      ? 'bg-emerald-50 border-[#00875A] text-[#00875A] shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {st.store_name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              New 4-Digit PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-3.5 text-center text-xl font-black tracking-[0.55em] text-slate-900 outline-none focus:border-[#00875A] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none cursor-pointer"
              >
                {showNewPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setError('')
                setMessage('')
              }}
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 py-3 text-center text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !selectedStoreId || newPin.length !== 4}
              className="flex-[2] rounded-xl bg-[#00875A] py-3 text-center text-xs font-extrabold text-white shadow-md hover:bg-[#059669] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Updating...' : 'Save New PIN'}
            </button>
          </div>
        </form>
      )}

      {step === 2 && !hasStoreVerification && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#00875A] flex items-center justify-center mx-auto">
              <Store className="size-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase">Counter Verification Needed</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No store visits were found on this number yet. Please ask the cashier at any RETCASH partner store to reset your PIN on their counter screen.
            </p>
          </div>

          <Link
            href="/customer/login"
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#00875A] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#059669]"
          >
            <ArrowLeft className="size-3.5" /> Back to Login
          </Link>
        </div>
      )}
    </div>
  )
}

export default function CustomerForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-6 font-sans text-[#0F172A]">
      <Suspense fallback={null}>
        <ForgotPinContent />
      </Suspense>
    </div>
  )
}