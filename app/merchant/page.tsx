'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Html5Qrcode } from 'html5-qrcode'

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

    // ─── QR ஸ்கேன் மற்றும் ரிடீம் செய்வதற்கான ஸ்டேட்கள் ───
    const [scannedClaimData, setScannedClaimData] = useState<any>(null)
    const [isScanning, setIsScanning] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)

    useEffect(() => {
        const savedMerchant = localStorage.getItem('retcash_merchant')
        if (savedMerchant) {
            try {
                setMerchantSession(JSON.parse(savedMerchant))
            } catch (e) {
                console.error(e)
            }
        }

        // Cleanup scanner on unmount
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error(err))
            }
        }
    }, [])

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

            const cleanPhone = formatPhoneNumber(phone)

            const { data: storeData } = await supabase
                .from('stores')
                .select('id, phone_number')
                .eq('phone_number', cleanPhone)
                .maybeSingle()

            if (storeData) {
                router.push(`/merchant/login?phone=${cleanPhone}`)
                return
            }

            router.push(`/merchant/register?phone=${cleanPhone}`)

        } catch (err: any) {
            console.error(err)
            setError('ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.')
        } finally {
            setLoading(false)
        }
    }

    // ─── லைவ் QR கேமரா ஸ்கேனரைத் தொடங்குதல் ───
    const startScanner = async () => {
        setIsScanning(true)
        setScannedClaimData(null)

        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("reader")
                scannerRef.current = scanner

                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    async (decodedText) => {
                        // QR ஸ்கேன் வெற்றிகரமாக ஆனவுடன் கேமராவை நிறுத்துதல்
                        await scanner.stop()
                        setIsScanning(false)
                        processScannedResult(decodedText)
                    },
                    (errorMessage) => {
                        // ஸ்கேன் செய்யும் போது வரும் சாதாரண பிழைகளைப் புறக்கணிக்கலாம்
                    }
                )
            } catch (err) {
                console.error("Camera start error:", err)
                alert("கேமராவைத் தொடங்குவதில் பிழை அல்லது அனுமதி மறுக்கப்பட்டுள்ளது.")
                setIsScanning(false)
            }
        }, 100)
    }

    // ─── ஸ்கேன் செய்யப்பட்ட லிங்க் அல்லது ஐடியைச் சரிபார்த்து டேட்டா எடுப்பது ───
    const processScannedResult = async (inputVal: string) => {
        if (!inputVal) return

        try {
            setActionLoading(true)
            let claimId = inputVal.trim()
            if (claimId.includes('/card/')) {
                const parts = claimId.split('/card/')
                claimId = parts[parts.length - 1].split('?')[0]
            }

            const { data, error } = await supabase
                .from('cashback_claims')
                .select('*')
                .eq('id', claimId)
                .eq('store_id', merchantSession?.id)
                .maybeSingle()

            if (error || !data) {
                alert("தவறான QR கோடு அல்லது இந்த கடைக்குரியது அல்ல.")
                setScannedClaimData(null)
                return
            }

            setScannedClaimData(data)
        } catch (err) {
            console.error(err)
            alert("QR கோடைச் சரிபார்ப்பதில் பிழை.")
        } finally {
            setActionLoading(false)
        }
    }

    // ─── பரிசை உறுதி செய்து கேஷ்பேக்கை பூஜ்ஜியம் ஆக்குதல் (Redeem & Clear) ───
    const handleRedeemScannedReward = async () => {
        if (!scannedClaimData) return

        if (!confirm(`இந்த வாடிக்கையாளரின் (Phone: ${scannedClaimData.customer_phone}) பரிசை வழங்கிவிட்டீர்களா? கேஷ்பேக் தொகை ரூ. ${scannedClaimData.claimable_amount} பூஜ்ஜியம் ஆகும்.`)) {
            return
        }

        setActionLoading(true)
        try {
            const { error } = await supabase
                .from('cashback_claims')
                .update({
                    claimable_amount: 0,
                    status: 'REDEEMED'
                })
                .eq('id', scannedClaimData.id)

            if (error) throw error

            alert("🎉 பரிசு வெற்றிகரமாக வழங்கப்பட்டுவிட்டது! கேஷ்பேக் பூஜ்ஜியமானது மற்றும் கார்டில் உள்ள QR கோடு மறைந்துவிடும்.")
            setScannedClaimData(null)
        } catch (err) {
            console.error(err)
            alert("ரிடீம் செய்வதில் பிழை ஏற்பட்டது.")
        } finally {
            setActionLoading(false)
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
            const cashbackPercentage = merchantSession?.default_cashback_percent || 5;
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

                    {/* ─── உண்மையான லைவ் QR கேமரா ஸ்கேனர் பகுதி ─── */}
                    <div className="bg-[#0B0E14] p-4 rounded-2xl border border-gray-800 space-y-3 text-center">
                        <h2 className="text-xs font-bold text-[#FF6B00] uppercase text-left">📷 Live QR Scanner</h2>
                        <p className="text-[10px] text-gray-400 text-left">வாடிக்கையாளரின் 6வது விசிட் QR கோடை ஸ்கேன் செய்யக் கீழே உள்ள பட்டனை அழுத்தவும்:</p>

                        {!isScanning ? (
                            <button
                                onClick={startScanner}
                                className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>📷 Start Camera Scanner</span>
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div id="reader" className="w-full overflow-hidden rounded-xl border border-gray-700"></div>
                                <button
                                    onClick={async () => {
                                        if (scannerRef.current && scannerRef.current.isScanning) {
                                            await scannerRef.current.stop()
                                        }
                                        setIsScanning(false)
                                    }}
                                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                                >
                                    Stop Camera
                                </button>
                            </div>
                        )}

                        {scannedClaimData && (
                            <div className="mt-3 p-3 bg-gray-900 rounded-xl border border-green-500/30 text-xs space-y-2 text-left">
                                <div className="flex justify-between text-[11px] text-green-400 font-bold">
                                    <span>Valid QR Scanned!</span>
                                    <span>{scannedClaimData.visit_count} / 6 Visits</span>
                                </div>
                                <p className="text-gray-300">Customer: <span className="font-mono text-white">{scannedClaimData.customer_phone}</span></p>
                                <p className="text-gray-300">Reward Balance: <span className="font-bold text-[#FF6B00]">Rs. {scannedClaimData.claimable_amount}</span></p>

                                {Number(scannedClaimData.claimable_amount) > 0 ? (
                                    <button
                                        onClick={handleRedeemScannedReward}
                                        disabled={actionLoading}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-xs mt-2 transition cursor-pointer"
                                    >
                                        {actionLoading ? 'ப்ராசஸ்...' : '🎁 Redeem Reward & Clear Cashback'}
                                    </button>
                                ) : (
                                    <p className="text-gray-400 text-[11px] italic">இந்த வாடிக்கையாளரின் பரிசு ஏற்கனவே வழங்கப்பட்டுவிட்டது (Balance Rs. 0).</p>
                                )}
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-800" />

                    {/* சாதாரண கேஷ்பேக் விசிட் பதிவு செய்யும் பகுதி */}
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