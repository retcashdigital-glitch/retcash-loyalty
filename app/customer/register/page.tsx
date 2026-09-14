'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function CustomerRegisterPage() {
    const router = useRouter()
    const [fullNameInput, setFullNameInput] = useState('')
    const [phoneInput, setPhoneInput] = useState('')
    const [emailInput, setEmailInput] = useState('')
    const [passwordInput, setPasswordInput] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    // Standardized Phone normalization logic
    // Accepts formats like: 0771234567, +94771234567, 94771234567, or 771234567
    // Returns a standard 11-digit database format starting with 94 (e.g. 94771234567)
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')
        setSuccessMsg('')

        const cleanPhone = normalizePhone(phoneInput)
        if (!cleanPhone) {
            setErrorMsg('Please enter a valid phone number (e.g., 0771234567 or 771234567)')
            return
        }

        if (!fullNameInput.trim()) {
            setErrorMsg('Full name is required.')
            return
        }

        if (!emailInput.trim()) {
            setErrorMsg('Email address is required.')
            return
        }

        if (!passwordInput.trim() || passwordInput.length < 6) {
            setErrorMsg('Password must be at least 6 characters.')
            return
        }

        try {
            setLoading(true)
            const securePassword = btoa(passwordInput.trim())

            // 1. Check if user already exists with this phone number
            const { data: existingData, error: checkError } = await supabase
                .from('customers')
                .select('id, phone_number')
                .eq('phone_number', cleanPhone)

            if (checkError) throw checkError

            if (existingData && existingData.length > 0) {
                // User already registered -> Inform and redirect to login
                setSuccessMsg('Account already exists! Redirecting to login...')
                setTimeout(() => {
                    router.push('/customer/login')
                }, 2000)
                return
            }

            // 2. Register New Customer
            const { error: insertError } = await supabase
                .from('customers')
                .insert([
                    {
                        full_name: fullNameInput.trim(),
                        phone_number: cleanPhone,
                        email: emailInput.trim(),
                        password: securePassword
                    }
                ])

            if (insertError) throw insertError

            // Save login session and route directly to wallet
            localStorage.setItem(`retcash_wallet_auth_${cleanPhone}`, 'true')
            router.push(`/wallet/${cleanPhone}`)

        } catch (err: any) {
            console.error(err)
            setErrorMsg(err.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center justify-center p-4 font-sans selection:bg-[#00875A] selection:text-white">
            
            {/* Top Header with Real Logo Image */}
            <div className="w-full max-w-md bg-slate-200/80 py-3 px-4 rounded-t-2xl flex items-center justify-center space-x-2 border-t border-x border-slate-300/60 mb-[-10px] z-10">
                <Image 
                    src="/logo.png" 
                    alt="RETCASH Logo" 
                    width={20} 
                    height={20} 
                    className="w-5 h-5 object-contain"
                />
                <span className="font-extrabold tracking-wider text-slate-800 text-sm uppercase">
                    RET<span className="text-[#00875A]">CASH</span>
                </span>
            </div>

            {/* Main Register Card */}
            <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 pt-10 shadow-xl space-y-6 relative z-20">

                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-md shadow-slate-200/60 mx-auto mb-3 p-2">
                        <Image 
                            src="/logo.png" 
                            alt="RETCASH Logo" 
                            width={48} 
                            height={48} 
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-black text-[#00875A] tracking-wider uppercase">RETCASH</h1>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Customer Registration</h2>
                    <p className="text-xs text-slate-500">
                        Enter your details to create an account and access your cashback wallet.
                    </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    {/* Full Name Field */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Full Name</label>
                        <input
                            type="text"
                            value={fullNameInput}
                            onChange={(e) => setFullNameInput(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-slate-50 border border-slate-300 focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition"
                            required
                        />
                    </div>

                    {/* Phone Number Field */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Phone Number</label>
                        <div className="flex items-center w-full bg-slate-50 border border-slate-300 focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-[#00875A]/20 rounded-xl px-3 py-2.5 transition">
                            <span className="text-slate-500 font-bold text-sm pr-2 border-r border-slate-300">+94</span>
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                placeholder="0771234567 or 771234567"
                                className="w-full bg-transparent pl-3 text-sm font-semibold text-slate-900 outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full bg-slate-50 border border-slate-300 focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition"
                            required
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Create Password</label>
                        <div className="relative flex items-center w-full bg-slate-50 border border-slate-300 focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-[#00875A]/20 rounded-xl px-3 py-2.5 transition">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="At least 6 characters"
                                className="w-full bg-transparent pr-8 text-sm font-semibold text-slate-900 outline-none"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 text-slate-400 hover:text-slate-600 outline-none cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Use 6 or more characters with letters & numbers.</p>
                    </div>

                    {errorMsg && <p className="text-xs text-red-600 font-bold text-center bg-red-50 p-2 rounded-xl border border-red-200">{errorMsg}</p>}
                    {successMsg && <p className="text-xs text-[#00875A] font-bold text-center bg-emerald-50 p-2 rounded-xl border border-emerald-200">{successMsg}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#00875A] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-[#00875A]/25 active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                        {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'Register & Open Wallet'}
                    </button>
                </form>

                <div className="text-center pt-2 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">
                        Already have an account?{' '}
                        <Link href="/customer/login" className="text-[#00875A] font-extrabold hover:underline">
                            Login here
                        </Link>
                    </p>
                </div>

            </div>

            <div className="py-8 text-center text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM</p>
            </div>
        </div>
    )
}