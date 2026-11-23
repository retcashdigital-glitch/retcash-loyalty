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
  ChevronRight,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useCustomerLang } from '@/lib/i18n/useCustomerLang'
import CustomerLangSwitcher from '@/components/CustomerLangSwitcher'

function ForgotPinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useCustomerLang()

  const [step, setStep] = useState<1 | 2>(1)
  const [phoneInput, setPhoneInput] = useState('')
  const [hasVerifiedEmail, setHasVerifiedEmail] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [challengeToken, setChallengeToken] = useState('')

  const [otpInput, setOtpInput] = useState('')
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
      setError(t.invalidPhoneErr)
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

      setHasVerifiedEmail(Boolean(data.hasVerifiedEmail))
      setMaskedEmail(data.maskedEmail || '')
      setChallengeToken(data.challengeToken || '')
      setOtpInput('')
      setNewPin('')
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
    if (!/^\d{6}$/.test(otpInput.trim())) {
      setError('Please enter the 6-digit code sent to your email.')
      return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError(t.pin4DigitErr)
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
          otp: otpInput.trim(),
          challengeToken,
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

      setMessage(t.pinUpdatedMsg)
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
    <div className="min-h-dvh w-full bg-white sm:max-w-md sm:mx-auto sm:border-x sm:border-slate-200/80 flex flex-col justify-between">
      <div>
        {/* TOP NATIVE APP BAR WITH LANGUAGE SWITCHER */}
        <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center p-1 shrink-0">
              <Image src="/logo.png" alt="RETCASH" width={24} height={24} className="object-contain" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-black tracking-wider text-[#00875A] uppercase block leading-none">
                RETCASH
              </span>
              <span className="text-[10px] font-semibold text-slate-400 truncate block mt-0.5">
                {t.cashbackWallet}
              </span>
            </div>
          </div>

          <CustomerLangSwitcher />
        </header>

        <main className="px-5 pt-6">
          {step === 1 ? (
            <Link
              href="/customer/login"
              className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
            >
              <ArrowLeft className="size-3.5" /> {t.back}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setError('')
                setMessage('')
              }}
              className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> {t.back}
            </button>
          )}

          <div className="space-y-1.5 mb-6">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {t.resetPinTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {step === 1
                ? t.resetStep1Desc
                : hasVerifiedEmail
                ? `We sent a 6-digit verification code to ${maskedEmail}`
                : t.counterVerifyDesc}
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

          {step === 1 && (
            <form id="forgot-step-1" onSubmit={handleFindAccount} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  {t.mobileLabel}
                </label>
                <div className="flex items-center w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3.5 focus-within:border-[#00875A] focus-within:bg-white transition">
                  <Phone className="size-5 text-slate-400 mr-3 shrink-0" />
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="077 123 4567"
                    className="w-full bg-transparent text-lg font-extrabold tracking-wide text-slate-900 placeholder:text-slate-300 outline-none"
                  />
                </div>
              </div>
            </form>
          )}

          {step === 2 && hasVerifiedEmail && (
            <form id="forgot-step-2" onSubmit={handleResetPin} className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl flex items-center gap-2.5">
                <Mail className="size-4 text-[#00875A] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00875A] block">
                    Verified Recovery Email
                  </span>
                  <span className="text-xs font-bold text-slate-800">{maskedEmail}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  6-Digit Email Code
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 pl-11 pr-4 py-3.5 text-center text-xl font-black tracking-[0.4em] text-slate-900 outline-none focus:border-[#00875A] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    {t.newPinLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    <span>{showNewPin ? t.hide : t.show}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 pl-11 pr-11 py-3.5 text-center text-2xl font-black tracking-[0.55em] text-slate-900 outline-none focus:border-[#00875A] focus:bg-white transition"
                  />
                </div>
              </div>
            </form>
          )}

          {step === 2 && !hasVerifiedEmail && (
            <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl text-center space-y-2.5">
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#00875A] flex items-center justify-center mx-auto">
                <Store className="size-5" />
              </div>
              <h3 className="text-xs font-black text-slate-800 uppercase">{t.counterVerifyTitle}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t.counterVerifyDesc}</p>
            </div>
          )}
        </main>
      </div>

      {/* BOTTOM ACTION FOOTER */}
      <footer className="px-5 pt-6 pb-7 bg-white">
        {step === 1 && (
          <button
            type="submit"
            form="forgot-step-1"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#00875A] py-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:bg-[#059669] transition disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? t.checkingBtn : t.continueBtn}</span>
            {!loading && <ChevronRight className="size-4" />}
          </button>
        )}

        {step === 2 && hasVerifiedEmail && (
          <button
            type="submit"
            form="forgot-step-2"
            disabled={loading || otpInput.length !== 6 || newPin.length !== 4}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#00875A] py-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:bg-[#059669] transition disabled:opacity-40 cursor-pointer"
          >
            <span>{loading ? t.updatingBtn : t.saveNewPinBtn}</span>
            {!loading && <ChevronRight className="size-4" />}
          </button>
        )}

        {step === 2 && !hasVerifiedEmail && (
          <Link
            href="/customer/login"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#00875A] py-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:bg-[#059669]"
          >
            <ArrowLeft className="size-4" />
            <span>{t.backToLogin}</span>
          </Link>
        )}
      </footer>
    </div>
  )
}

export default function CustomerForgotPasswordPage() {
  return (
    <div className="min-h-dvh w-full bg-white sm:bg-slate-50 font-sans text-[#0F172A]">
      <Suspense fallback={null}>
        <ForgotPinContent />
      </Suspense>
    </div>
  )
}