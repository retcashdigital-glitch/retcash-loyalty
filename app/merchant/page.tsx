'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function GlobalEntryPoint() {
    const router = useRouter()
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // ─── லாகின் செய்த மெர்சண்ட் விவரங்கள் மற்றும் கேஷ்பேக் ஃபார்ம் ஸ்டேட்கள் ───
    const [merchantSession, setMerchantSession] = useState<any>(null)
    const [customerPhone, setCustomerPhone] = useState('')
    const [billAmount, setBillAmount] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        // லோக்கல் ஸ்டோரேஜில் மெர்சண்ட் லாகின் செய்துள்ளாரா எனச் சோதித்தல்
        const savedMerchant = localStorage.getItem('retcash_merchant')
        if (savedMerchant) {
            try {
                setMerchantSession(JSON.parse(savedMerchant))
            } catch (e) {
                console.error(e)
            }
        }
    }, [])

    const handleCheckUser = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanPhone = phone.replace(/\D/g, '')

        if (!cleanPhone || cleanPhone.length < 8) {
            setError('தயவுசெய்து சரியான மொபைல் எண்ணை உள்ளிடவும்')
            return
        }

        try {
            setLoading(true)
            setError('')

            // 1. Check if store exists with this phone number
            const { data: storeData } = await supabase
                .from('stores')
                .select('id, phone_number')
                .eq('phone_number', cleanPhone)
                .maybeSingle()

            if (storeData) {
                // Registered merchant -> Go to login
                router.push(`/merchant/login?phone=${cleanPhone}`)
                return
            }

            // 2. New merchant -> Go to register
            router.push(`/merchant/register?phone=${cleanPhone}`)

        } catch (err: any) {
            console.error(err)
            setError('ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.')
        } finally {
            setLoading(false)
        }
    }

    // ─── வாடிக்கையாளருக்கு கேஷ்பேக் சேர்த்து பாப்-அப் இன்றி நேரடியாக வாட்ஸ்அப் திறக்கும் லாஜிக் ───
    const handleGenerateCashback = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customerPhone || !billAmount) {
            return
        }

        setActionLoading(true)
        try {
            const cashbackPercentage = merchantSession?.cashback_percentage || 5; // இயல்புநிலை 5%
            const billNum = parseFloat(billAmount);
            const cashbackAmount = (billNum * cashbackPercentage) / 100;

            const cleanCustPhone = customerPhone.replace(/[^0-9]/g, '');

            // வாட்ஸ்அப் Click to Chat மெசேஜ் உருவாக்கம்
            const storeName = merchantSession?.store_name || 'RETCASH Partner';
            const message = `வணக்கம்! உங்களது ${storeName} வாடிக்கையாளர் பாஸ் மூலமாக ரூ. ${billNum} பில் தொகைக்கு ரூ. ${cashbackAmount} கேஷ்பேக் சேர்க்கப்பட்டுள்ளது.`;

            const whatsappUrl = `https://wa.me/${cleanCustPhone}?text=${encodeURIComponent(message)}`;

            // பாப்-அப் அலர்ட் இல்ல a டேக் மூலம் உடனடியாக வாட்ஸ்அப்பைத் திறத்தல்
            const anchor = document.createElement('a');
            anchor.href = whatsappUrl;
            anchor.target = '_blank';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            // ஃபார்மை மட்டும் உடனடியாக கிளியர் செய்தல்
            setCustomerPhone('');
            setBillAmount('');

        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false)
        }
    }

    // ஒருவேளை மெர்சண்ட் ஏற்கனவே லாகின் செய்திருந்தால், இந்த டேஷ்போர்ட் திரையைக் காண்பித்தல்
    if (merchantSession) {
        return (
            <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center p-4 font-sans selection:bg-[#FF6B00]">
                <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6 mt-6">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                        <div>
                            <span className="text-[10px] text-[#FF6B00] font-black uppercase tracking-wider block">MERCHANT PANEL</span>
                            <h1 className="text-lg font-black text-white">{merchantSession.store_name}</h1>
                        </div>
                        <button
                            onClick={() => {
                                localStorage.removeItem('retcash_merchant');
                                setMerchantSession(null);
                            }}
                            className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-xl font-bold hover:bg-red-500/25 transition cursor-pointer"
                        >
                            LOGOUT
                        </button>
                    </div>

                    {/* கேஷ்பேக் மற்றும் வாட்ஸ்அப் ஃபார்ம் */}
                    <form onSubmit={handleGenerateCashback} className="space-y-4">
                        <div>
                            <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">
                                Customer Phone (WhatsApp)
                            </label>
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="e.g. 94771234567"
                                className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-3 text-sm text-white outline-none transition font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">
                                Bill Amount (Rs.)
                            </label>
                            <input
                                type="number"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                placeholder="e.g. 2500"
                                className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-3 text-sm text-white outline-none transition font-mono"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg active:scale-95 flex items-center justify-center cursor-pointer"
                        >
                            {actionLoading ? 'பிராசஸ் செய்யப்படுகிறது...' : 'கேஷ்பேக் சேர்த்து வாட்ஸ்அப் அனுப்புக'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-[#FF6B00]">
            <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-black text-[#FF6B00] tracking-wider">RETCASH</h1>
                    <p className="text-xs text-gray-400">Enter your mobile number to continue</p>
                </div>

                <form onSubmit={handleCheckUser} className="space-y-4">
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">
                            Mobile Number
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 0771234567"
                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-3 text-sm text-white outline-none transition font-mono"
                            required
                        />
                    </div>

                    {error && <p className="text-[11px] text-red-500 font-medium text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-3 rounded-xl text-sm transition shadow-lg active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                        {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'CONTINUE →'}
                    </button>
                </form>
            </div>
        </div>
    )
}