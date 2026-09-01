'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

    // Phone normalization: ensures it becomes 94xxxxxxxxx format
    const normalizePhone = (input: string) => {
        let cleaned = input.replace(/\D/g, '')
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.slice(1)
        }
        if (!cleaned.startsWith('94') && cleaned.length > 0) {
            cleaned = '94' + cleaned
        }
        return cleaned
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')

        const cleanPhone = normalizePhone(phoneInput)
        if (!cleanPhone || cleanPhone.length < 11) {
            setErrorMsg('தயவுசெய்து சரியான தொலைபேசி எண்ணை உள்ளிடவும் (Please enter a valid phone number)')
            return
        }

        if (!fullNameInput.trim()) {
            setErrorMsg('பெயர் கட்டாயமானது (Full name is mandatory)')
            return
        }

        if (!emailInput.trim()) {
            setErrorMsg('ஈமெயில் முகவரி கட்டாயமானது (Email address is mandatory)')
            return
        }

        if (!passwordInput.trim() || passwordInput.length < 6) {
            setErrorMsg('பாஸ்வேர்ட் குறைந்தது 6 எழுத்துக்களாவது இருக்க வேண்டும் (Password must be at least 6 characters)')
            return
        }

        try {
            setLoading(true)
            const securePassword = btoa(passwordInput.trim())

            // 1. இந்த போன் நம்பர் ஏற்கனவே உள்ளதா எனச் சரிபார்த்தல்
            const { data: existingData, error: checkError } = await supabase
                .from('customers')
                .select('id, email')
                .eq('phone_number', cleanPhone)

            if (checkError) throw checkError

            if (existingData && existingData.length > 0) {
                // ஏற்கனவே கணக்கு உள்ளது, அப்டேட் செய்வோம்
                const { error: updateError } = await supabase
                    .from('customers')
                    .update({
                        full_name: fullNameInput.trim(),
                        email: emailInput.trim(),
                        password: securePassword
                    })
                    .eq('phone_number', cleanPhone)

                if (updateError) throw updateError
            } else {
                // 2. புதிய கஸ்டமர் பதிவேீடு
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
            }

            // லோக்கல் ஸ்டோரேஜில் லாகின் செஷனைச் சேமித்து பாப்-அப் இல்லாமல் உடனடியாக வாலட்டுக்கு அனுப்புதல்
            localStorage.setItem(`retcash_wallet_auth_${cleanPhone}`, 'true')
            router.push(`/wallet/${cleanPhone}`)

        } catch (err: any) {
            console.error(err)
            setErrorMsg('பதிவு செய்வதில் பிழை ஏற்பட்டுள்ளது. மீண்டும் முயற்சிக்கவும்.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-[#FF6B00]">
            <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">

                <div className="text-center space-y-2">
                    <h1 className="text-xl font-black text-[#FF6B00] tracking-wider">RETCASH</h1>
                    <h2 className="text-sm font-bold text-white">Customer Registration</h2>
                    <p className="text-[11px] text-gray-400">
                        Enter your details, phone number, email, and create a password to access your cashback wallet.
                    </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    {/* Full Name Field */}
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Full Name</label>
                        <input
                            type="text"
                            value={fullNameInput}
                            onChange={(e) => setFullNameInput(e.target.value)}
                            placeholder="உங்கள் பெயர்"
                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none transition"
                            required
                        />
                    </div>

                    {/* Phone Number Field */}
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Phone Number</label>
                        <div className="flex items-center w-full bg-[#0B0E14] border border-gray-800 focus-within:border-[#FF6B00] rounded-xl px-3 py-2 transition">
                            <span className="text-gray-400 text-sm pr-2 border-r border-gray-800">+94</span>
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                placeholder="771234567"
                                className="w-full bg-transparent pl-3 text-sm text-white outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Email Address (Mandatory)</label>
                        <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none transition"
                            required
                        />
                    </div>

                    {/* Password Field with Eye Icon */}
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Create Password</label>
                        <div className="relative flex items-center w-full bg-[#0B0E14] border border-gray-800 focus-within:border-[#FF6B00] rounded-xl px-3 py-2 transition">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="At least 6 characters"
                                className="w-full bg-transparent pr-8 text-sm text-white outline-none"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 text-gray-400 hover:text-white outline-none"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Use 6 or more characters with a mix of letters & numbers.</p>
                    </div>

                    {errorMsg && <p className="text-[11px] text-red-500 font-medium text-center">{errorMsg}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-2.5 rounded-xl text-sm transition shadow-lg active:scale-95 flex items-center justify-center"
                    >
                        {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'Register & Open Wallet'}
                    </button>
                </form>

                <div className="text-center pt-2">
                    <button
                        onClick={() => router.back()}
                        className="text-[11px] text-gray-400 hover:text-white transition"
                    >
                        ← Back to previous page
                    </button>
                </div>

            </div>

            <div className="py-8 text-center text-[10px] text-gray-600 tracking-wider">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM</p>
            </div>
        </div>
    )
}