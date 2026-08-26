'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Scanner } from '@yudiel/react-qr-scanner'
import { supabase } from '@/lib/supabase'

export default function ScanRedeemPage() {
    const router = useRouter()
    const [merchant, setMerchant] = useState<any>(null)
    const [scannedCardId, setScannedCardId] = useState<string | null>(null)
    const [cardDetails, setCardDetails] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        const storedMerchant = localStorage.getItem('retcash_merchant')
        if (!storedMerchant) {
            router.push('/merchant/login')
        } else {
            setMerchant(JSON.parse(storedMerchant))
        }
    }, [router])

    const handleScan = (detectedCodes: any[]) => {
        if (!detectedCodes || detectedCodes.length === 0) return
        const rawValue = detectedCodes[0].rawValue
        if (!rawValue || scannedCardId) return

        let claimId = rawValue.trim()
        if (claimId.includes('/card/')) {
            claimId = claimId.split('/card/')[1].split('?')[0]
        }

        setScannedCardId(claimId)
        fetchScannedCard(claimId)
    }

    const fetchScannedCard = async (claimId: string) => {
        try {
            setLoading(true)
            setMessage('')

            const { data, error } = await supabase
                .from('cashback_claims')
                .select(`
                    *,
                    stores ( store_name )
                `)
                .eq('id', claimId)
                .single()

            if (error || !data) {
                setMessage('Error: Invalid QR Code!')
                setCardDetails(null)
            } else if (data.status === 'COMPLETED') {
                setMessage('⚠️ Warning: This reward QR code has already been redeemed and is no longer valid!')
                setCardDetails(null)
            } else {
                setCardDetails(data)
            }
        } catch (err: any) {
            setMessage('Error fetching card details.')
        } finally {
            setLoading(false)
        }
    }

    const handleRedeemReward = async () => {
        if (!cardDetails) return

        if ((cardDetails.visit_count || 1) < 6) {
            setMessage('Error: This card has not completed 6 visits yet!')
            return
        }

        try {
            setLoading(true)

            const { error } = await supabase
                .from('cashback_claims')
                .update({
                    claimable_amount: 0,
                    status: 'COMPLETED'
                })
                .eq('id', cardDetails.id)

            if (error) throw error

            await supabase
                .from('store_transactions')
                .insert([
                    {
                        customer_phone: cardDetails.customer_phone,
                        store_id: cardDetails.store_id,
                        bill_amount: 0,
                        cashback_amount: -Number(cardDetails.claimable_amount || 0)
                    }
                ])

            setMessage(`Success! Rs. ${Number(cardDetails.claimable_amount).toFixed(2)} successfully redeemed!`)
            setCardDetails(null)
            setScannedCardId(null)
        } catch (err: any) {
            setMessage(`Error: ${err.message || 'Failed to process redemption'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center p-4 font-sans selection:bg-[#FF6B00]">

            {/* Header */}
            <div className="w-full max-w-md flex justify-between items-center py-4 border-b border-gray-800 mb-6">
                <button
                    onClick={() => router.push('/admin')}
                    className="text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/30 px-3 py-1.5 rounded-xl hover:bg-[#FF6B00]/20 transition cursor-pointer"
                >
                    ← Back to Admin
                </button>
                <span className="text-xs font-bold text-gray-400 uppercase">QR REDEEM SCANNER</span>
            </div>

            <div className="w-full max-w-md space-y-4">

                {/* Camera Scanner View */}
                {!cardDetails && (
                    <div className="bg-[#161B26] border border-gray-800 rounded-3xl p-6 text-center">
                        <h2 className="text-sm font-bold text-white mb-2">வாடிக்கையாளரின் QR Code-ஐ Scan செய்யவும்</h2>
                        <p className="text-xs text-gray-400 mb-4">6th Visit Reward-ஐ வழங்க கேமராவை QR Code நோக்கி பிடிக்கவும்.</p>

                        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black aspect-square relative flex items-center justify-center">
                            <Scanner
                                onScan={handleScan}
                                onError={(error) => console.log(error)}
                                constraints={{ facingMode: 'environment' }}
                                styles={{
                                    container: { width: '100%', height: '100%' }
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Display Scanned Details */}
                {loading && (
                    <div className="bg-[#161B26] border border-gray-800 p-8 rounded-3xl text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00] mx-auto mb-2"></div>
                        <p className="text-xs text-gray-400 font-semibold">விவரங்கள் சரிபார்க்கப்படுகின்றன...</p>
                    </div>
                )}

                {cardDetails && !loading && (
                    <div className="bg-[#161B26] border border-[#FF6B00]/40 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-start border-b border-gray-800 pb-4">
                            <div>
                                <span className="text-[10px] text-[#FF6B00] font-bold uppercase tracking-wider block">REDEEM CONFIRMATION</span>
                                <h3 className="text-lg font-black text-white">{cardDetails.stores?.store_name}</h3>
                            </div>
                            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/40 px-2.5 py-1 rounded-full font-bold">
                                Visits: {cardDetails.visit_count}/6
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Customer Phone:</span>
                                <span className="font-bold text-white">+{cardDetails.customer_phone}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Redeemable Balance:</span>
                                <span className="text-lg font-black text-[#FF6B00]">Rs. {Number(cardDetails.claimable_amount).toFixed(2)}</span>
                            </div>
                        </div>

                        {cardDetails.visit_count >= 6 ? (
                            <button
                                onClick={handleRedeemReward}
                                disabled={loading}
                                className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-900/40 transition cursor-pointer"
                            >
                                {loading ? 'Redeeming...' : 'REDEEM REWARD NOW'}
                            </button>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-center text-red-400 text-xs font-bold">
                                ⚠️ 6 வருகைகள் இன்னும் பூர்த்தியாகவில்லை! (தற்போதைய வருகை: {cardDetails.visit_count})
                            </div>
                        )}

                        <button
                            onClick={() => { setCardDetails(null); setScannedCardId(null); }}
                            className="w-full py-2.5 rounded-xl font-bold text-xs text-gray-400 border border-gray-800 hover:bg-gray-800 transition cursor-pointer"
                        >
                            Cancel / Rescan
                        </button>
                    </div>
                )}

                {message && (
                    <div className="p-4 bg-[#161B26] border border-gray-800 rounded-2xl text-center text-xs font-bold text-[#FF6B00]">
                        {message}
                    </div>
                )}

            </div>
        </div>
    )
}