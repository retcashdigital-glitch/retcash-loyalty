'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MerchantCheckPage() {
    const router = useRouter()
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleCheckMerchant = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanPhone = phone.replace(/\D/g, '')

        if (!cleanPhone || cleanPhone.length < 8) {
            setError('தயவுசெய்து சரியான மொபைல் எண்ணை உள்ளிடவும்')
            return
        }

        try {
            setLoading(true)
            setError('')

            // டேட்டாபேஸில் phone_number பத்தியை அடிப்படையாகக் கொண்டு சோதித்தல்
            const { data, error: fetchErr } = await supabase
                .from('stores')
                .select('id, phone_number')
                .eq('phone_number', cleanPhone)
                .maybeSingle()

            if (fetchErr) throw fetchErr

            if (data) {
                // ஏற்கனவே கணக்கு உள்ளது -> லாகின் பக்கத்திற்கு அனுப்பு
                router.push(`/merchant/login?phone=${cleanPhone}`)
            } else {
                // புதிய கடைக்காரர் -> ரெஜிஸ்டர் பக்கத்திற்கு அனுப்பு
                router.push(`/merchant/register?phone=${cleanPhone}`)
            }
        } catch (err: any) {
            console.error(err)
            setError('ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-[#FF6B00]">
            <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-xl font-black text-[#FF6B00] tracking-wider">RETCASH</h1>
                    <h2 className="text-sm font-bold text-white">Merchant Portal Access</h2>
                    <p className="text-xs text-gray-400">உங்களது மொபைல் எண்ணை உள்ளிட்டுத் தொடரவும்</p>
                </div>

                <form onSubmit={handleCheckMerchant} className="space-y-4">
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">
                            Mobile Number
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 0771234567"
                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2.5 text-sm text-white outline-none transition font-mono"
                            required
                        />
                    </div>

                    {error && <p className="text-[11px] text-red-500 font-medium text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-2.5 rounded-xl text-sm transition shadow-lg active:scale-95 flex items-center justify-center"
                    >
                        {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'Continue →'}
                    </button>
                </form>
            </div>
        </div>
    )
}