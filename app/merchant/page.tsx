'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'

export const dynamic = 'force-dynamic'

interface MerchantSession {
    id: string
    store_name: string
    default_cashback_percent?: number
    target_visits?: number
}

interface CashbackClaim {
    id: string
    customer_phone: string
    claimable_amount: number
    visit_count: number
    status: string
}

interface Offer {
    id: string
    title: string
    description: string
    image_url: string
    expires_at: string
    created_at: string
}

export default function GlobalEntryPoint() {
    const router = useRouter()
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [merchantSession, setMerchantSession] = useState<MerchantSession | null>(null)
    const [customerPhone, setCustomerPhone] = useState('')
    const [billAmount, setBillAmount] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    // Target Visits setting state
    const [targetVisitsInput, setTargetVisitsInput] = useState('6')
    const [settingLoading, setSettingLoading] = useState(false)
    const [successMsg, setSuccessMsg] = useState(false)

    // QR Scanner State
    const [scannedClaimData, setScannedClaimData] = useState<CashbackClaim | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)

    // OFFERS MANAGEMENT STATE
    const [offers, setOffers] = useState<Offer[]>([])
    const [offerTitle, setOfferTitle] = useState('')
    const [offerDesc, setOfferDesc] = useState('')
    const [offerExpiry, setOfferExpiry] = useState('')
    const [offerImage, setOfferImage] = useState<File | null>(null)
    const [offerUploading, setOfferUploading] = useState(false)
    const [offerStatusMsg, setOfferStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        const savedMerchant = localStorage.getItem('retcash_merchant')
        if (savedMerchant) {
            try {
                const parsed: MerchantSession = JSON.parse(savedMerchant)
                setMerchantSession(parsed)
                setTargetVisitsInput(String(Math.min(parsed.target_visits || 6, 10)))
                fetchStoreOffers(parsed.id)
            } catch (e) {
                console.error(e)
            }
        }

        return () => {
            stopScannerInstance()
        }
    }, [])

    // Fetch non-expired offers only
    const fetchStoreOffers = async (storeId: string) => {
        try {
            const now = new Date().toISOString()
            const { data, error } = await supabase
                .from('store_offers')
                .select('*')
                .eq('store_id', storeId)
                .gte('expires_at', now) // Exclude expired offers
                .order('created_at', { ascending: false })

            if (!error && data) {
                setOffers(data)
            }
        } catch (err) {
            console.error('Error fetching offers:', err)
        }
    }

    const stopScannerInstance = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
                    await scannerRef.current.stop()
                }
            } catch (err) {
                console.error('Failed to stop scanner:', err)
            }
        }
    }

    const formatPhoneNumber = (inputPhone: string) => {
        let cleaned = inputPhone.replace(/\D/g, '')
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1)
        }
        if (!cleaned.startsWith('94')) {
            cleaned = '94' + cleaned
        }
        return cleaned
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

        } catch (err: unknown) {
            console.error(err)
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleTargetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        if (val === '') {
            setTargetVisitsInput('')
            return
        }
        let num = parseInt(val, 10)
        if (!isNaN(num)) {
            if (num > 10) num = 10
            setTargetVisitsInput(String(num))
        }
    }

    const handleUpdateTargetVisits = async (e: React.FormEvent) => {
        e.preventDefault()
        let newTarget = parseInt(targetVisitsInput, 10)

        if (isNaN(newTarget) || newTarget < 3) {
            alert('Target visits must be at least 3.')
            return
        }

        newTarget = Math.min(newTarget, 10)
        setTargetVisitsInput(String(newTarget))

        if (!merchantSession?.id) return

        setSettingLoading(true)
        try {
            const { error } = await supabase
                .from('stores')
                .update({ target_visits: newTarget })
                .eq('id', merchantSession.id)

            if (error) throw error

            const updatedSession = { ...merchantSession, target_visits: newTarget }
            setMerchantSession(updatedSession)
            localStorage.setItem('retcash_merchant', JSON.stringify(updatedSession))

            setSuccessMsg(true)
            setTimeout(() => setSuccessMsg(false), 3000)
        } catch (err: unknown) {
            console.error(err)
            const message = err instanceof Error ? err.message : JSON.stringify(err)
            alert('Failed to update target visits: ' + message)
        } finally {
            setSettingLoading(false)
        }
    }

    // OFFER POSTER UPLOAD HANDLER WITH EXPIRY
    const handleAddOffer = async (e: React.FormEvent) => {
        e.preventDefault()
        setOfferStatusMsg(null)

        if (!offerTitle || !offerImage || !offerExpiry || !merchantSession?.id) {
            setOfferStatusMsg({ type: 'error', text: 'Please fill title, expiry date, and image.' })
            return
        }

        setOfferUploading(true)
        try {
            // 1. Upload Poster Image to Supabase Storage
            const fileExt = offerImage.name.split('.').pop()
            const fileName = `${merchantSession.id}_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('offer-posters')
                .upload(filePath, offerImage)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: urlData } = supabase.storage
                .from('offer-posters')
                .getPublicUrl(filePath)

            const publicUrl = urlData.publicUrl

            // 3. Save Offer details to store_offers DB
            const { error: dbError } = await supabase
                .from('store_offers')
                .insert({
                    store_id: merchantSession.id,
                    title: offerTitle,
                    description: offerDesc,
                    image_url: publicUrl,
                    expires_at: new Date(offerExpiry).toISOString(),
                    is_active: true
                })

            if (dbError) throw dbError

            setOfferStatusMsg({ type: 'success', text: '🎉 Offer posted successfully!' })
            setOfferTitle('')
            setOfferDesc('')
            setOfferExpiry('')
            setOfferImage(null)
            fetchStoreOffers(merchantSession.id)

        } catch (err: unknown) {
            console.error(err)
            const message = err instanceof Error ? err.message : 'Database or Network Error'
            setOfferStatusMsg({ type: 'error', text: 'Failed: ' + message })
        } finally {
            setOfferUploading(false)
        }
    }

    const handleDeleteOffer = async (offerId: string) => {
        if (!confirm('Are you sure you want to delete this offer?')) return

        try {
            const { error } = await supabase.from('store_offers').delete().eq('id', offerId)
            if (error) throw error
            setOffers(offers.filter(o => o.id !== offerId))
        } catch (err) {
            console.error(err)
            alert('Failed to delete offer.')
        }
    }

    const startScanner = async () => {
        setIsScanning(true)
        setScannedClaimData(null)

        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode('reader')
                scannerRef.current = scanner

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    async (decodedText) => {
                        await stopScannerInstance()
                        setIsScanning(false)
                        processScannedResult(decodedText)
                    },
                    () => {}
                )
            } catch (err) {
                console.error('Camera start error:', err)
                alert('Failed to start camera or permission denied.')
                setIsScanning(false)
            }
        }, 100)
    }

    const processScannedResult = async (inputVal: string) => {
        if (!inputVal || !merchantSession?.id) return

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
                .eq('store_id', merchantSession.id)
                .maybeSingle()

            if (error || !data) {
                alert('Invalid QR Code or does not belong to this store.')
                setScannedClaimData(null)
                return
            }

            setScannedClaimData(data)
        } catch (err) {
            console.error(err)
            alert('Error verifying QR code.')
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
                    status: 'REDEEMED',
                })
                .eq('id', scannedClaimData.id)

            if (error) throw error

            alert('🎉 Reward successfully redeemed! Balance cleared.')
            setScannedClaimData(null)
        } catch (err) {
            console.error(err)
            alert('Failed to process redemption.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleGenerateCashback = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customerPhone || !billAmount) return

        setActionLoading(true)
        try {
            const cashbackPercentage = merchantSession?.default_cashback_percent || 5
            const targetVisits = Math.min(merchantSession?.target_visits || 6, 10)

            const billNum = parseFloat(billAmount)
            const cashbackAmount = Math.round(((billNum * cashbackPercentage) / 100) * 100) / 100

            const cleanCustPhone = formatPhoneNumber(customerPhone)
            const storeId = merchantSession?.id

            if (!storeId) {
                alert('Merchant session not found. Please log in again.')
                setActionLoading(false)
                return
            }

            const { data: existingClaims } = await supabase
                .from('cashback_claims')
                .select('id, visit_count, claimable_amount, status')
                .eq('store_id', storeId)
                .eq('customer_phone', cleanCustPhone)
                .neq('status', 'REDEEMED')
                .maybeSingle()

            let newVisitCount = 1
            let totalClaimable = cashbackAmount
            let claimId: string | undefined = undefined

            if (existingClaims) {
                const currentVisits = existingClaims.visit_count || 1
                newVisitCount = currentVisits >= targetVisits ? targetVisits : currentVisits + 1
                totalClaimable = Math.round((Number(existingClaims.claimable_amount || 0) + cashbackAmount) * 100) / 100
                claimId = existingClaims.id
            }

            interface Payload {
                id?: string
                store_id: string
                customer_phone: string
                bill_amount: number
                cashback_amount: number
                claimable_amount: number
                visit_count: number
                status: string
            }

            const payload: Payload = {
                store_id: storeId,
                customer_phone: cleanCustPhone,
                bill_amount: billNum,
                cashback_amount: cashbackAmount,
                claimable_amount: totalClaimable,
                visit_count: newVisitCount,
                status: newVisitCount >= targetVisits ? 'READY' : 'PENDING',
            }

            if (claimId) {
                payload.id = claimId
            }

            const { data: upsertedData, error: upsertError } = await supabase
                .from('cashback_claims')
                .upsert(payload, { onConflict: 'store_id, customer_phone' })
                .select('id')
                .single()

            if (upsertError) throw upsertError
            if (upsertedData && upsertedData.id) {
                claimId = upsertedData.id
            }

            const baseUrl = window.location.origin
            const cardLink = `${baseUrl}/card/${claimId}`
            const storeName = merchantSession?.store_name || 'RETCASH Partner'

            const message = `🎉 *Retcash Rewards!*\n\nYour visit has been recorded successfully. 📍\n\n` +
                `Store: *${storeName}*\n` +
                `Bill Amount: Rs. ${billNum}\n` +
                `Cashback Earned (${cashbackPercentage}%): Rs. ${cashbackAmount}\n` +
                `Visit Count: ${newVisitCount} / ${targetVisits}\n\n` +
                `✨ Keep visiting to unlock your exclusive cashback rewards.\n\n` +
                `👉 Tap below to view your digital card, live balance & cashback details:\n${cardLink}`

            const whatsappUrl = `https://wa.me/${cleanCustPhone}?text=${encodeURIComponent(message)}`

            setCustomerPhone('')
            setBillAmount('')
            setActionLoading(false)

            const opened = window.open(whatsappUrl, '_blank')
            if (!opened) {
                window.location.href = whatsappUrl
            }

        } catch (err: unknown) {
            console.error(err)
            const message = err instanceof Error ? err.message : JSON.stringify(err)
            alert('Error processing cashback: ' + message)
            setActionLoading(false)
        }
    }

    if (merchantSession) {
        const targetVisits = Math.min(merchantSession?.target_visits || 6, 10)

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
                                localStorage.removeItem('retcash_merchant')
                                setMerchantSession(null)
                            }}
                            className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-xl font-bold hover:bg-red-500/25 transition cursor-pointer"
                        >
                            LOGOUT
                        </button>
                    </div>

                    {/* NEW OFFER POSTING SECTION */}
                    <div className="bg-[#0B0E14] p-4 rounded-2xl border border-gray-800 space-y-3">
                        <h2 className="text-xs font-bold text-[#FF6B00] uppercase">📢 Post Store Offer / Poster</h2>
                        
                        {offerStatusMsg && (
                            <div className={`p-3 rounded-xl text-xs font-semibold ${offerStatusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                {offerStatusMsg.text}
                            </div>
                        )}

                        <form onSubmit={handleAddOffer} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Offer Title (e.g. 20% Off Weekend Sale)"
                                value={offerTitle}
                                onChange={(e) => setOfferTitle(e.target.value)}
                                className="w-full bg-[#161B26] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs text-white outline-none"
                                required
                            />
                            <textarea
                                placeholder="Description / Conditions (Optional)"
                                value={offerDesc}
                                onChange={(e) => setOfferDesc(e.target.value)}
                                className="w-full bg-[#161B26] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs text-white outline-none h-16"
                            />
                            
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Offer Expiry Date & Time:</label>
                                <input
                                    type="datetime-local"
                                    value={offerExpiry}
                                    onChange={(e) => setOfferExpiry(e.target.value)}
                                    className="w-full bg-[#161B26] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs text-white outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Select Offer Poster Image:</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setOfferImage(e.target.files?.[0] || null)}
                                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-[#FF6B00]"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={offerUploading}
                                className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                            >
                                {offerUploading ? 'Uploading Poster...' : '🚀 Publish Offer'}
                            </button>
                        </form>

                        {/* ACTIVE OFFERS DISPLAY */}
                        {offers.length > 0 && (
                            <div className="mt-4 border-t border-gray-800 pt-3 space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Active Offers ({offers.length}):</span>
                                {offers.map((offer) => (
                                    <div key={offer.id} className="flex items-center gap-3 bg-[#161B26] p-2 rounded-xl border border-gray-800">
                                        <img src={offer.image_url} alt={offer.title} className="w-10 h-10 object-cover rounded-lg" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{offer.title}</p>
                                            <p className="text-[10px] text-gray-400 truncate">Ends: {new Date(offer.expires_at).toLocaleDateString()}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteOffer(offer.id)}
                                            className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* TARGET VISITS SETTINGS */}
                    <div className="bg-[#0B0E14] p-4 rounded-2xl border border-gray-800 space-y-3">
                        <h2 className="text-xs font-bold text-[#FF6B00] uppercase">⚙️ Target Visits Settings</h2>
                        <form onSubmit={handleUpdateTargetVisits} className="flex gap-2 items-center">
                            <input
                                type="number"
                                min="3"
                                max="10"
                                value={targetVisitsInput}
                                onChange={handleTargetInputChange}
                                className="w-20 bg-[#161B26] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm text-white outline-none font-mono text-center"
                                required
                            />
                            <button
                                type="submit"
                                disabled={settingLoading}
                                className="flex-1 bg-gray-800 hover:bg-[#FF6B00] text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                            >
                                {settingLoading ? 'Saving...' : 'Update Target'}
                            </button>
                        </form>
                        {successMsg && (
                            <p className="text-[11px] text-emerald-400 font-semibold animate-pulse mt-1">
                                ✓ Target visits updated successfully!
                            </p>
                        )}
                    </div>

                    {/* LIVE QR SCANNER */}
                    <div className="bg-[#0B0E14] p-4 rounded-2xl border border-gray-800 space-y-3 text-center">
                        <h2 className="text-xs font-bold text-[#FF6B00] uppercase text-left">📷 Live QR Scanner</h2>

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
                                        await stopScannerInstance()
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
                                    <span>{scannedClaimData.visit_count} / {targetVisits} Visits</span>
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

                    {/* CASHBACK ENTRY FORM */}
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
                                className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-3 text-sm text-white outline-none font-mono"
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
                                className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-3 text-sm text-white outline-none font-mono"
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
                            className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-3 text-sm text-white outline-none font-mono"
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