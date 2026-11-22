'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Smartphone,
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
import { useCustomerLang } from '@/lib/i18n/useCustomerLang'
import CustomerLangSwitcher from '@/components/CustomerLangSwitcher'

interface StoreBrandInfo {
  id: string
  name: string
  logoUrl: string | null
  cashbackPercent?: number
  targetVisits?: number
}

function formatSriLankaDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('94') && digits.length > 2) {
    const local9 = digits.slice(2, 11)
    if (local9.length <= 2) return local9
    if (local9.length <= 5) return `${local9.slice(0, 2)} ${local9.slice(2)}`
    return `${local9.slice(0, 2)} ${local9.slice(2, 5)} ${local9.slice(5)}`
  }

  if (digits.startsWith('0')) {
    const local10 = digits.slice(0, 10)
    if (local10.length <= 3) return local10
    if (local10.length <= 6) return `${local10.slice(0, 3)} ${local10.slice(3)}`
    return `${local10.slice(0, 3)} ${local10.slice(3, 6)} ${local10.slice(6)}`
  }

  const local9 = digits.slice(0, 9)
  if (local9.length <= 2) return local9
  if (local9.length <= 5) return `${local9.slice(0, 2)} ${local9.slice(2)}`
  return `${local9.slice(0, 2)} ${local9.slice(2, 5)} ${local9.slice(5)}`
}

function formatInternationalSubtitle(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  let local9 = digits
  if (digits.startsWith('94') && digits.length >= 11) {
    local9 = digits.slice(2, 11)
  } else if (digits.startsWith('0') && digits.length >= 10) {
    local9 = digits.slice(1, 10)
  }
  if (local9.length === 9) {
    return `+94 ${local9.slice(0, 2)} ${local9.slice(2, 5)} ${local9.slice(5)}`
  }
  return raw
}

function CustomerPinLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useCustomerLang()

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

  // 1. Fetch scanned store branding safely via Server API
  useEffect(() => {
    if (!storeParam) return

    let isMounted = true
    const loadStoreBranding = async () => {
      try {
        const res = await fetch('/api/customer/card-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'store_info', storeId: storeParam }),
        })
        if (!res.ok) return
        const { store } = await res.json()

        if (isMounted && store) {
          setLogoLoadError(false)
          setStoreInfo(store)
          localStorage.setItem('retcash_last_scanned_store', String(store.id))
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

  // 2. Check active session for instant redirect, OR pre-fill returning user's own saved number
  useEffect(() => {
    let isMounted = true

    const checkSessionAndPrefill = async () => {
      const targetUrl = (phone: string) => {
        if (redirectParam && redirectParam.startsWith('/')) {
          return redirectParam
        }
        if (storeParam) {
          return `/card/${encodeURIComponent(storeParam)}?phone=${encodeURIComponent(phone)}`
        }
        return `/wallet/${phone}`
      }

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

        const localDisplay = savedPhone.startsWith('94') ? savedPhone.slice(2) : savedPhone
        if (isMounted) {
          setPhoneInput(formatSriLankaDisplay(localDisplay))
        }
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
        const localFromUrl = phoneParam.startsWith('94') ? phoneParam.slice(2) : phoneParam
        setPhoneInput(formatSriLankaDisplay(localFromUrl))
      }
    }

    checkSessionAndPrefill()
    return () => {
      isMounted = false
    }
  }, [router, redirectParam, phoneParam, storeParam])

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

    const targetStoreId = storeInfo?.id || storeParam

    setTimeout(() => {
      if (redirectParam && redirectParam.startsWith('/')) {
        router.replace(redirectParam)
      } else if (targetStoreId) {
        router.replace(`/card/${encodeURIComponent(targetStoreId)}?phone=${encodeURIComponent(cleanPhone)}`)
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
      setError(t.invalidPhoneErr)
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
      setError(t.invalidPinErr)
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

      setMessage(t.welcomeRedirectMsg)
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
      setError(t.createPinErr)
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

      setMessage(t.pinCreatedMsg)
      completeSessionAndRedirect(data.customer)
    } catch (err: any) {
      setError(err.message || 'Setup failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleDigitChange = (index: number, rawVal: string) => {
    const digit = rawVal.replace(/\D/g, '').slice(-1)
    const nextDigits = [...pinDigits]
    nextDigits[index] = digit
    setPinDigits(nextDigits)
    setError('')

    if (digit && index < 3) {
      pinInputRefs.current[index + 1]?.focus()
    }

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

  const isPhoneValid = Boolean(normalizePhone(phoneInput))

  return (
    <div className="min-h-screen min-h-dvh w-full bg-white sm:max-w-md sm:mx-auto sm:border-x sm:border-slate-200/80 flex flex-col justify-between">
      <div>
        <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="RETCASH"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="text-base font-black tracking-wide text-slate-900 uppercase block leading-none">
                RETCASH
              </span>
              <span className="text-[11px] font-medium text-slate-500 truncate block mt-0.5">
                {t.loyaltyWallet}
              </span>
            </div>
          </div>

          <CustomerLangSwitcher />
        </header>

        {storeInfo ? (
          <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-[#ECFDF5] via-[#D1FAE5]/60 to-white px-4 py-3.5 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {storeInfo.logoUrl && !logoLoadError ? (
                <img
                  src={storeInfo.logoUrl}
                  alt={storeInfo.name}
                  onError={() => setLogoLoadError(true)}
                  className="h-12 w-12 rounded-xl border border-emerald-200/70 bg-white object-cover shrink-0 shadow-2xs"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00875A] text-white font-black text-lg shrink-0 shadow-xs">
                  {storeInfo.name.charAt(0).toUpperCase() || <Store className="size-5" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#00875A]">
                  {t.officialPartner}
                </p>
                <p className="text-base font-black text-slate-900 truncate">
                  {storeInfo.name}
                </p>
                {storeInfo.cashbackPercent ? (
                  <p className="text-[11px] font-bold text-[#00875A] mt-0.5">
                    {t.earnCashback(storeInfo.cashbackPercent)}
                    {storeInfo.targetVisits ? ` • ${t.visitReward(storeInfo.targetVisits)}` : ''}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          step === 'phone' && (
            <div
              className="mx-5 mt-3 relative overflow-hidden rounded-2xl px-5 py-4.5 shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 55%, #86EFAC 100%)',
              }}
            >
              <div className="relative flex items-center justify-between gap-2">
                <div className="space-y-1.5 max-w-[58%]">
                  <span className="inline-block rounded-full bg-white/95 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-800 shadow-2xs">
                    RETCASH PASS
                  </span>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight uppercase">
                    {t.digitalLoyaltyPass}
                  </h2>
                  <p className="text-xs font-semibold text-slate-700">
                    {t.cashbackWallet}
                  </p>
                </div>

                <div className="shrink-0">
                  <svg
                    width="112"
                    height="74"
                    viewBox="0 0 112 74"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <g transform="rotate(-11 45 34)">
                      <rect x="6" y="12" width="74" height="46" rx="8" fill="#00875A" />
                      <text
                        x="13"
                        y="24"
                        fill="#FFFFFF"
                        fontSize="6.5"
                        fontWeight="800"
                        fontFamily="sans-serif"
                        letterSpacing="0.4"
                      >
                        CASHBACK
                      </text>
                      <rect x="13" y="30" width="11" height="8" rx="2" fill="#FBBF24" />
                      <line x1="13" y1="44" x2="34" y2="44" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" />
                      <line x1="13" y1="49" x2="28" y2="49" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" />
                      <text x="58" y="32" fill="#FFFFFF" fontSize="16" fontWeight="900" fontFamily="sans-serif">
                        %
                      </text>
                    </g>

                    <g transform="translate(38, 36)">
                      <path
                        d="M4 0H62C64.2091 0 66 1.79086 66 4V9C63.7909 9 62 10.7909 62 13C62 15.2091 63.7909 17 66 17V22C66 24.2091 64.2091 26 62 26H4C1.79086 26 0 24.2091 0 22V4C0 1.79086 1.79086 0 4 0Z"
                        fill="url(#goldTicket)"
                      />
                      <line
                        x1="50"
                        y1="3"
                        x2="50"
                        y2="23"
                        stroke="#FFFFFF"
                        strokeOpacity="0.7"
                        strokeWidth="1.4"
                        strokeDasharray="2.5 2.5"
                      />
                    </g>

                    <defs>
                      <linearGradient id="goldTicket" x1="0" y1="0" x2="66" y2="26" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FDE68A" />
                        <stop offset="1" stopColor="#F59E0B" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          )
        )}

        <main className="px-5 pt-6 pb-4">
          {step !== 'phone' && (
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setPinDigits(['', '', '', ''])
                setError('')
              }}
              className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> {t.back}
            </button>
          )}

          <div className="space-y-1.5 mb-5">
            <h1 className="text-[22px] sm:text-2xl font-black tracking-tight text-[#0F172A] leading-snug">
              {step === 'phone'
                ? t.enterMobileTitle
                : step === 'login'
                ? existingName
                  ? t.welcomeBackName(existingName)
                  : t.enterPinTitle
                : t.createPinTitle}
            </h1>
            <p className="text-[13px] sm:text-sm text-slate-500 leading-relaxed">
              {step === 'phone'
                ? t.enterMobileDesc
                : step === 'login'
                ? t.enterPinDesc(formatInternationalSubtitle(phoneInput))
                : t.createPinDesc}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200/80 p-3.5 text-xs font-bold text-red-600">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-xs font-bold text-[#00875A]">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={handleCheckPhone} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                  {t.mobileLabel}
                </label>
                <div className="flex items-center w-full rounded-2xl border-2 border-[#00875A]/45 bg-white px-3.5 py-3.5 shadow-2xs focus-within:border-[#00875A] focus-within:ring-4 focus-within:ring-[#00875A]/10 transition">
                  <div className="flex items-center gap-1.5 pr-3 mr-3 border-r border-slate-200 shrink-0 select-none">
                    <span className="text-base leading-none" role="img" aria-label="Sri Lanka">
                      🇱🇰
                    </span>
                    <span className="text-sm font-extrabold text-slate-800">+94</span>
                  </div>
                  <Smartphone className="size-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(formatSriLankaDisplay(e.target.value))}
                    placeholder="71 234 5678"
                    className="w-full bg-transparent text-base sm:text-lg font-bold tracking-wide text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPhoneValid}
                className={`w-full flex items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-extrabold tracking-wide transition active:scale-[0.99] ${
                  loading || !isPhoneValid
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-[#00875A] text-white shadow-md shadow-emerald-700/15 hover:bg-[#059669] cursor-pointer'
                }`}
              >
                <span>{loading ? t.checkingBtn : t.continueBtn}</span>
                {!loading && <ChevronRight className="size-4" />}
              </button>
            </form>
          )}

          {step === 'login' && (
            <form onSubmit={handlePinLogin} className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    {t.securityPinLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    <span>{showPin ? t.hide : t.show}</span>
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

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setPinDigits(['', '', '', ''])
                    setError('')
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {t.changeNumber}
                </button>
                <Link
                  href={`/customer/forgot-password?phone=${encodeURIComponent(phoneInput)}`}
                  className="text-xs font-extrabold text-[#00875A] hover:underline"
                >
                  {t.forgotPin}
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className={`w-full flex items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-extrabold tracking-wide transition active:scale-[0.99] ${
                  loading || pin.length !== 4
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-[#00875A] text-white shadow-md shadow-emerald-700/15 hover:bg-[#059669] cursor-pointer'
                }`}
              >
                <span>{loading ? t.unlockingBtn : t.openWalletBtn}</span>
                {!loading && <ChevronRight className="size-4" />}
              </button>
            </form>
          )}

          {step === 'setup' && (
            <form onSubmit={handlePinSetup} className="space-y-5">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                  {t.yourNameLabel}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 pl-11 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#00875A] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    {t.createPinLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    <span>{showPin ? t.hide : t.show}</span>
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

              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className={`w-full flex items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-extrabold tracking-wide transition active:scale-[0.99] ${
                  loading || pin.length !== 4
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-[#00875A] text-white shadow-md shadow-emerald-700/15 hover:bg-[#059669] cursor-pointer'
                }`}
              >
                <span>{loading ? t.creatingBtn : t.savePinBtn}</span>
                {!loading && <ChevronRight className="size-4" />}
              </button>
            </form>
          )}
        </main>
      </div>

      <footer className="mt-auto px-5 py-4 bg-slate-50/60 border-t border-slate-100">
        <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 text-center">
          <ShieldCheck className="size-4 text-[#00875A] shrink-0" />
          <span>{t.trustFooter}</span>
        </p>
      </footer>
    </div>
  )
}

export default function CustomerLoginPage() {
  return (
    <div className="min-h-screen min-h-dvh w-full bg-white sm:bg-slate-50 font-sans text-[#0F172A]">
      <Suspense
        fallback={
          <div className="min-h-screen min-h-dvh w-full bg-white sm:max-w-md sm:mx-auto flex items-center justify-center text-xs font-bold text-slate-500">
            Loading wallet...
          </div>
        }
      >
        <CustomerPinLoginContent />
      </Suspense>
    </div>
  )
}