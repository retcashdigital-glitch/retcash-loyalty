'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconCheck() {
    return (
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconLock() {
    return (
        <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
            <rect x="0.9" y="5.4" width="9.2" height="6.8" rx="2" stroke="currentColor" strokeWidth="1.25" />
            <path d="M3 5.4V3.8a2.5 2.5 0 015 0v1.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
    );
}

function IconWallet() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 7-4-4-4 4-3 14 3 14" />
            <path d="M16 11h.01" />
            <rect x="2" y="6" width="20" height="14" rx="2" />
        </svg>
    );
}

function IconLocation() {
    return (
        <svg width="18" height="20" viewBox="0 0 20 22" fill="none" aria-hidden="true">
            <path d="M10 1C6.134 1 3 4.134 3 8c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="10" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

function IconStar() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 1.5l2.4 6.4H18.8l-5.2 3.8 2 6.2L10 14 4.4 17.9l2-6.2-5.2-3.8h6.4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

function IconGift() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="1.5" y="6.5" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M1.5 9.5h15" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9 6.5v10" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9 6.5c0 0-2-3.5-4-2.5S7 6.5 9 6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M9 6.5c0 0 2-3.5 4-2.5S11 6.5 9 6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
    );
}

function Chip() {
    return (
        <div
            className="w-[34px] h-[25px] rounded-[6px]"
            style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)",
                border: "1px solid rgba(255,255,255,0.5)",
            }}
        />
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SingleCardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [claimData, setClaimData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchClaimDetails()
        }

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
                setClaimData(null)
            } else {
                setClaimData(claim)
            }
        } catch (err) {
            setClaimData(null)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#EE8838]"></div>
            </div>
        )
    }

    if (!claimData) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-sm w-full shadow-md">
                    <p className="text-sm font-semibold text-[#0F172A] mb-2">Card details not found or expired.</p>
                    <p className="text-xs text-slate-500">Please check the link sent to your WhatsApp or try refreshing.</p>
                </div>
            </div>
        )
    }

    const store = claimData.stores
    const customerPhone = claimData.customer_phone || ''
    const currentVisits = claimData.visit_count || 1
    const totalVisits = 6
    const isRewardReady = currentVisits >= totalVisits
    const isCompleted = claimData.status === 'COMPLETED'

    const storeInitials = store?.store_name
        ? store.store_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : 'RC'

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center p-4 font-sans selection:bg-[#EE8838]">

            {/* Top Header Navigation Bar */}
            <div className="w-full max-w-sm flex items-center justify-between pt-3 pb-3 border-b border-slate-200 mb-4">
                {customerPhone ? (
                    <button
                        onClick={() => router.push(`/wallet/${customerPhone}`)}
                        className="flex items-center gap-2 text-xs font-bold text-[#EE8838] bg-[#EE8838]/10 border border-[#EE8838]/20 px-3 py-1.5 rounded-xl hover:bg-[#EE8838]/20 transition active:scale-95 cursor-pointer"
                    >
                        <IconWallet />
                        <span>My All Stores Wallet</span>
                    </button>
                ) : (
                    <div className="text-xs text-slate-400 font-bold tracking-wider">RETCASH PASS</div>
                )}
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Digital Loyalty</span>
            </div>

            <div className="w-full max-w-sm space-y-4">

                {/* Main Loyalty Pass Card */}
                <div
                    className="relative rounded-3xl p-6 shadow-xl overflow-hidden text-white"
                    style={{
                        background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
                        boxShadow: "0 20px 30px -10px rgba(15, 23, 42, 0.15)"
                    }}
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-[#EE8838] text-sm">
                                {storeInitials}
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-[#EE8838] uppercase tracking-widest block">RETCASH PARTNER</span>
                                <h1 className="text-lg font-black text-white leading-tight">{store?.store_name || 'PARTNER STORE'}</h1>
                            </div>
                        </div>
                        <Chip />
                    </div>

                    <div className="mb-6">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">STORE CREDIT BALANCE</span>
                        <div className="text-3xl font-black text-white tracking-tight">
                            Rs. {Number(claimData.claimable_amount || 0).toFixed(2)}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px]">
                        <div>
                            <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider">MEMBER PASS</span>
                            <span className="text-white font-medium">VIP MEMBER</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider">PASS ID</span>
                            <span className="text-slate-300 font-mono">•••• {customerPhone.slice(-4) || '0000'}</span>
                        </div>
                    </div>
                </div>

                {/* Dynamic Condition & Challenge Box */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 text-center relative overflow-hidden shadow-sm">

                    {/* Today's Cashback Banner */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl mb-5 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">TODAY'S CASHBACK</span>
                        <span className="text-[#EE8838] font-black">+ Rs. {Number(claimData.cashback_amount || 0).toFixed(2)}</span>
                    </div>

                    {/* 6 Visit Challenge Tracker */}
                    <div className="mb-6">
                        <div className="flex justify-between text-[11px] font-bold tracking-wider uppercase mb-3">
                            <span className="text-slate-500">6 Visit Challenge</span>
                            <span className="text-[#EE8838]">{currentVisits} / {totalVisits} Visits</span>
                        </div>

                        <div className="grid grid-cols-6 gap-2">
                            {Array.from({ length: totalVisits }).map((_, i) => {
                                const step = i + 1;
                                const done = step <= currentVisits;
                                return (
                                    <div
                                        key={step}
                                        className={`h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${done
                                            ? 'bg-[#EE8838] text-white shadow-md shadow-orange-500/20'
                                            : 'bg-slate-100 border border-slate-200 text-slate-400'
                                            }`}
                                    >
                                        {done ? <IconCheck /> : <span className="scale-75"><IconLock /></span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Interactive QR / Reward Area */}
                    <div className="relative min-h-[210px] flex items-center justify-center">

                        {/* Success Screen */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-out transform ${isCompleted ? 'opacity-100 scale-100 translate-y-0 blur-0' : 'opacity-0 scale-90 translate-y-6 blur-md pointer-events-none'
                            }`}>
                            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-3 animate-bounce shadow-sm">
                                🎉
                            </div>
                            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-1">REWARD SUCCESSFULLY REDEEMED!</h3>
                            <p className="text-[11px] text-slate-500 px-2 font-medium">
                                Your 6th visit reward has been claimed successfully. Thank you for visiting!
                            </p>
                        </div>

                        {/* Active QR Code / Pending Screen */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in transform ${isCompleted ? 'opacity-0 scale-125 -translate-y-8 blur-lg pointer-events-none' : 'opacity-100 scale-100 translate-y-0 blur-0'
                            }`}>
                            {isRewardReady ? (
                                <div className="w-full">
                                    <div className="bg-[#EE8838]/10 border border-[#EE8838]/30 text-[#EE8838] text-xs font-bold py-2 px-3 rounded-xl mb-3">
                                        🎉 Congratulations! Your 6th Visit Reward is ready!
                                    </div>
                                    <p className="text-[11px] text-slate-500 mb-2 font-semibold">Show QR code at billing counter:</p>
                                    <div className="bg-white p-3 rounded-2xl inline-block shadow-md border border-slate-200">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${id}`}
                                            alt="Redemption QR"
                                            className="w-36 h-36 object-contain"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-5 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50 w-full">
                                    <div className="w-10 h-10 bg-[#EE8838]/10 border border-[#EE8838]/30 text-[#EE8838] rounded-full flex items-center justify-center mx-auto mb-2 text-base">
                                        <IconGift />
                                    </div>
                                    <h3 className="text-xs font-bold text-[#0F172A] mb-1">
                                        {totalVisits - currentVisits} More {totalVisits - currentVisits === 1 ? 'Visit' : 'Visits'} Needed!
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Redemption QR code will appear automatically on your 6th visit.
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 mt-4">
                        {store?.location_url ? (
                            <a
                                href={store.location_url}
                                target="_blank"
                                rel="noreferrer"
                                className="py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-[#0F172A] font-bold hover:border-[#EE8838] transition flex items-center justify-center gap-2"
                            >
                                <IconLocation />
                                <span>LOCATION</span>
                            </a>
                        ) : (
                            <button disabled className="py-3 px-3 bg-slate-100 border border-slate-200 rounded-xl text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                                <IconLocation />
                                <span>LOCATION</span>
                            </button>
                        )}

                        {store?.review_url ? (
                            <a
                                href={store.review_url}
                                target="_blank"
                                rel="noreferrer"
                                className="py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-[#EE8838] font-bold hover:border-[#EE8838] transition flex items-center justify-center gap-2"
                            >
                                <IconStar />
                                <span>REVIEW</span>
                            </a>
                        ) : (
                            <button disabled className="py-3 px-3 bg-slate-100 border border-slate-200 rounded-xl text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                                <IconStar />
                                <span>REVIEW</span>
                            </button>
                        )}
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="py-8 text-center text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                <p>©️ RETCASH DIGITAL LOYALTY PLATFORM</p>
            </div>

        </div>
    )
}