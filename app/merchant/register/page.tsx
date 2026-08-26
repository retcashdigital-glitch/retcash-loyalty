'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs' // பாஸ்வேர்ட் பாதுகாப்பிற்காக bcrypt சேர்க்கப்பட்டுள்ளது

export default function MerchantRegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [formData, setFormData] = useState({
        store_name: '',
        phone_number: '',
        email: '', // பாஸ்வேர்ட் மீட்பிற்காக ஈமெயில் ஃபீல்டு இணைக்கப்பட்டுள்ளது
        password: '',
        location_url: '',
        review_url: '',
        default_cashback_percent: '10'
    })
    const [errorMsg, setErrorMsg] = useState('')

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')

        try {
            const cleanPhone = formData.phone_number.replace(/\D/g, '')

            // 1. Check existing phone
            const { data: existingStore } = await supabase
                .from('stores')
                .select('id')
                .eq('phone_number', cleanPhone)
                .single()

            if (existingStore) {
                setErrorMsg('This phone number is already registered. Please login.')
                setLoading(false)
                return
            }

            let logoUrl = null

            // 2. Upload Logo File to Supabase Storage if selected
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop()
                const fileName = `${cleanPhone}-${Date.now()}.${fileExt}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('store-logos')
                    .upload(fileName, logoFile)

                if (uploadError) {
                    console.error('Logo upload error:', uploadError)
                } else if (uploadData) {
                    const { data: publicUrlData } = supabase.storage
                        .from('store-logos')
                        .getPublicUrl(fileName)
                    logoUrl = publicUrlData.publicUrl
                }
            }

            // Create Unique Store Slug (e.g., "Royal Bakery" -> "royal-bakery")
            const storeSlug = formData.store_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

            // 3. Hash Password securely using bcrypt
            const saltRounds = 10
            const hashedPassword = await bcrypt.hash(formData.password, saltRounds)

            // 4. Save Store Profile with Hashed Password and Email
            const { data, error } = await supabase.from('stores').insert([
                {
                    store_name: formData.store_name.trim(),
                    store_slug: storeSlug,
                    phone_number: cleanPhone,
                    email: formData.email.trim(), // டேட்டாபேஸில் ஈமெயில் சேமிக்கப்படுகிறது
                    password_hash: hashedPassword, // பாதுகாக்கப்பட்ட ஹேஷ் பாஸ்வேர்ட்
                    logo_url: logoUrl,
                    location_url: formData.location_url.trim() || null,
                    review_url: formData.review_url.trim() || null,
                    default_cashback_percent: parseFloat(formData.default_cashback_percent) || 10
                }
            ]).select()

            if (error) throw error

            if (data) {
                alert('Registration Successful! Please login.')
                router.push('/merchant/login')
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Registration failed. Try again.')
        } finally {
            setLoading(false)
        }
    }

    // பாஸ்வேர்ட் நிபந்தனைகளை செக் செய்வதற்கான வேரியபிள்கள்
    const isMinLength = formData.password.length >= 8
    const hasLetterAndNumber = /[A-Za-z]/.test(formData.password) && /\d/.test(formData.password)

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#FF6B00] selection:text-white">

            {/* Empty space filler to maintain centering alignment without the broken image box */}
            <div className="pt-4"></div>

            {/* Main Registration Card */}
            <div className="w-full max-w-md bg-[#161B26] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
                <h1 className="text-lg font-black text-center tracking-wider text-white uppercase mb-1">
                    MERCHANT REGISTRATION
                </h1>
                <p className="text-[11px] text-center text-gray-400 mb-6">Create your official store profile to start rewarding customers.</p>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-2xl mb-4 text-center">
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
                            className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                        />
                    </div>

                    {/* புதியதாக சேர்க்கப்பட்ட Email Input ஃபீல்டு */}
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
                        <input
                            type="password"
                            required
                            placeholder="Set a strong password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3.5 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] transition"
                        />

                        {/* Live Password Validation Checklist UI */}
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

                    {/* Store Logo Image File Upload */}
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
                        className="w-full py-4 mt-3 bg-gradient-to-r from-[#D95200] via-[#FF6B00] to-[#D95200] text-white font-black tracking-widest uppercase rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-98 hover:brightness-110 transition cursor-pointer"
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

            {/* Footer Branding & Copyright */}
            <div className="py-6 text-center text-[10px] text-gray-500 tracking-wider">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
                <p className="mt-1 text-gray-600">Encrypted End-to-End & Supabase Secured Connection</p>
            </div>

        </div>
    )
}