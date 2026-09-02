'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Register பக்கத்திலிருந்து Redirect ஆகி வரும்போது URL-இல் இருந்து தரவுகளை எடுத்தல்
    const phoneFromUrl = searchParams.get('phone') || ''
    const isRegistered = searchParams.get('registered') === 'true'

    const [phone, setPhone] = useState(phoneFromUrl)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false) // 👁️ பாஸ்வேர்ட் பார்க்க/மறைக்க State
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => {
        if (phoneFromUrl) {
            setPhone(phoneFromUrl)
        }
        if (isRegistered) {
            setSuccessMsg('Registration Successful! Please login with your password.')
        }
    }, [phoneFromUrl, isRegistered])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')
        setSuccessMsg('')

        try {
            const cleanPhone = phone.replace(/\D/g, '')

            if (!cleanPhone || cleanPhone.length < 8) {
                setErrorMsg('Please enter a valid phone number.')
                setLoading(false)
                return
            }

            // 1. முதலில் போன் நம்பர் டேட்டாபேஸில் உள்ளதா எனச் சோதித்தல்
            const { data: store, error } = await supabase
                .from('stores')
                .select('*')
                .eq('phone_number', cleanPhone)
                .single()

            // போன் நம்பர் இல்லை என்றால் -> உடனே Register பக்கத்திற்கு போன் நம்பருடன் திருப்பிவிடுதல்!
            if (error || !store) {
                router.push(`/merchant/register?phone=${cleanPhone}`)
                return
            }

            // 2. போன் நம்பர் இருந்தால் -> பாஸ்வேர்டை சரிபார்த்தல்
            const isPasswordValid = await bcrypt.compare(password, store.password_hash)

            if (!isPasswordValid) {
                setErrorMsg('Invalid password. Please try again.')
                setLoading(false)
                return
            }

            // 3. வெற்றி -> Merchant Dashboard (/merchant) பக்கத்திற்கு அனுப்புதல்
            localStorage.setItem('retcash_merchant', JSON.stringify(store))
            router.push('/merchant')
        } catch (err: any) {
            setErrorMsg('Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md my-auto">
            <h1 className="text-lg font-black text-center tracking-wider text-white uppercase mb-1">
                MERCHANT PORTAL
            </h1>
            <p className="text-[11px] text-center text-gray-400 mb-6">Enter your phone number & password to access console.</p>

            {/* பதிவு வெற்றிபெற்று வந்தால் தோன்றும் பச்சை நிற செய்தி */}
            {successMsg && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs p-3 rounded-2xl mb-4 text-center break-words flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {successMsg}
                </div>
            )}

            {/* பிழை செய்தி */}
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-2xl mb-4 text-center">
                    <p>{errorMsg}</p>
                </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs">
                <div>
                    <label className="text-gray-300 font-semibold block mb-1">Mobile Number</label>
                    <input
                        type="tel"
                        required
                        placeholder="e.g. 0771234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition font-mono"
                    />
                </div>

                <div>
                    <label className="text-gray-300 font-semibold block mb-1">Password</label>

                    {/* 👁️ பாஸ்வேர்ட் கண் ஐகானுடன் கூடிய Input Box */}
                    <div className="relative w-full">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white pr-12 focus:outline-none focus:border-[#FF6B00] transition"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition focus:outline-none cursor-pointer"
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

                {/* Forgot Password Link */}
                <div className="flex justify-end -mt-2 mb-1">
                    <span
                        onClick={() => router.push('/merchant/forgot-password')}
                        className="text-[11px] text-gray-400 hover:text-[#FF6B00] cursor-pointer transition"
                    >
                        Forgot Password?
                    </span>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 mt-1 bg-gradient-to-r from-[#D95200] via-[#FF6B00] to-[#D95200] text-white font-black tracking-widest uppercase rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-98 hover:brightness-110 transition cursor-pointer"
                >
                    {loading ? 'CHECKING...' : 'CONTINUE TO DASHBOARD'}
                </button>
            </form>

            <p className="text-[11px] text-center text-gray-400 mt-6">
                Don't have an account?{' '}
                <span
                    onClick={() => router.push('/merchant/register')}
                    className="text-[#FF6B00] font-bold cursor-pointer hover:underline"
                >
                    Register Store
                </span>
            </p>
        </div>
    )
}

export default function MerchantLoginPage() {
    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#FF6B00] selection:text-white">
            <div className="pt-2"></div>

            <Suspense fallback={<div className="text-white text-xs">Loading login form...</div>}>
                <LoginForm />
            </Suspense>

            {/* Footer Branding & Copyright */}
            <div className="py-6 text-center text-[10px] text-gray-500 tracking-wider">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
                <p className="mt-1 text-gray-600">Encrypted End-to-End & Supabase Secured Connection</p>
            </div>
        </div>
    )
}