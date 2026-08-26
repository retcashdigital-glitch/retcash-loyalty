'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CustomerRegisterPage() {
    const router = useRouter()
    const [phoneInput, setPhoneInput] = useState('')
    const [emailInput, setEmailInput] = useState('')
    const [passwordInput, setPasswordInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')

        const cleanPhone = phoneInput.replace(/\D/g, '')
        if (!cleanPhone || cleanPhone.length < 9) {
            setErrorMsg('దయவுசெய்து சரியான தொலைபேசி எண்ணை உள்ளிடவும் (Please enter a valid phone number)')
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
                // ஏற்கனவே கணக்கு உள்ளது, ஆனால் ஈமெயில் இல்லையென்றால் அப்டேட் செய்வோம்
                const { error: updateError } = await supabase
                    .from('customers')
                    .update({
                        email: emailInput.trim(),
                        password: securePassword
                    })
                    .eq('phone_number', cleanPhone)

                if (updateError) throw updateError

                alert('உங்கள் கணக்கு வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது!')
            } else {
                // 2. புதிய கஸ்டமர் பதிவேீடு
                const { error: insertError } = await supabase
                    .from('customers')
                    .insert([
                        {
                            phone_number: cleanPhone,
                            email: emailInput.trim(),
                            password: securePassword
                        }
                    ])

                if (insertError) throw insertError

                alert('பதிவு வெற்றிகரமாக முடிந்தது!')
            }

            // லோக்கல் ஸ்டோரேஜில் லாகின் செஷனைச் சேமித்து நேராக வாலட்டுக்கு அனுப்புதல்
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
                        Enter your phone number, email, and create a password to access your cashback wallet.
                    </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Phone Number</label>
                        <input
                            type="tel"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            placeholder="e.g. 0771234567"
                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none transition"
                            required
                        />
                    </div>

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

                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">Create Password</label>
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none transition"
                            required
                        />
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