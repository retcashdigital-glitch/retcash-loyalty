'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SingleCardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [claimData, setClaimData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchClaimDetails()
        }

        // Real-time listener to instantly catch store admin scan action
        const channel = supabase
            .channel(`card_status_${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'cashback_claims',
                    filter: `id=eq.${id}`,
                },
                (payload) => {
                    setClaimData(payload.new)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    const fetchClaimDetails = async () => {
        try {
            setLoading(true)

            const { data: claim, error: claimError } = await supabase
                .from('cashback_claims')
                .select(`
          *,
          stores (
            id,
            store_name,
            store_slug,
            logo_url,
            location_url,
            review_url
          )
        `)
                .eq('id', id)
                .maybeSingle()

            if (claimError || !claim) {
                console.error('Error fetching claim:', claimError)
                setClaimData(null)
            } else {
                setClaimData(claim)
            }
        } catch (err) {
            console.error(err)
            setClaimData(null)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]"></div>
            </div>
        )
    }

    if (!claimData) {
        return (
            <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="bg-[#161B26] border border-gray-800 p-6 rounded-3xl max-w-sm w-full">
                    <p className="text-sm font-semibold text-gray-300 mb-2">Card details not found or expired.</p>
                    <p className="text-xs text-gray-500">Please check the link sent to your WhatsApp or try refreshing.</p>
                </div>
            </div>
        )
    }

    const store = claimData.stores
    const customerPhone = claimData.customer_phone || ''
    const currentVisits = claimData.visit_count || 1
    const isRewardReady = currentVisits >= 6
    const isCompleted = claimData.status === 'COMPLETED'

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center p-4 font-sans selection:bg-[#FF6B00]">

            {/* Top Header Navigation Bar with Back Button */}
            <div className="w-full max-w-sm flex items-center justify-between pt-4 pb-4 border-b border-gray-800/80 mb-4">
                {customerPhone ? (
                    <button
                        onClick={() => router.push(`/wallet/${customerPhone}`)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/30 px-3 py-1.5 rounded-xl hover:bg-[#FF6B00]/20 transition active:scale-95 cursor-pointer"
                    >
                        <span>←</span> My All Stores Wallet
                    </button>
                ) : (
                    <div className="text-xs text-gray-500 font-bold">RETCASH PASS</div>
                )}
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Digital Loyalty</span>
            </div>

            <div className="w-full max-w-sm space-y-4">

                {/* Main Loyalty Card */}
                <div className="bg-gradient-to-b from-[#161B26] to-[#0D1117] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="text-[9px] font-bold text-[#FF6B00] uppercase tracking-widest block">RETCASH PARTNER</span>
                            <h1 className="text-xl font-black text-white">{store?.store_name || 'PARTNER STORE'}</h1>
                        </div>
                        <span className="text-[10px] bg-[#FF6B00]/10 border border-[#FF6B00]/40 text-[#FF6B00] px-2.5 py-1 rounded-full font-bold">
                            VIP MEMBER
                        </span>
                    </div>

                    <div className="mb-6">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">STORE CREDIT BALANCE</span>
                        <div className="text-3xl font-black text-white tracking-tight">
                            Rs. {Number(claimData.claimable_amount || 0).toFixed(2)}
                        </div>
                    </div>

                    {/* 6 Visit Challenge Tracker */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold tracking-wider uppercase">
                            <span className="text-gray-400">6 Visit Challenge</span>
                            <span className="text-[#FF6B00]">{currentVisits} / 6 Visits</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {[1, 2, 3, 4, 5, 6].map((step) => (
                                <div
                                    key={step}
                                    className={`h-2 rounded-full transition-all duration-300 ${step <= currentVisits ? 'bg-[#FF6B00] shadow-[0_0_8px_#FF6B00]' : 'bg-gray-800'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dynamic Condition Box with Professional English Copy & Cinematic Animation */}
                <div className="bg-[#161B26] border border-gray-800 rounded-3xl p-6 text-center relative overflow-hidden">
                    <div className="bg-[#0D1117] border border-gray-800 p-3 rounded-2xl mb-4 flex justify-between items-center text-xs">
                        <span className="text-gray-400">TODAY'S CASHBACK</span>
                        <span className="text-[#FF6B00] font-black">+ Rs. {Number(claimData.cashback_amount || 0).toFixed(2)}</span>
                    </div>

                    <div className="relative min-h-[220px] flex items-center justify-center">

                        {/* Success / Vanish Completed Screen with Professional English Subtext */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-out transform ${isCompleted ? 'opacity-100 scale-100 translate-y-0 blur-0' : 'opacity-0 scale-90 translate-y-6 blur-md pointer-events-none'
                            }`}>
                            <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl mb-3 animate-bounce shadow-[0_0_25px_rgba(34,197,94,0.4)]">
                                🎉
                            </div>
                            <h3 className="text-sm font-black text-green-400 uppercase tracking-wider mb-1">REWARD SUCCESSFULLY REDEEMED!</h3>
                            <p className="text-[11px] text-gray-400 px-2 font-medium">
                                Your 6th visit reward has been claimed successfully. Thank you for visiting!
                            </p>
                        </div>

                        {/* QR Code Active Screen */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in transform ${isCompleted ? 'opacity-0 scale-125 -translate-y-8 blur-lg filter grayscale pointer-events-none' : 'opacity-100 scale-100 translate-y-0 blur-0'
                            }`}>
                            {isRewardReady ? (
                                <div className="w-full">
                                    <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/40 text-[#FF6B00] text-xs font-bold py-2 px-3 rounded-xl mb-3">
                                        🎉 Congratulations! Your 6th Visit Reward is ready!
                                    </div>
                                    <p className="text-[11px] text-gray-400 mb-2 font-semibold">Show QR code at billing counter:</p>
                                    <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${id}`}
                                            alt="Redemption QR"
                                            className="w-36 h-36 object-contain"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 px-4 border border-dashed border-gray-800 rounded-2xl bg-[#0D1117] w-full">
                                    <div className="w-12 h-12 bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                                        🎁
                                    </div>
                                    <h3 className="text-sm font-bold text-white mb-1">
                                        {6 - currentVisits} More {6 - currentVisits === 1 ? 'Visit' : 'Visits'} Needed!
                                    </h3>
                                    <p className="text-[11px] text-gray-400">
                                        Redemption QR code will appear automatically on your 6th visit.
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-800/80 mt-4">
                        {store?.location_url ? (
                            <a href={store.location_url} target="_blank" rel="noreferrer" className="py-3 px-3 bg-[#0D1117] border border-gray-800 rounded-xl text-center text-xs text-gray-300 font-bold hover:border-gray-700 transition">
                                📍 LOCATION
                            </a>
                        ) : (
                            <button disabled className="py-3 px-3 bg-[#0D1117]/50 border border-gray-800/30 rounded-xl text-center text-xs text-gray-600 font-bold">
                                📍 LOCATION
                            </button>
                        )}

                        {store?.review_url ? (
                            <a href={store.review_url} target="_blank" rel="noreferrer" className="py-3 px-3 bg-[#0D1117] border border-gray-800 rounded-xl text-center text-xs text-[#FF6B00] font-bold hover:border-[#FF6B00]/40 transition">
                                ⭐ GOOGLE REVIEW
                            </a>
                        ) : (
                            <button disabled className="py-3 px-3 bg-[#0D1117]/50 border border-gray-800/30 rounded-xl text-center text-xs text-gray-600 font-bold">
                                ⭐ GOOGLE REVIEW
                            </button>
                        )}
                    </div>
                </div>

            </div>

            <div className="py-8 text-center text-[10px] text-gray-600 tracking-wider">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM</p>
            </div>

        </div>
    )
}