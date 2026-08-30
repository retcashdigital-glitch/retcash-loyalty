'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconCheck() {
    return (
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 7-4-4-4 4-3 14 3 14" />
            <path d="M16 11h.01" />
            <rect x="2" y="6" width="20" height="14" rx="2" />
        </svg>
    );
}

function IconLocation() {
    return (
        <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true">
            <path d="M10 1C6.134 1 3 4.134 3 8c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="10" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
    );
}

function IconStar() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 1.5l2.4 6.4H18.8l-5.2 3.8 2 6.2L10 14 4.4 17.9l2-6.2-5.2-3.8h6.4z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
        </svg>
    );
}

function IconGift() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="1.5" y="6.5" width="15" height="10" rx="1.5" stroke="white" strokeWidth="1.2" />
            <path d="M1.5 9.5h15" stroke="white" strokeWidth="1.2" />
            <path d="M9 6.5v10" stroke="white" strokeWidth="1.2" />
            <path d="M9 6.5c0 0-2-3.5-4-2.5S7 6.5 9 6.5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M9 6.5c0 0 2-3.5 4-2.5S11 6.5 9 6.5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M9 1.5v2" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function Chip() {
    return (
        <div
            className="w-[34px] h-[26px] rounded-[6px]"
            style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.07) 100%)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)",
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
            <div className="min-h-screen bg-[#f0f2f5] text-[#0d0f14] flex items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#111318]"></div>
            </div>
        )
    }

    if (!claimData) {
        return (
            <div className="min-h-screen bg-[#f0f2f5] text-[#0d0f14] flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="bg-white border border-gray-200 p-6 rounded-3xl max-w-sm w-full shadow-sm">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Card details not found or expired.</p>
                    <p className="text-xs text-gray-500">Please check the link sent to your WhatsApp or try refreshing.</p>
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

    // Initials for Logo Placeholder
    const storeInitials = store?.store_name
        ? store.store_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : 'RC'

    const pctTrack = Math.min(100, Math.max(0, ((currentVisits - 1) / (totalVisits - 1)) * 100))
    const pctReward = Math.min(100, Math.max(0, (currentVisits / totalVisits) * 100))

    return (
        <div className="min-h-screen flex justify-center bg-[#f0f2f5] font-sans">
            <div className="w-full max-w-[390px] flex flex-col pb-6">

                {/* ─── Header ─── */}
                <header className="flex items-center justify-between px-5 pt-10 pb-4">
                    <div className="flex items-center gap-3.5">
                        <div
                            className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center flex-shrink-0"
                            style={{
                                background: "linear-gradient(145deg, #252830 0%, #111318 100%)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.04) inset",
                            }}
                        >
                            <span className="text-white text-[13px] font-bold tracking-wide select-none">
                                {storeInitials}
                            </span>
                        </div>

                        <div>
                            <h1 className="text-[16px] font-semibold text-[#0d0f14] leading-none mb-1">
                                {store?.store_name || 'Partner Store'}
                            </h1>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#b0b5bf]" />
                                <p className="text-[11.5px] text-[#9ca3af] font-medium tracking-wide">
                                    Powered by Retcash
                                </p>
                            </div>
                        </div>
                    </div>

                    {customerPhone && (
                        <button
                            onClick={() => router.push(`/wallet/${customerPhone}`)}
                            aria-label="My Wallet"
                            className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6b7180] transition-colors bg-[#eaedf1] hover:bg-[#e0e4e9]"
                        >
                            <IconWallet />
                        </button>
                    )}
                </header>

                {/* ─── Loyalty Card ─── */}
                <div className="px-5 mb-4">
                    <div
                        className="relative rounded-[26px] overflow-hidden"
                        style={{
                            background: "linear-gradient(150deg, #1f2230 0%, #111420 55%, #0c0e16 100%)",
                            boxShadow: "0 24px 64px -12px rgba(0,0,0,0.50), 0 8px 24px -8px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.04)",
                            padding: "28px 26px 26px",
                        }}
                    >
                        <div
                            className="absolute inset-x-0 top-0 h-px"
                            style={{
                                background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.13) 40%, rgba(255,255,255,0.13) 60%, transparent 95%)",
                            }}
                        />

                        {/* Card Row 1 */}
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <p className="text-[9.5px] font-semibold text-white/40 mb-1 tracking-widest uppercase">
                                    STORE CREDIT
                                </p>
                                <p className="text-[11px] text-white/25 font-medium">{store?.store_name || 'Partner Store'}</p>
                            </div>
                            <Chip />
                        </div>

                        {/* Balance */}
                        <div className="mb-8">
                            <p className="text-white font-bold leading-none text-[48px] tracking-tight">
                                Rs.&thinsp;{Number(claimData.claimable_amount || 0).toFixed(2)}
                            </p>
                            <p className="text-white/40 text-[11.5px] mt-[10px] font-medium tracking-wide">
                                Today's Cashback: <span className="text-green-400 font-semibold">+Rs. {Number(claimData.cashback_amount || 0).toFixed(2)}</span>
                            </p>
                        </div>

                        {/* Divider */}
                        <div
                            className="mb-5"
                            style={{ height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))" }}
                        />

                        {/* Card Footer */}
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-white/25 text-[9px] font-semibold mb-1 tracking-widest">
                                    MEMBER
                                </p>
                                <p className="text-white/70 text-[13.5px] font-medium tracking-tight">
                                    VIP PASS
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/25 text-[9px] font-semibold mb-1 tracking-widest">
                                    PASS ID
                                </p>
                                <p className="text-white/45 text-[12px] font-medium font-mono">
                                    •••• {customerPhone.slice(-4) || '0000'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Visit Progress ─── */}
                <div
                    className="mx-5 bg-white rounded-[22px] px-5 pt-5 pb-5 mb-3"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.045)" }}
                >
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-[10px] font-semibold text-[#9ca3af] tracking-widest">
                            VISIT PROGRESS
                        </p>
                        <div className="px-2.5 py-[5px] rounded-full bg-[#f0f2f5]">
                            <span className="text-[11px] font-bold text-[#3c404d]">
                                {currentVisits}
                                <span className="text-[#b0b5bf] font-semibold"> / {totalVisits}</span>
                            </span>
                        </div>
                    </div>

                    {/* Nodes + track */}
                    <div className="relative mb-2.5">
                        <div
                            className="absolute top-5 h-[1.5px]"
                            style={{ left: 20, right: 20, background: "#e8ebf0" }}
                        />
                        <div
                            className="absolute top-5 h-[1.5px] transition-all duration-700"
                            style={{
                                left: 20,
                                width: `calc(${pctTrack}% * (100% - 40px) / 100%)`,
                                background: "#111318",
                            }}
                        />

                        <div className="relative z-10 flex items-center justify-between">
                            {Array.from({ length: totalVisits }).map((_, i) => {
                                const done = i < currentVisits;
                                return (
                                    <div
                                        key={i}
                                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                                        style={
                                            done
                                                ? {
                                                    background: "linear-gradient(145deg, #252830 0%, #111318 100%)",
                                                    boxShadow: "0 3px 10px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.04) inset",
                                                }
                                                : {
                                                    background: "#ffffff",
                                                    border: "1.5px solid #d5d9e0",
                                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                                }
                                        }
                                    >
                                        {done ? (
                                            <IconCheck />
                                        ) : (
                                            <span className="text-[#c0c5ce]">
                                                <IconLock />
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-between mb-4">
                        {Array.from({ length: totalVisits }).map((_, i) => (
                            <div key={i} className="w-10 flex justify-center">
                                <span
                                    className="text-[10px] font-semibold"
                                    style={{ color: i < currentVisits ? "#3c404d" : "#c8ccd5" }}
                                >
                                    {i + 1}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-[#f2f4f7]">
                        <p className="text-[12.5px] text-[#6b7180] font-medium leading-snug">
                            <span className="text-[#0d0f14] font-semibold">{currentVisits} visits</span> completed ·{" "}
                            <span className="text-[#0d0f14] font-semibold">{Math.max(0, totalVisits - currentVisits)} more</span> to unlock your reward
                        </p>
                    </div>
                </div>

                {/* ─── Reward Voucher & QR Section ─── */}
                <div
                    className="mx-5 bg-white rounded-[22px] px-5 pt-5 pb-5 mb-3"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.045)" }}
                >
                    {isCompleted ? (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 bg-green-50 border border-green-200 text-green-500 rounded-full flex items-center justify-center mx-auto text-2xl mb-2">
                                🎉
                            </div>
                            <h3 className="text-sm font-bold text-green-600 mb-1">REWARD SUCCESSFULLY REDEEMED!</h3>
                            <p className="text-[11.5px] text-gray-500 font-medium">
                                Your 6th visit reward has been claimed successfully.
                            </p>
                        </div>
                    ) : isRewardReady ? (
                        <div className="text-center py-2">
                            <div className="bg-[#111318] text-white text-xs font-bold py-2 px-3 rounded-xl mb-3">
                                🎉 Congratulations! Show this QR to redeem reward:
                            </div>
                            <div className="bg-white p-3 rounded-2xl inline-block border border-gray-200 shadow-md">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${id}`}
                                    alt="Redemption QR"
                                    className="w-36 h-36 object-contain"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start gap-3.5 mb-5">
                                <div
                                    className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: "linear-gradient(145deg, #252830 0%, #111318 100%)",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                    }}
                                >
                                    <IconGift />
                                </div>

                                <div className="flex-1 min-w-0 pt-0.5">
                                    <p className="text-[14.5px] font-semibold text-[#0d0f14] leading-tight mb-1">
                                        Unlock Voucher on 6th Visit
                                    </p>
                                    <p className="text-[12px] text-[#9ca3af] font-medium leading-snug">
                                        Complete 6 visits to redeem your reward
                                    </p>
                                </div>

                                <div className="flex-shrink-0 mt-0.5 px-2.5 py-1.5 rounded-full bg-[#f0f2f5]">
                                    <span className="text-[11px] font-bold text-[#6b7180]">
                                        {totalVisits - currentVisits} left
                                    </span>
                                </div>
                            </div>

                            <div className="h-[6px] rounded-full overflow-hidden mb-3 bg-[#eaedf1]">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${pctReward}%`,
                                        background: "linear-gradient(90deg, #252830 0%, #111318 100%)",
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-[10.5px] text-[#c0c5ce] font-medium">Visit 1</p>
                                <div className="px-2.5 py-1 rounded-full bg-[#f5f6f8]">
                                    <span className="text-[10.5px] font-semibold text-[#6b7180]">
                                        {Math.round(pctReward)}% complete
                                    </span>
                                </div>
                                <p className="text-[10.5px] text-[#3c404d] font-semibold">
                                    Visit 6 · 🎁
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* ─── Quick Actions ─── */}
                <div className="mx-5 grid grid-cols-2 gap-3 mb-6">
                    {store?.location_url ? (
                        <a
                            href={store.location_url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex flex-col items-center justify-center gap-2.5 bg-white rounded-[20px] py-4 px-3 transition-all active:scale-[0.97]"
                            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.045)" }}
                        >
                            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[#3c404d] bg-[#f2f4f7] group-hover:bg-[#eaedf1]">
                                <IconLocation />
                            </div>
                            <div className="text-center">
                                <p className="text-[12.5px] font-semibold text-[#0d0f14] leading-tight mb-0.5">
                                    Store Location
                                </p>
                                <p className="text-[10.5px] text-[#9ca3af] font-medium">Get directions</p>
                            </div>
                        </a>
                    ) : (
                        <div
                            className="flex flex-col items-center justify-center gap-2.5 bg-white/60 rounded-[20px] py-4 px-3 opacity-50 cursor-not-allowed"
                            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                        >
                            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-gray-400 bg-gray-100">
                                <IconLocation />
                            </div>
                            <div className="text-center">
                                <p className="text-[12.5px] font-semibold text-gray-400 mb-0.5">Store Location</p>
                                <p className="text-[10.5px] text-gray-400 font-medium">Not available</p>
                            </div>
                        </div>
                    )}

                    {store?.review_url ? (
                        <a
                            href={store.review_url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex flex-col items-center justify-center gap-2.5 bg-white rounded-[20px] py-4 px-3 transition-all active:scale-[0.97]"
                            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.045)" }}
                        >
                            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[#3c404d] bg-[#f2f4f7] group-hover:bg-[#eaedf1]">
                                <IconStar />
                            </div>
                            <div className="text-center">
                                <p className="text-[12.5px] font-semibold text-[#0d0f14] leading-tight mb-0.5">
                                    Google Review
                                </p>
                                <p className="text-[10.5px] text-[#9ca3af] font-medium">Rate your visit</p>
                            </div>
                        </a>
                    ) : (
                        <div
                            className="flex flex-col items-center justify-center gap-2.5 bg-white/60 rounded-[20px] py-4 px-3 opacity-50 cursor-not-allowed"
                            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                        >
                            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-gray-400 bg-gray-100">
                                <IconStar />
                            </div>
                            <div className="text-center">
                                <p className="text-[12.5px] font-semibold text-gray-400 mb-0.5">Google Review</p>
                                <p className="text-[10.5px] text-gray-400 font-medium">Not available</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <div className="py-4 flex flex-col items-center gap-1">
                    <p className="text-[10px] text-[#c8ccd5] font-medium tracking-wide uppercase">
                        Secured by
                    </p>
                    <p className="text-[14px] font-bold text-[#a0a6b0] tracking-tight">
                        Retcash
                    </p>
                </div>

            </div>
        </div>
    )
}