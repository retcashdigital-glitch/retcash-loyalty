'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export default function ForgotPasswordPage() {
    const router = useRouter()

    const [step, setStep] = useState<'email_input' | 'otp_input' | 'password_reset'>('email_input')
    const [email, setEmail] = useState('')
    const [fetchedEmail, setFetchedEmail] = useState('')

    const [generatedOtp, setGeneratedOtp] = useState('')
    const [otpExpiry, setOtpExpiry] = useState<number>(0)
    const [otpInput, setOtpInput] = useState('')
    const [timerText, setTimerText] = useState('')

    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')
    const [isError, setIsError] = useState(false)

    const isMinLength = newPassword.length >= 8
    const hasLetterAndNumber = /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword)
    const isPasswordValid = isMinLength && hasLetterAndNumber

    useEffect(() => {
        if (step === 'otp_input' && otpExpiry > 0) {
            const interval = setInterval(() => {
                const remaining = otpExpiry - Date.now()
                if (remaining <= 0) {
                    setTimerText('OTP Expired')
                    clearInterval(interval)
                } else {
                    const minutes = Math.floor(remaining / 60000)
                    const seconds = Math.floor((remaining % 60000) / 1000)
                    setTimerText(`${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s remaining`)
                }
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [step, otpExpiry])

    // Step 1: Check if store email exists and send OTP via API
    const handleSendOtpRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMsg('')
        setIsError(false)

        try {
            const cleanEmail = email.trim().toLowerCase()

            const { data: store, error } = await supabase
                .from('stores')
                .select('email')
                .eq('email', cleanEmail)
                .single()

            if (error || !store) {
                setIsError(true)
                setMsg('No store found with this email address.')
                setLoading(false)
                return
            }

            setFetchedEmail(store.email)

            // Generate 6-digit OTP & 5-min expiry
            const otp = Math.floor(100000 + Math.random() * 900000).toString()
            const expiryTime = Date.now() + 5 * 60 * 1000

            setGeneratedOtp(otp)
            setOtpExpiry(expiryTime)

            // Send real email via API
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: store.email, otp }),
            })

            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.error || 'Failed to send email.')
            }

            setLoading(false)
            setStep('otp_input')
            setMsg('OTP has been successfully sent to your email address!')

        } catch (err: any) {
            setIsError(true)
            setMsg(err.message || 'Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    // Step 2: Verify OTP
    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault()
        setMsg('')
        setIsError(false)

        if (Date.now() > otpExpiry) {
            setIsError(true)
            setMsg('OTP has expired. Please request a new one.')
            return
        }

        if (otpInput.trim() === generatedOtp) {
            setMsg('')
            setStep('password_reset')
        } else {
            setIsError(true)
            setMsg('Invalid OTP. Please check and try again.')
        }
    }

    // Step 3: Directly update password in stores table
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!isPasswordValid) {
            setIsError(true)
            setMsg('Please enter a strong password meeting the requirements below.')
            return
        }

        setLoading(true)
        setMsg('')
        setIsError(false)

        try {
            const cleanEmail = fetchedEmail.trim().toLowerCase()
            const saltRounds = 10
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

            const { error: updateError } = await supabase
                .from('stores')
                .update({ password_hash: hashedNewPassword })
                .eq('email', cleanEmail)

            if (updateError) throw updateError

            setMsg('Password updated successfully! Redirecting to login...')
            setTimeout(() => {
                router.push('/merchant/login')
            }, 2000)

        } catch (err: any) {
            setIsError(true)
            setMsg(err.message || 'Failed to reset password. Try again.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#FF6B00] selection:text-white">
            <div className="pt-4"></div>

            <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
                <h1 className="text-lg font-black text-center tracking-wider text-white uppercase mb-1">
                    RESET PASSWORD
                </h1>
                <p className="text-[11px] text-center text-gray-400 mb-6">
                    {step === 'email_input' && 'Enter your registered store email address.'}
                    {step === 'otp_input' && `Enter the 6-digit OTP sent to your email (${fetchedEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")}).`}
                    {step === 'password_reset' && 'Set a secure new password for your store.'}
                </p>

                {msg && (
                    <div className={`text-xs p-3 rounded-2xl mb-4 text-center border ${isError ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                        {msg}
                    </div>
                )}

                {/* STEP 1: Email Input */}
                {step === 'email_input' && (
                    <form onSubmit={handleSendOtpRequest} className="flex flex-col gap-4 text-xs">
                        <div>
                            <label className="text-gray-300 font-semibold block mb-1">Store Email Address</label>
                            <input
                                type="email"
                                required
                                placeholder="store@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-2 bg-gradient-to-r from-[#D95200] via-[#FF6B00] to-[#D95200] text-white font-black tracking-widest uppercase rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-98 hover:brightness-110 transition cursor-pointer flex items-center justify-center"
                        >
                            {loading ? 'SENDING OTP...' : 'SEND OTP'}
                        </button>
                    </form>
                )}

                {/* STEP 2: OTP Verification */}
                {step === 'otp_input' && (
                    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 text-xs">
                        <div>
                            <label className="text-gray-300 font-semibold block mb-1">Enter 6-Digit OTP</label>
                            <input
                                type="text"
                                maxLength={6}
                                required
                                placeholder="123456"
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value)}
                                className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-center text-lg tracking-widest text-white font-mono focus:outline-none focus:border-[#FF6B00] transition"
                            />
                            <div className="flex justify-between items-center mt-2 px-1">
                                <span className="text-[10px] text-orange-400 font-medium">⏳ {timerText}</span>
                                <button
                                    type="button"
                                    onClick={() => setStep('email_input')}
                                    className="text-[10px] text-gray-400 hover:underline"
                                >
                                    Change Email
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 mt-2 bg-gradient-to-r from-[#D95200] via-[#FF6B00] to-[#D95200] text-white font-black tracking-widest uppercase rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-98 hover:brightness-110 transition cursor-pointer"
                        >
                            VERIFY OTP
                        </button>
                    </form>
                )}

                {/* STEP 3: Password Reset */}
                {step === 'password_reset' && (
                    <form onSubmit={handleResetPassword} className="flex flex-col gap-4 text-xs">
                        <div>
                            <label className="text-gray-300 font-semibold block mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition focus:outline-none"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228A3 3 0 0 0 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="mt-2 space-y-1 text-[11px] bg-[#0D1117]/50 p-2.5 rounded-xl border border-gray-800">
                                <p className={`flex items-center gap-1.5 transition-colors ${isMinLength ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                                    <span>{isMinLength ? '✓' : '•'}</span> At least 8 characters
                                </p>
                                <p className={`flex items-center gap-1.5 transition-colors ${hasLetterAndNumber ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                                    <span>{hasLetterAndNumber ? '✓' : '•'}</span> Contains letters & numbers
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-2 bg-gradient-to-r from-[#D95200] via-[#FF6B00] to-[#D95200] text-white font-black tracking-widest uppercase rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-98 hover:brightness-110 transition cursor-pointer flex items-center justify-center"
                        >
                            {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
                        </button>
                    </form>
                )}

                <p className="text-[11px] text-center text-gray-400 mt-6">
                    Remember your password?{' '}
                    <span onClick={() => router.push('/merchant/login')} className="text-[#FF6B00] font-bold cursor-pointer hover:underline">
                        Login Here
                    </span>
                </p>
            </div>

            <div className="py-6 text-center text-[10px] text-gray-500 tracking-wider">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
            </div>
        </div>
    )
}