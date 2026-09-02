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
        const savedMerchant = localStorage.getItem('retcash_merchant')
        if (savedMerchant) {
            try {
                setMerchantSession(JSON.parse(savedMerchant))
            } catch (e) {
                console.error(e)
            }
        }
    }, [])

    // ─── ஃபோன் நம்பரை எந்த வடிவத்திலும் அடித்தாலும் 94 சேர்த்து பார்மட் செய்யும் பங்க்ஷன் ───
    const formatPhoneNumber = (inputPhone: string) => {
        let cleaned = inputPhone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        if (!cleaned.startsWith('94')) {
            cleaned = '94' + cleaned;
        }
        return cleaned;
    }

    const handleCheckUser = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!phone || phone.replace(/\D/g, '').length < 8) {
            setError('தயவுசெய்து சரியான மொபைல் எண்ணை உள்ளிடவும்')
            return
        }

        try {
            setLoading(true)
            setError('')

            // எந்த வடிவத்தில் அடித்தாலும் 94 உடன் கூடிய சரியான எண்ணாக மாற்றுதல்
            const cleanPhone = formatPhoneNumber(phone)

            // 1. Check if store exists with this formatted phone number
            const { data: storeData } = await supabase
                .from('stores')
                .select('id, phone_number')
                .eq('phone_number', cleanPhone)
                .maybeSingle()

            if (storeData) {
                // Registered merchant -> Go to login with formatted phone
                router.push(`/merchant/login?phone=${cleanPhone}`)
                return
            }

            // 2. New merchant -> Go to register with formatted phone
            router.push(`/merchant/register?phone=${cleanPhone}`)

        } catch (err: any) {
            console.error(err)
            setError('ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.')
        } finally {
            setLoading(false)
        }
    }

    // ─── வாடிக்கையாளருக்கு கேஷ்பேக் சேர்த்து டேட்டாபேஸில் பதிவு செய்து வாட்ஸ்அப் திறக்கும் லாஜிக் ───
    const handleGenerateCashback = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customerPhone || !billAmount) {
            return
        }

        setActionLoading(true)
        try {
            const cashbackPercentage = merchantSession?.cashback_percentage || 5;
            const billNum = parseFloat(billAmount);
            const cashbackAmount = (billNum * cashbackPercentage) / 100;

            const cleanCustPhone = formatPhoneNumber(customerPhone);
            const storeId = merchantSession?.id;

            if (!storeId) {
                alert("மெர்சண்ட் தகவல் கிடைக்கவில்லை. மீண்டும் லாகின் செய்யவும்.");
                setActionLoading(false);
                return;
            }

            const { data: existingClaims } = await supabase
                .from('cashback_claims')
                .select('id, visit_count, claimable_amount')
                .eq('store_id', storeId)
                .eq('customer_phone', cleanCustPhone)
                .maybeSingle();

            let newVisitCount = 1;
            let totalClaimable = cashbackAmount;

            if (existingClaims) {
                newVisitCount = (existingClaims.visit_count || 0) + 1;
                totalClaimable = Number(existingClaims.claimable_amount || 0) + cashbackAmount;
            }

            const { data: insertedClaim, error: insertError } = await supabase
                .from('cashback_claims')
                .upsert({
                    id: existingClaims?.id,
                    store_id: storeId,
                    customer_phone: cleanCustPhone,
                    bill_amount: billNum,
                    cashback_amount: cashbackAmount,
                    claimable_amount: totalClaimable,
                    visit_count: newVisitCount,
                    status: newVisitCount >= 6 ? 'READY' : 'PENDING'
                }, { onConflict: 'id' })
                .select('id')
                .single();

            if (insertError || !insertedClaim) {
                console.error(insertError);
                throw new Error("ഡேட்டாபேஸில் சேமிப்பதில் பிழை");
            }

            const claimId = insertedClaim.id;
            const baseUrl = window.location.origin;
            const cardLink = `${baseUrl}/card/${claimId}`;
            const storeName = merchantSession?.store_name || 'RETCASH Partner';

            const message = `🎉 *Retcash Rewards!*\n\nYour visit has been recorded successfully. 📍\n\n` +
                `Store: *${storeName}*\n` +
                `Bill Amount: Rs. ${billNum}\n` +
                `Cashback Earned (${cashbackPercentage}%): Rs. ${cashbackAmount}\n` +
                `Visit Count: ${newVisitCount} / 6\n\n` +
                `✨ Keep visiting to unlock your exclusive cashback rewards.\n\n` +
                `👉 Tap below to view your digital card, live balance & cashback details:\n${cardLink}`;

            const whatsappUrl = `https://wa.me/${cleanCustPhone}?text=${encodeURIComponent(message)}`;

            const anchor = document.createElement('a');
            anchor.href = whatsappUrl;
            anchor.target = '_blank';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            setCustomerPhone('');
            setBillAmount('');

        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false)
        }
    }

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

                    <form onSubmit={handleGenerateCashback} className="space-y-4">
                        <div>
                            <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">
                                Customer Phone (WhatsApp)
                            </label>
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="e.g. 0771234567"
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