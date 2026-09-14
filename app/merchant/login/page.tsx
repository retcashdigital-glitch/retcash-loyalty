'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const phoneFromUrl = searchParams.get('phone') || ''
    const isRegistered = searchParams.get('registered') === 'true'

    const [phone, setPhone] = useState(phoneFromUrl)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    // Auto-redirect if already logged in as merchant
    useEffect(() => {
        const savedMerchant = localStorage.getItem('retcash_merchant')
        if (savedMerchant) {
            router.push('/merchant/dashboard')
            return
        }

        if (phoneFromUrl) {
            setPhone(phoneFromUrl)
        }
        if (isRegistered) {
            setSuccessMsg('Registration Successful! Please login with your password.')
        }
    }, [phoneFromUrl, isRegistered, router])

    // Format Sri Lankan phone numbers to international standard format
    const formatPhoneNumber = (input: string) => {
        const cleaned = input.replace(/\D/g, '')
        if (!cleaned) return ''

        if (cleaned.startsWith('0') && cleaned.length === 10) {
            return '94' + cleaned.slice(1)
        }
        if (cleaned.startsWith('94') && cleaned.length === 11) {
            return cleaned
        }
        return cleaned
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')
        setSuccessMsg('')

        try {
            const cleanPhone = formatPhoneNumber(phone)

            if (!cleanPhone || cleanPhone.length < 9) {
                setErrorMsg('Please enter a valid phone number.')
                setLoading(false)
                return
            }

            // 1. Verify if merchant exists in database
            const { data: store, error } = await supabase
                .from('stores')
                .select('*')
                .eq('phone_number', cleanPhone)
                .single()

            // Redirect to registration if phone number not found
            if (error || !store) {
                router.push(`/merchant/register?phone=${cleanPhone}`)
                return
            }

            // 2. Validate password hash
            const isPasswordValid = await bcrypt.compare(password, store.password_hash)

            if (!isPasswordValid) {
                setErrorMsg('Invalid password. Please try again.')
                setLoading(false)
                return
            }

            // 3. Store merchant session safely without sensitive hashes
            const safeMerchantSession = {
                id: store.id,
                store_name: store.store_name,
                phone_number: store.phone_number,
                default_cashback_percent: store.default_cashback_percent ?? 5,
                target_visits: store.target_visits ?? 6
            }
            
            localStorage.setItem('retcash_merchant', JSON.stringify(safeMerchantSession))
            
            // Redirect to merchant dashboard
            router.push('/merchant/dashboard')
        } catch (err: any) {
            setErrorMsg('Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xl relative my-auto">
            
            {/* Logo & Header Section */}
            <div className="text-center mb-6 space-y-2">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-md shadow-slate-200/60 mx-auto mb-3 p-2">
                    <Image 
                        src="/logo.png" 
                        alt="RETCASH Logo" 
                        width={48} 
                        height={48} 
                        className="w-full h-full object-contain"
                    />
                </div>
                <h1 className="text-xl font-black tracking-wider text-[#00875A] uppercase">
                    MERCHANT PORTAL
                </h1>
                <p className="text-xs text-slate-500">
                    Enter your registered phone number & password to access your console.
                </p>
            </div>

            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-[#00875A] text-xs p-3 rounded-2xl mb-4 text-center font-bold break-words flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00875A] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl mb-4 text-center font-bold">
                    <p>{errorMsg}</p>
                </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs">
                <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Mobile Number</label>
                    <input
                        type="tel"
                        required
                        placeholder="e.g. 0771234567 or 94771234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 transition font-mono"
                    />
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Password</label>

                    <div className="relative w-full">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold pr-12 focus:outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 transition"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus:outline-none cursor-pointer"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.52 10.52 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.274 4.057 5.065 7 9.54 7 4.478 0 8.268-2.943 9.542-7-1.274-4.057-5.064-7-9.542-7-4.477 0-8.265 2.943-9.54 7Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end -mt-2 mb-1">
                    <span
                        onClick={() => router.push('/merchant/forgot-password')}
                        className="text-[11px] text-slate-500 font-medium hover:text-[#00875A] cursor-pointer transition"
                    >
                        Forgot Password?
                    </span>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 mt-1 bg-[#00875A] hover:bg-[#059669] text-white font-extrabold tracking-wider uppercase rounded-xl shadow-md shadow-[#00875A]/25 active:scale-[0.98] transition cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'CONTINUE TO DASHBOARD'}
                </button>
            </form>

            <p className="text-xs text-center text-slate-500 font-medium mt-6">
                Don't have an account?{' '}
                <span
                    onClick={() => router.push('/merchant/register')}
                    className="text-[#00875A] font-extrabold cursor-pointer hover:underline"
                >
                    Register Store
                </span>
            </p>
        </div>
    )
}

export default function MerchantLoginPage() {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#00875A] selection:text-white">
            <div className="pt-2"></div>
            <Suspense fallback={<div className="text-slate-500 text-xs font-bold">Loading login form...</div>}>
                <LoginForm />
            </Suspense>
            <div className="py-6 text-center text-[10px] text-slate-400 font-extrabold tracking-wider uppercase space-y-1">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
                <p className="text-slate-400/80 font-semibold">Encrypted End-to-End & Supabase Secured Connection</p>
            </div>
        </div>
    )
}