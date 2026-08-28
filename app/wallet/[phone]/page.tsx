'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CustomerHomeWalletPage({ params }: { params: Promise<{ phone: string }> }) {
    const resolvedParams = use(params)
    const phone = resolvedParams?.phone

    const router = useRouter()
    const cleanPhone = phone?.replace(/\D/g, '') || ''

    const [claims, setClaims] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Auth States
    const [isAuthed, setIsAuthed] = useState(false)
    const [passwordInput, setPasswordInput] = useState('')
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState('')

    // Profile setup state (Only if customer has never set a password/email before)
    const [isSettingNewPassword, setIsSettingNewPassword] = useState(false)
    const [customerEmailInput, setCustomerEmailInput] = useState('')

    // Forgot Password & Security States
    const [forgotStep, setForgotStep] = useState<'login' | 'enter_email' | 'enter_otp' | 'new_password'>('login')
    const [forgotEmailInput, setForgotEmailInput] = useState('')
    const [generatedOtp, setGeneratedOtp] = useState('')
    const [otpExpiry, setOtpExpiry] = useState<number>(0)
    const [otpInput, setOtpInput] = useState('')
    const [newPasswordInput, setNewPasswordInput] = useState('')

    // Brute-force & Lockout States
    const [loginAttempts, setLoginAttempts] = useState(0)
    const [lockoutUntil, setLockoutUntil] = useState<number>(0)
    const [lockoutTimerText, setLockoutTimerText] = useState('')

    useEffect(() => {
        if (cleanPhone) {
            checkLocalSessionAndCustomer()
            checkLockoutStatus()
        }
    }, [cleanPhone])

    const checkLockoutStatus = () => {
        const storedLockout = localStorage.getItem(`retcash_lockout_${cleanPhone}`)
        if (storedLockout) {
            const lockoutTime = parseInt(storedLockout, 10)
            if (Date.now() < lockoutTime) {
                setLockoutUntil(lockoutTime)
            } else {
                localStorage.removeItem(`retcash_lockout_${cleanPhone}`)
                localStorage.removeItem(`retcash_attempts_${cleanPhone}`)
            }
        }
    }

    useEffect(() => {
        if (lockoutUntil > 0) {
            const interval = setInterval(() => {
                const remaining = lockoutUntil - Date.now()
                if (remaining <= 0) {
                    setLockoutUntil(0)
                    setLoginAttempts(0)
                    localStorage.removeItem(`retcash_lockout_${cleanPhone}`)
                    localStorage.removeItem(`retcash_attempts_${cleanPhone}`)
                    clearInterval(interval)
                } else {
                    const minutes = Math.floor(remaining / 60000)
                    const seconds = Math.floor((remaining % 60000) / 1000)
                    setLockoutTimerText(`${minutes}m ${seconds}s`)
                }
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [lockoutUntil, cleanPhone])

    const checkLocalSessionAndCustomer = async () => {
        try {
            const savedAuth = localStorage.getItem(`retcash_wallet_auth_${cleanPhone}`)

            const { data, error } = await supabase
                .from('customers')
                .select('password, email')
                .eq('phone_number', cleanPhone)
                .limit(1)

            if (error || !data || data.length === 0) {
                const { error: insertErr } = await supabase
                    .from('customers')
                    .insert([{ phone_number: cleanPhone, email: '' }])

                if (!insertErr) {
                    setIsSettingNewPassword(true)
                    setLoading(false)
                    return
                }
            }

            const customerRecord = data[0]

            // Check if password or email is completely missing (First time user setup)
            if (!customerRecord.password || !customerRecord.email || customerRecord.email.trim() === '') {
                setIsSettingNewPassword(true)
                setLoading(false)
                return
            }

            if (savedAuth === 'true') {
                setIsAuthed(true)
                fetchCustomerClaims()
            } else {
                setLoading(false)
            }
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    const handleAuthentication = async (e: React.FormEvent) => {
        e.preventDefault()
        if (lockoutUntil > 0) return

        if (!passwordInput.trim()) {
            setAuthError('Please enter a password')
            return
        }

        try {
            setAuthLoading(true)
            setAuthError('')
            const securePassword = btoa(passwordInput.trim())

            const { data, error } = await supabase
                .from('customers')
                .select('id, password, email')
                .eq('phone_number', cleanPhone)

            if (error) throw error

            if (data && data.length > 0) {
                const customerRecord = data[0]

                // If setting up for the first time
                if (isSettingNewPassword) {
                    if (!customerEmailInput.trim()) {
                        setAuthError('Please enter your email address to proceed')
                        setAuthLoading(false)
                        return
                    }

                    const emailToSave = customerEmailInput.trim().toLowerCase()

                    const { error: updateError } = await supabase
                        .from('customers')
                        .update({
                            password: securePassword,
                            email: emailToSave
                        })
                        .eq('phone_number', cleanPhone)

                    if (updateError) throw updateError

                    localStorage.setItem(`retcash_wallet_auth_${cleanPhone}`, 'true')
                    setIsAuthed(true)
                    fetchCustomerClaims()
                } else {
                    // Normal Login Verification
                    if (customerRecord.password === securePassword) {
                        localStorage.removeItem(`retcash_attempts_${cleanPhone}`)
                        localStorage.setItem(`retcash_wallet_auth_${cleanPhone}`, 'true')
                        setIsAuthed(true)
                        fetchCustomerClaims()
                    } else {
                        handleFailedAttempt()
                    }
                }
            } else {
                setAuthError('Customer account not found.')
                setAuthLoading(false)
            }
        } catch (err: any) {
            console.error(err)
            setAuthError('An error occurred. Please try again.')
            setAuthLoading(false)
        }
    }

    const handleFailedAttempt = () => {
        const currentAttempts = loginAttempts + 1
        setLoginAttempts(currentAttempts)
        localStorage.setItem(`retcash_attempts_${cleanPhone}`, currentAttempts.toString())

        if (currentAttempts >= 3) {
            const lockoutTime = Date.now() + 5 * 60 * 1000
            setLockoutUntil(lockoutTime)
            localStorage.setItem(`retcash_lockout_${cleanPhone}`, lockoutTime.toString())
            setAuthError('Too many incorrect attempts. Account locked for 5 minutes.')
        } else {
            setAuthError(`Incorrect password. ${3 - currentAttempts} attempts remaining.`)
        }
        setAuthLoading(false)
    }

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!forgotEmailInput.trim()) {
            setAuthError('Please enter your registered email')
            return
        }

        try {
            setAuthLoading(true)
            setAuthError('')

            const cleanEmail = forgotEmailInput.trim().toLowerCase()

            const { data, error } = await supabase
                .from('customers')
                .select('email')
                .eq('phone_number', cleanPhone)
                .single()

            if (error || !data || data.email?.toLowerCase() !== cleanEmail) {
                setAuthError('Email does not match our records for this phone number.')
                setAuthLoading(false)
                return
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString()
            const expiryTime = Date.now() + 5 * 60 * 1000

            setGeneratedOtp(otp)
            setOtpExpiry(expiryTime)

            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail, otp }),
            })

            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.error || 'Failed to send OTP email.')
            }

            setAuthLoading(false)
            setForgotStep('enter_otp')
        } catch (err: any) {
            console.error(err)
            setAuthError(err.message || 'Failed to send OTP. Try again.')
            setAuthLoading(false)
        }
    }

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault()

        if (Date.now() > otpExpiry) {
            setAuthError('OTP has expired. Please request a new one.')
            return
        }

        if (otpInput.trim() === generatedOtp) {
            setAuthError('')
            setForgotStep('new_password')
        } else {
            setAuthError('Invalid OTP. Please check and try again.')
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPasswordInput.trim()) {
            setAuthError('Please enter a new password')
            return
        }

        try {
            setAuthLoading(true)
            setAuthError('')
            const securePassword = btoa(newPasswordInput.trim())

            const { error } = await supabase
                .from('customers')
                .update({ password: securePassword })
                .eq('phone_number', cleanPhone)

            if (error) throw error

            alert('Password reset successfully! Please login with your new password.')
            setForgotStep('login')
            setPasswordInput('')
            setForgotEmailInput('')
            setNewPasswordInput('')
            setAuthLoading(false)
        } catch (err) {
            console.error(err)
            setAuthError('Failed to update password.')
            setAuthLoading(false)
        }
    }

    const fetchCustomerClaims = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('cashback_claims')
                .select(`
                    id,
                    claimable_amount,
                    visit_count,
                    created_at,
                    stores (
                        id,
                        store_name,
                        store_slug,
                        logo_url
                    )
                `)
                .eq('customer_phone', cleanPhone)
                .order('created_at', { ascending: false })

            if (!error && data) {
                const uniqueStoresMap = new Map()
                data.forEach((item) => {
                    if (item.stores && !uniqueStoresMap.has(item.stores.id)) {
                        uniqueStoresMap.set(item.stores.id, item)
                    }
                })
                setClaims(Array.from(uniqueStoresMap.values()))
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (loading && !isAuthed) {
        return (
            <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]"></div>
            </div>
        )
    }

    if (!isAuthed) {
        return (
            <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-[#FF6B00]">
                <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="text-center space-y-2">
                        <h1 className="text-xl font-black text-[#FF6B00] tracking-wider">RETCASH</h1>
                        <h2 className="text-sm font-bold text-white">
                            {forgotStep === 'login' && (isSettingNewPassword ? 'Complete Your Profile (Email Required)' : 'Wallet Security Verification')}
                            {forgotStep === 'enter_email' && 'Reset Password via Email'}
                            {forgotStep === 'enter_otp' && 'Enter Verification OTP'}
                            {forgotStep === 'new_password' && 'Create New Password'}
                        </h2>
                    </div>

                    {lockoutUntil > 0 ? (
                        <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-4 text-center space-y-2">
                            <p className="text-xs font-bold text-red-400 uppercase">Too Many Failed Attempts</p>
                            <div className="text-base font-mono font-black text-white bg-red-900/40 py-2 rounded-xl">
                                ⏳ {lockoutTimerText}
                            </div>
                        </div>
                    ) : (
                        <>
                            {forgotStep === 'login' && (
                                <form onSubmit={handleAuthentication} className="space-y-4" autoComplete="off">
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Customer Account</label>
                                        <div className="bg-[#0B0E14] border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-300 font-bold">
                                            📱 +{cleanPhone}
                                        </div>
                                    </div>

                                    {/* Only show email input if customer is setting up for the first time */}
                                    {isSettingNewPassword && (
                                        <div>
                                            <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Email Address (Mandatory)</label>
                                            <input
                                                type="email"
                                                value={customerEmailInput}
                                                onChange={(e) => setCustomerEmailInput(e.target.value)}
                                                placeholder="Enter your email address"
                                                className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none transition"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">
                                            {isSettingNewPassword ? 'Create Password' : 'Password'}
                                        </label>
                                        <input
                                            type="password"
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none transition"
                                            required
                                        />
                                    </div>

                                    {!isSettingNewPassword && (
                                        <div className="text-right">
                                            <button
                                                type="button"
                                                onClick={() => { setForgotStep('enter_email'); setAuthError(''); }}
                                                className="text-[11px] text-[#FF6B00] hover:underline font-medium"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>
                                    )}

                                    {authError && <p className="text-[11px] text-red-500 font-medium text-center">{authError}</p>}

                                    <button
                                        type="submit"
                                        disabled={authLoading}
                                        className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-2.5 rounded-xl text-sm transition shadow-lg active:scale-95 flex items-center justify-center"
                                    >
                                        {authLoading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : (isSettingNewPassword ? 'Save & Access Wallet' : 'Login to Wallet')}
                                    </button>
                                </form>
                            )}

                            {forgotStep === 'enter_email' && (
                                <form onSubmit={handleSendOtp} className="space-y-4" autoComplete="off">
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Registered Email</label>
                                        <input
                                            type="email"
                                            value={forgotEmailInput}
                                            onChange={(e) => setForgotEmailInput(e.target.value)}
                                            placeholder="name@example.com"
                                            autoComplete="off"
                                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none transition"
                                            required
                                        />
                                    </div>

                                    {authError && <p className="text-[11px] text-red-500 font-medium text-center">{authError}</p>}

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setForgotStep('login'); setAuthError(''); setForgotEmailInput(''); }}
                                            className="w-1/2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 rounded-xl text-sm transition"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={authLoading}
                                            className="w-1/2 bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center"
                                        >
                                            {authLoading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'Send OTP'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {forgotStep === 'enter_otp' && (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Enter 6-Digit OTP</label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={otpInput}
                                            onChange={(e) => setOtpInput(e.target.value)}
                                            placeholder="123456"
                                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-center text-lg tracking-widest text-white outline-none transition font-mono"
                                            required
                                        />
                                    </div>

                                    {authError && <p className="text-[11px] text-red-500 font-medium text-center">{authError}</p>}

                                    <button
                                        type="submit"
                                        className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-2.5 rounded-xl text-sm transition"
                                    >
                                        Verify OTP
                                    </button>
                                </form>
                            )}

                            {forgotStep === 'new_password' && (
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">New Password</label>
                                        <input
                                            type="password"
                                            value={newPasswordInput}
                                            onChange={(e) => setNewPasswordInput(e.target.value)}
                                            placeholder="Enter new password"
                                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none transition"
                                            required
                                        />
                                    </div>

                                    {authError && <p className="text-[11px] text-red-500 font-medium text-center">{authError}</p>}

                                    <button
                                        type="submit"
                                        disabled={authLoading}
                                        className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center"
                                    >
                                        {authLoading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'Update Password'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-start p-4 pt-6 font-sans selection:bg-[#FF6B00]">
            <div className="w-full max-w-sm space-y-4">
                {/* Header Profile Section */}
                <div className="bg-[#161B26] border border-gray-800 rounded-2xl p-4 flex justify-between items-center shadow-md">
                    <div>
                        <span className="text-[10px] text-gray-400 font-semibold block uppercase">CUSTOMER ACCOUNT</span>
                        <span className="text-sm font-bold text-white">📱 +{cleanPhone}</span>
                    </div>
                    <span className="text-[10px] bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 px-2.5 py-1 rounded-lg font-bold">
                        {claims.length} {claims.length === 1 ? 'Store Card' : 'Store Cards'}
                    </span>
                </div>

                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">
                    Your Purchased Stores & Balances
                </h2>

                {/* 1. Loading Skeleton Animation */}
                {loading ? (
                    <div className="space-y-3.5">
                        <div className="animate-pulse bg-[#161B26] border border-gray-800/80 rounded-2xl p-4 flex items-start justify-between h-20">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-gray-800/60 shrink-0"></div>
                                <div className="space-y-2 pt-1">
                                    <div className="h-4 bg-gray-800/60 rounded w-28"></div>
                                    <div className="h-3 bg-gray-800/60 rounded w-20"></div>
                                </div>
                            </div>
                            <div className="space-y-2 pt-1 text-right">
                                <div className="h-3 bg-gray-800/60 rounded w-12 ml-auto"></div>
                                <div className="h-5 bg-gray-800/60 rounded w-16 ml-auto"></div>
                            </div>
                        </div>

                        <div className="animate-pulse bg-[#161B26] border border-gray-800/80 rounded-2xl p-4 flex items-start justify-between h-20">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-gray-800/60 shrink-0"></div>
                                <div className="space-y-2 pt-1">
                                    <div className="h-4 bg-gray-800/60 rounded w-28"></div>
                                    <div className="h-3 bg-gray-800/60 rounded w-20"></div>
                                </div>
                            </div>
                            <div className="space-y-2 pt-1 text-right">
                                <div className="h-3 bg-gray-800/60 rounded w-12 ml-auto"></div>
                                <div className="h-5 bg-gray-800/60 rounded w-16 ml-auto"></div>
                            </div>
                        </div>
                    </div>
                ) : claims.length === 0 ? (
                    /* 2. No Cards State */
                    <div className="bg-[#161B26] border border-gray-800 rounded-3xl p-8 text-center">
                        <p className="text-xs text-gray-400 mb-1">No active loyalty cards found.</p>
                    </div>
                ) : (
                    /* 3. Render Store Cards Stack */
                    <div className="space-y-3.5">
                        {claims.map((item: any) => (
                            <div
                                key={item.id}
                                onClick={() => router.push(`/card/${item.id}`)}
                                className="w-full bg-[#161B26] border border-gray-800/80 hover:border-[#FF6B00]/40 rounded-2xl p-4 flex items-start justify-between cursor-pointer transition shadow-lg active:scale-95 group"
                            >
                                {/* Left Side: Store Logo/Initial + Store Info */}
                                <div className="flex items-start gap-3.5">
                                    {/* Dynamic Store Logo Container */}
                                    <div className="w-12 h-12 rounded-xl bg-[#0D1117] border border-[#FF6B00]/30 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-[#FF6B00] transition">
                                        {item.stores?.logo_url ? (
                                            <img
                                                src={item.stores.logo_url}
                                                alt={item.stores.store_name || 'Store Logo'}
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                        ) : (
                                            <span className="text-[#FF6B00] font-black text-lg group-hover:scale-110 transition">
                                                {(item.stores?.store_name || 'S').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Store Details (Top-aligned) */}
                                    <div className="flex flex-col pt-0.5">
                                        <h3 className="text-white font-bold text-base leading-tight group-hover:text-[#FF6B00] transition">
                                            {item.stores?.store_name || 'Store'}
                                        </h3>
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            Visits: <span className="text-gray-300 font-medium">{item.visit_count || 1}/6</span>
                                            <span className="mx-1">•</span>
                                            <span className="text-gray-400 hover:text-white transition">View Card →</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Balance Alignment */}
                                <div className="text-right shrink-0 pt-0.5">
                                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase block mb-0.5">
                                        BALANCE
                                    </span>
                                    <span className="text-[#FF6B00] font-black text-lg tracking-tight">
                                        Rs. {Number(item.claimable_amount || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}