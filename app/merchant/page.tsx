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

    const [merchantSession, setMerchantSession] = useState<any>(null)
    const [customerPhone, setCustomerPhone] = useState('')
    const [billAmount, setBillAmount] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

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
            setError('Please enter a valid mobile number')
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
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

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
                        await scanner.stop()
                        setIsScanning(false)
                        processScannedResult(decodedText)
                    },
                    (errorMessage) => {
                        // Ignore scanning frame errors
                    }
                )
            } catch (err) {
                console.error("Camera start error:", err)
                alert("Failed to start camera or permission denied.")
                setIsScanning(false)
            }
        }, 100)
    }

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
                alert("Invalid QR Code or does not belong to this store.")
                setScannedClaimData(null)
                return
            }

            setScannedClaimData(data)
        } catch (err) {
            console.error(err)
            alert("Error verifying QR code.")
        } finally {
            setActionLoading(false)
        }
    }

    const handleRedeemScannedReward = async () => {
        if (!scannedClaimData) return

        if (!confirm(`Have you handed over the reward to customer (Phone: ${scannedClaimData.customer_phone})? The reward balance of Rs. ${scannedClaimData.claimable_amount} will be reset to zero.`)) {
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

            alert("🎉 Reward successfully redeemed! Balance cleared and QR code will now disappear from the customer card.")
            setScannedClaimData(null)
        } catch (err) {
            console.error(err)
            alert("Failed to process redemption.")
        } finally {
            setActionLoading(false)
        }
    }

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
                alert("Merchant session not found. Please log in again.");
                setActionLoading(false);
                return;
            }

            const { data: existingClaims } = await supabase
                .from('cashback_claims')
                .select('id, visit_count, claimable_amount, status')
                .eq('store_id', storeId)
                .eq('customer_phone', cleanCustPhone)
                .maybeSingle();

            let newVisitCount = 1;
            let totalClaimable = cashbackAmount;

            if (existingClaims) {
                // 6 விசிட்கள் முடிந்து ரீடீம் செய்யப்பட்டிருந்தால், அடுத்த சைக்கிள் 1-லிருந்து ஆரம்பிக்கப்படும்
                if (existingClaims.visit_count >= 6 && existingClaims.status === 'REDEEMED') {
                    newVisitCount = 1;
                    totalClaimable = cashbackAmount;
                } else {
                    newVisitCount = (existingClaims.visit_count || 0) + 1;
                    totalClaimable = Number(existingClaims.claimable_amount || 0) + cashbackAmount;
                }
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
                throw new Error("Database error during save");
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

                    <div className="bg-[#0B0E14] p-4 rounded-2xl border border-gray-800 space-y-3 text-center">
                        <h2 className="text-xs font-bold text-[#FF6B00] uppercase text-left">📷 Live QR Scanner</h2>
                        <p className="text-[10px] text-gray-400 text-left">Scan the customer's 6th visit QR code using the camera below:</p>

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
                                        {actionLoading ? 'Processing...' : '🎁 Redeem Reward & Clear Cashback'}
                                    </button>
                                ) : (
                                    <p className="text-gray-400 text-[11px] italic">Reward already redeemed for this customer (Balance Rs. 0).</p>
                                )}
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-800" />

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
                            {actionLoading ? 'Processing...' : 'Add Cashback & Send WhatsApp'}
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