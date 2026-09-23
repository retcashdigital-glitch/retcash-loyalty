'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

function RegisterForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const phoneFromUrl = searchParams.get('phone') || ''

    const [loading, setLoading] = useState(false)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [showPassword, setShowPassword] = useState(false)
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

    // Helper Function: Formats any Sri Lankan mobile number variation into standard '947XXXXXXXX'
    const formatPhoneNumber = (phone: string): string => {
        let clean = phone.replace(/\D/g, '') // Keep digits only

        if (!clean) return ''

        // Handle case starting with 0 (e.g., 0771234567 -> 94771234567)
        if (clean.startsWith('0')) {
            clean = '94' + clean.slice(1)
        }
        // Handle case without leading 0 or 94 (e.g., 771234567 -> 94771234567)
        else if (!clean.startsWith('94') && clean.length === 9) {
            clean = '94' + clean
        }

        return clean
    }

    useEffect(() => {
        if (phoneFromUrl) {
            setFormData(prev => ({ ...prev, phone_number: phoneFromUrl }))
        }
    }, [phoneFromUrl])

    // Convert uploaded image file to Base64 Data URL to prevent storage configuration issues
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
            // Format phone number to standard Sri Lankan 94 format
            const formattedPhone = formatPhoneNumber(formData.phone_number)

            if (!formattedPhone || formattedPhone.length < 11) {
                setErrorMsg('Please enter a valid mobile number (e.g., 0771234567 or 771234567).')
                setLoading(false)
                return
            }

            // 1. Check if phone number is already registered
            const { data: existingStore } = await supabase
                .from('stores')
                .select('id')
                .eq('phone_number', formattedPhone)
                .maybeSingle()

            // If already registered, seamlessly redirect to Merchant Login Page with pre-filled phone number
            if (existingStore) {
                router.push(`/merchant/login?phone=${formattedPhone}&already_exists=true`)
                return
            }

            // 2. Convert logo file to Data URL if provided
            let logoUrl = null
            if (logoFile) {
                try {
                    logoUrl = await convertBase64(logoFile)
                } catch (imgErr) {
                    console.error('Image Conversion Error:', imgErr)
                }
            }

            // 3. Generate unique store slug with phone suffix to avoid collisions
            const baseSlug = formData.store_name
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '')

            const phoneSuffix = formattedPhone.length >= 4 ? formattedPhone.slice(-4) : Math.floor(1000 + Math.random() * 9000)
            const storeSlug = `${baseSlug}-${phoneSuffix}`

            // 4. Hash password securely
            const hashedPassword = await bcrypt.hash(formData.password, 10)

            // 5. Insert new store record into Supabase using standardized 94 phone number
            const { data, error } = await supabase.from('stores').insert([
                {
                    store_name: formData.store_name.trim(),
                    store_slug: storeSlug,
                    phone_number: formattedPhone,
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
                // Redirect to login page with pre-filled formatted phone number and registration flag
                router.push(`/merchant/login?phone=${formattedPhone}&registered=true`)
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
                    MERCHANT REGISTRATION
                </h1>
                <p className="text-xs text-slate-500">
                    Create your official store profile to start rewarding customers.
                </p>
            </div>

            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl mb-4 text-center font-bold break-words">
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-4 text-xs">
                <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Store Name *</label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Royal Bakery"
                        value={formData.store_name}
                        onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 transition"
                    />
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Merchant Mobile Number (Login ID) *</label>
                    <input
                        type="tel"
                        required
                        placeholder="e.g. 0771234567"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 transition font-mono"
                    />
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Store Email Address (For Password Reset) *</label>
                    <input
                        type="email"
                        required
                        placeholder="store@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 transition"
                    />
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Account Password *</label>

                    <div className="relative w-full">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Set a strong password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                    <div className="mt-2 space-y-1 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <p className={`flex items-center gap-1.5 transition-colors ${isMinLength ? 'text-[#00875A] font-bold' : 'text-slate-400'}`}>
                            <span>{isMinLength ? '✓' : '•'}</span> At least 8 characters
                        </p>
                        <p className={`flex items-center gap-1.5 transition-colors ${hasLetterAndNumber ? 'text-[#00875A] font-bold' : 'text-slate-400'}`}>
                            <span>{hasLetterAndNumber ? '✓' : '•'}</span> Contains letters & numbers
                        </p>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Default Cashback %</label>
                    <input
                        type="number"
                        placeholder="10"
                        value={formData.default_cashback_percent}
                        onChange={(e) => setFormData({ ...formData, default_cashback_percent: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 transition"
                    />
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Store Logo Image (Optional)</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="w-full text-slate-500 text-xs border border-slate-300 rounded-xl bg-slate-50 file:mr-4 file:py-2.5 file:px-4 file:rounded-l-xl file:border-0 file:text-xs file:font-bold file:bg-[#00875A]/10 file:text-[#00875A] hover:file:bg-[#00875A]/20 transition cursor-pointer"
                    />
                </div>

                <div className="border-t border-slate-200 pt-4 mt-1">
                    <p className="text-[11px] text-[#00875A] mb-3 font-bold">Optional Business Links (Can leave blank):</p>

                    <input
                        type="url"
                        placeholder="Google Map Link (Optional)"
                        value={formData.location_url}
                        onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold mb-2.5 focus:outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 transition"
                    />

                    <input
                        type="url"
                        placeholder="Google Review Link (Optional)"
                        value={formData.review_url}
                        onChange={(e) => setFormData({ ...formData, review_url: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 transition"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 mt-3 bg-[#00875A] hover:bg-[#059669] text-white font-extrabold tracking-wider uppercase rounded-xl shadow-md shadow-[#00875A]/25 active:scale-[0.98] transition cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'CREATE STORE ACCOUNT'}
                </button>
            </form>

            <p className="text-xs text-center text-slate-500 font-medium mt-6">
                Already have a merchant account?{' '}
                <span
                    onClick={() => router.push('/merchant/login')}
                    className="text-[#00875A] font-extrabold cursor-pointer hover:underline"
                >
                    Login Here
                </span>
            </p>
        </div>
    )
}

export default function MerchantRegisterPage() {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#00875A] selection:text-white">
            <div className="pt-4"></div>

            <Suspense fallback={<div className="text-slate-500 text-xs font-bold">Loading registration form...</div>}>
                <RegisterForm />
            </Suspense>

            <div className="py-6 text-center text-[10px] text-slate-400 font-extrabold tracking-wider uppercase space-y-1">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
                <p className="text-slate-400/80 font-semibold">Encrypted End-to-End & Supabase Secured Connection</p>
            </div>
        </div>
    )
}