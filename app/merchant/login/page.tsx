'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export default function MerchantLoginPage() {
    const router = useRouter()
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [isNotRegistered, setIsNotRegistered] = useState(false) // புதிய நிலை (State)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')
        setIsNotRegistered(false)

        try {
            const cleanPhone = phone.replace(/\D/g, '')

            const { data: store, error } = await supabase
                .from('stores')
                .select('*')
                .eq('phone_number', cleanPhone)
                .single()

            // போன் நம்பர் டேட்டாபேஸில் இல்லை என்றால்
            if (error || !store) {
                setErrorMsg('This phone number is not registered.')
                setIsNotRegistered(true)
                setLoading(false)
                return
            }

            // bcrypt.compare மூலம் ஹேஷ் செய்யப்பட்ட பாஸ்வேர்டை சரிபார்த்தல்
            const isPasswordValid = await bcrypt.compare(password, store.password_hash)

            if (!isPasswordValid) {
                setErrorMsg('Invalid phone number or password.')
                setLoading(false)
                return
            }

            localStorage.setItem('retcash_merchant', JSON.stringify(store))
            router.push('/admin')
        } catch (err: any) {
            setErrorMsg('Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#FF6B00] selection:text-white">

            <div className="pt-2"></div>

            {/* Main Login Card */}
            <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md my-auto">
                <h1 className="text-lg font-black text-center tracking-wider text-white uppercase mb-1">
                    MERCHANT LOGIN
                </h1>
                <p className="text-[11px] text-center text-gray-400 mb-6">Enter your phone number & password to access console.</p>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-2xl mb-4 text-center">
                        <p>{errorMsg}</p>
                        {isNotRegistered && (
                            <button
                                onClick={() => router.push('/merchant/register')}
                                className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer"
                            >
                                Would you like to create an account? Register Store
                            </button>
                        )}
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
                            className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                        />
                    </div>

                    <div>
                        <label className="text-gray-300 font-semibold block mb-1">Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                        />
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
                        {loading ? 'LOGGING IN...' : 'LOGIN TO DASHBOARD'}
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

            {/* Footer Branding & Copyright */}
            <div className="py-6 text-center text-[10px] text-gray-500 tracking-wider">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
                <p className="mt-1 text-gray-600">Encrypted End-to-End & Supabase Secured Connection</p>
            </div>

        </div>
    )
}