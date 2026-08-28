'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

function RegisterForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const phoneFromUrl = searchParams.get('phone') || ''

    const [loading, setLoading] = useState(false)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [showPassword, setShowPassword] = useState(false) // 👁️ பாஸ்வேர்ட் பார்க்க/மறைக்க state
    const [formData, setFormData] = useState({
        store_name: '',
        phone_number: phoneFromUrl,
        email: '',
        password: '',
        location_url: '',
        review_url: '',
        default_cashback_percent: '10'
    })
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (phoneFromUrl) {
            setFormData(prev => ({ ...prev, phone_number: phoneFromUrl }))
        }
    }, [phoneFromUrl])

    // படத்தை Base64 Text ஆக மாற்றும் எளிய முறை (Storage பிழைகளைத் தவிர்க்க)
    const convertBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader()
            fileReader.readAsDataURL(file)
            fileReader.onload = () => resolve(fileReader.result as string)
            fileReader.onerror = (error) => reject(error)
        })
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')

        try {
            const cleanPhone = formData.phone_number.replace(/\D/g, '') || 'merchant'

            // 1. Phone number ஏற்கனவே உள்ளதா என சரிபார்த்தல்
            const { data: existingStore } = await supabase
                .from('stores')
                .select('id')
                .eq('phone_number', cleanPhone)
                .maybeSingle()

            if (existingStore) {
                setErrorMsg('This phone number is already registered. Please login.')
                setLoading(false)
                return
            }

            // 2. Logo இருந்தால் அதை உரையாக (Data URL) மாற்றுதல்
            let logoUrl = null
            if (logoFile) {
                try {
                    logoUrl = await convertBase64(logoFile)
                } catch (imgErr) {
                    console.error('Image Conversion Error:', imgErr)
                }
            }

            // 3. Store Slug உருவாக்குதல்
            const storeSlug = formData.store_name
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '')

            // 4. Password Hash செய்தல்
            const hashedPassword = await bcrypt.hash(formData.password, 10)

            // 5. Database-இல் புதிய கடையைப் பதிவேற்றுதல்
            const { data, error } = await supabase.from('stores').insert([
                {
                    store_name: formData.store_name.trim(),
                    store_slug: storeSlug,
                    phone_number: cleanPhone,
                    email: formData.email.trim(),
                    password_hash: hashedPassword,
                    logo_url: logoUrl,
                    location_url: formData.location_url.trim() || null,
                    review_url: formData.review_url.trim() || null,
                    default_cashback_percent: parseFloat(formData.default_cashback_percent) || 10
                }
            ]).select()

            if (error) throw error

            if (data) {
                // ✅ alert(...) நீக்கப்பட்டு, லாகின் பக்கத்தில் Phone Auto-fill ஆகும்படி அனுப்பப்படுகிறது
                router.push(`/merchant/login?phone=${cleanPhone}&registered=true`)
            }
        } catch (err: any) {
            console.error('Registration Error:', err)
            setErrorMsg(err.message || 'Registration failed. Try again.')
        } finally {
            setLoading(false)
        }
    }

    const isMinLength = formData.password.length >= 8
    const hasLetterAndNumber = /[A-Za-z]/.test(formData.password) && /\d/.test(formData.password)

    return (
        <div className="w-full max-w-md bg-[#161B26] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
            <h1 className="text-lg font-black text-center tracking-wider text-white uppercase mb-1">
                MERCHANT REGISTRATION
            </h1>
            <p className="text-[11px] text-center text-gray-400 mb-6">Create your official store profile to start rewarding customers.</p>

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-2xl mb-4 text-center break-words">
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-4 text-xs">
                <div>
                    <label className="text-gray-300 font-semibold block mb-1">Store Name *</label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Royal Bakery"
                        value={formData.store_name}
                        onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                        className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                    />
                </div>

                <div>
                    <label className="text-gray-300 font-semibold block mb-1">Merchant Mobile Number (Login ID) *</label>
                    <input
                        type="tel"
                        required
                        placeholder="e.g. 0771234567"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition font-mono"
                    />
                </div>

                <div>
                    <label className="text-gray-300 font-semibold block mb-1">Store Email Address (For Password Reset) *</label>
                    <input
                        type="email"
                        required
                        placeholder="store@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                    />
                </div>

                <div>
                    <label className="text-gray-300 font-semibold block mb-1">Account Password *</label>

                    {/* 👁️ Eye Toggle Icon உடன் கூடிய Password Input */}
                    <div className="relative w-full">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Set a strong password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                    <div className="mt-2 space-y-1 text-[11px] bg-[#0D1117]/50 p-2.5 rounded-xl border border-gray-800">
                        <p className={`flex items-center gap-1.5 transition-colors ${isMinLength ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                            <span>{isMinLength ? '✓' : '•'}</span> At least 8 characters
                        </p>
                        <p className={`flex items-center gap-1.5 transition-colors ${hasLetterAndNumber ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                            <span>{hasLetterAndNumber ? '✓' : '•'}</span> Contains letters & numbers
                        </p>
                    </div>
                </div>

                <div>
                    <label className="text-gray-300 font-semibold block mb-1">Default Cashback %</label>
                    <input
                        type="number"
                        placeholder="10"
                        value={formData.default_cashback_percent}
                        onChange={(e) => setFormData({ ...formData, default_cashback_percent: e.target.value })}
                        className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                    />
                </div>

                <div>
                    <label className="text-gray-300 font-semibold block mb-1">Store Logo Image (Optional)</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="w-full text-gray-400 border border-gray-800 rounded-xl bg-[#0D1117] file:mr-4 file:py-3 file:px-4 file:rounded-l-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FF6B00]/20 file:text-[#FF6B00] hover:file:bg-[#FF6B00]/30 transition cursor-pointer"
                    />
                </div>

                <div className="border-t border-gray-800 pt-4 mt-1">
                    <p className="text-[11px] text-[#FF6B00] mb-3 font-semibold">Optional Business Links (Can leave blank):</p>

                    <input
                        type="url"
                        placeholder="Google Map Link (Optional)"
                        value={formData.location_url}
                        onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0D1117] border border-gray-800 rounded-xl text-white mb-2.5 focus:outline-none focus:border-[#FF6B00] transition"
                    />

                    <input
                        type="url"
                        placeholder="Google Review Link (Optional)"
                        value={formData.review_url}
                        onChange={(e) => setFormData({ ...formData, review_url: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 mt-3 bg-gradient-to-r from-[#D95200] via-[#FF6B00] to-[#D95200] text-[#FFFFFF] font-black tracking-widest uppercase rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-98 hover:brightness-110 transition cursor-pointer"
                >
                    {loading ? 'REGISTERING STORE...' : 'CREATE STORE ACCOUNT'}
                </button>
            </form>

            <p className="text-[11px] text-center text-gray-400 mt-6">
                Already have a merchant account?{' '}
                <span
                    onClick={() => router.push('/merchant/login')}
                    className="text-[#FF6B00] font-bold cursor-pointer hover:underline"
                >
                    Login Here
                </span>
            </p>
        </div>
    )
}

export default function MerchantRegisterPage() {
    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#FF6B00] selection:text-white">
            <div className="pt-4"></div>

            <Suspense fallback={<div className="text-white text-xs">Loading registration form...</div>}>
                <RegisterForm />
            </Suspense>

            <div className="py-6 text-center text-[10px] text-gray-500 tracking-wider">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
                <p className="mt-1 text-gray-600">Encrypted End-to-End & Supabase Secured Connection</p>
            </div>
        </div>
    )
}