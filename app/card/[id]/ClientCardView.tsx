'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function IconCheck() {
    return (
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="12" rx="2" />
            <path d="M12 8v12" />
            <path d="M12 8H7.5a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8z" />
            <path d="M12 8h4.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8z" />
        </svg>
    );
}

function IconMegaphone() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 18-5v12L3 13v-2z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
    );
}

function IconHistory() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}

export default function ClientCardView({ initialClaim, id }: { initialClaim: any, id: string }) {
    const router = useRouter()
    const [claimData, setClaimData] = useState<any>(initialClaim)
    const [offers, setOffers] = useState<any[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false)
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false)

    // Store Offers Fetching Logic
    useEffect(() => {
        const storeId = claimData?.stores?.id || claimData?.store_id;
        if (!storeId) return;

        const fetchOffers = async () => {
            const { data, error } = await supabase
                .from('store_offers')
                .select('*')
                .eq('store_id', storeId)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })

            if (!error && data) {
                setOffers(data)
            }
        }

        fetchOffers()
    }, [claimData])

    // Realtime Claim Status Logic
    useEffect(() => {
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
                async () => {
                    const { data: updatedClaim } = await supabase
                        .from('cashback_claims')
                        .select(`
                            *,
                            stores:store_id (
                                id,
                                store_name,
                                store_slug,
                                logo_url,
                                location_url,
                                review_url,
                                target_visits
                            )
                        `)
                        .eq('id', id)
                        .maybeSingle()

                    if (updatedClaim) {
                        setClaimData(updatedClaim)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    // Fetch Full Customer Visit & Cashback History
    const fetchHistory = async () => {
        const storeId = claimData?.stores?.id || claimData?.store_id;
        const phone = claimData?.customer_phone;
        if (!storeId || !phone) return;

        setLoadingHistory(true)
        setShowHistoryModal(true)

        const { data, error } = await supabase
            .from('cashback_claims')
            .select('*')
            .eq('store_id', storeId)
            .eq('customer_phone', phone)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setHistory(data)
        }
        setLoadingHistory(false)
    }

    const store = claimData?.stores
    const customerPhone = claimData?.customer_phone || ''
    const currentVisits = Number(claimData?.visit_count) || 1
    const totalVisits = Number(store?.target_visits) || 6

    const isRedeemed = claimData?.status === 'REDEEMED' || Number(claimData?.claimable_amount || 0) <= 0;
    const isRewardReady = (currentVisits >= totalVisits) && !isRedeemed;

    const storeInitials = store?.store_name
        ? store.store_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : 'RC'

    const visitsLeft = totalVisits - currentVisits;

    return (
        <div className="flex justify-center min-h-screen bg-slate-200/60 font-sans selection:bg-[#00875A] selection:text-white antialiased">
            <div className="relative bg-slate-50 w-full max-w-[430px] flex flex-col min-h-screen border-x border-slate-200/50 shadow-2xl p-4 pb-20">
                
                {/* Header Section */}
                <div className="w-full flex items-center justify-between pt-1 pb-3 border-b border-slate-200/80 mb-4">
                    {customerPhone ? (
                        <button
                            onClick={() => router.push(`/wallet/${customerPhone}`)}
                            className="flex items-center gap-2 text-xs font-bold text-[#00875A] bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl hover:bg-emerald-100/80 transition active:scale-95 cursor-pointer shadow-xs"
                        >
                            <IconWallet />
                            <span>My Wallet</span>
                        </button>
                    ) : (
                        <div className="text-xs text-slate-500 font-bold tracking-wider">RETCASH CARD</div>
                    )}
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Digital Loyalty Card</span>
                </div>

                <div className="w-full space-y-4 flex-1">
                    {/* Store Loyalty Card Header - Hero Gradient Theme */}
                    <div
                        className="relative rounded-3xl p-6 shadow-lg overflow-hidden text-white"
                        style={{
                            background: "linear-gradient(135deg, #00875A 0%, #059669 45%, #0d9488 100%)",
                            boxShadow: "0 8px 32px rgba(0,135,90,0.28)",
                        }}
                    >
                        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
                        <div className="absolute right-4 top-14 w-20 h-20 rounded-full bg-white/8 pointer-events-none" />

                        <div className="relative z-10">
                            {/* Store Details Header (RETCASH PARTNER removed) */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-xs flex items-center justify-center font-extrabold text-white text-base shadow-xs overflow-hidden shrink-0">
                                        {store?.logo_url ? (
                                            <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
                                        ) : (
                                            storeInitials
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-black text-white leading-tight tracking-tight">{store?.store_name || 'PARTNER STORE'}</h1>
                                    </div>
                                </div>
                            </div>

                            {/* Store Credit Balance */}
                            <div className="mb-5">
                                <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest block mb-1">STORE CREDIT BALANCE</span>
                                <div className="text-3xl font-black text-white tracking-tight">
                                    Rs. {Number(claimData?.claimable_amount || 0).toFixed(2)}
                                </div>
                            </div>

                            {/* Refined Unified Progress Badge with SVG Icon */}
                            <div className="pt-3 border-t border-white/20 flex items-center justify-center">
                                <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-3.5 py-1.5 rounded-xl backdrop-blur-md w-full justify-center">
                                    <IconGift />
                                    <span className="text-white font-bold text-[11px] tracking-wide">
                                        {isRewardReady
                                            ? 'Reward Unlocked & Ready!'
                                            : isRedeemed
                                            ? 'Reward Successfully Redeemed'
                                            : `${visitsLeft} ${visitsLeft === 1 ? 'Visit' : 'Visits'} Remaining for Reward`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Card View Section - Light Clean Theme */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 text-center relative overflow-hidden shadow-xs">
                        
                        {/* 1. Visit Challenge Grid */}
                        <div className="mb-5 bg-slate-50/80 border border-slate-100 p-4 rounded-2xl">
                            <div className="flex justify-between text-[11px] font-bold tracking-wider uppercase mb-3">
                                <span className="text-slate-600">{totalVisits} Visit Challenge</span>
                                <span className="text-[#00875A] font-extrabold">{currentVisits} / {totalVisits} Visits</span>
                            </div>

                            <div
                                className="grid gap-2"
                                style={{
                                    gridTemplateColumns: `repeat(${totalVisits > 5 ? 5 : totalVisits}, minmax(0, 1fr))`
                                }}
                            >
                                {Array.from({ length: totalVisits }).map((_, i) => {
                                    const step = i + 1;
                                    const done = step <= currentVisits;
                                    return (
                                        <div
                                            key={step}
                                            className={`h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${done
                                                ? 'bg-[#00875A] text-white shadow-md shadow-[#00875A]/25'
                                                : 'bg-white border border-slate-200/80 text-slate-300'
                                                }`}
                                        >
                                            {done ? <IconCheck /> : <span className="scale-75 text-slate-300"><IconLock /></span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Latest Cashback & See All History Button */}
                        <div className="bg-emerald-50/50 border border-emerald-100/80 p-3 rounded-2xl mb-5 flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">LATEST CASHBACK</span>
                                <button 
                                    onClick={fetchHistory}
                                    className="text-[10px] font-extrabold text-[#00875A] bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer"
                                >
                                    <IconHistory />
                                    <span>SEE ALL</span>
                                </button>
                            </div>
                            {isRedeemed ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400 line-through text-[11px]">
                                        Rs. {Number(claimData?.cashback_amount || 0).toFixed(2)}
                                    </span>
                                    <span className="bg-slate-200 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        REDEEMED
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[#00875A] font-extrabold text-sm">
                                    + Rs. {Number(claimData?.cashback_amount || 0).toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* 3. QR Code / Compact Reward Section */}
                        <div className="mb-4">
                            {isRedeemed ? (
                                <div className="py-4 px-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-center">
                                    <h3 className="text-xs font-black text-[#00875A] uppercase tracking-wider">REWARD REDEEMED</h3>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Thank you for visiting!</p>
                                </div>
                            ) : isRewardReady ? (
                                <div className="w-full">
                                    <div className="bg-emerald-50 border border-emerald-200/80 text-[#00875A] text-xs font-bold py-2 px-3 rounded-xl mb-3 shadow-xs">
                                        Reward Ready! Show QR code at billing counter:
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl inline-block shadow-md border border-slate-100">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${id}`}
                                            alt="Redemption QR"
                                            className="w-36 h-36 object-contain"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-3 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 w-full flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 text-[#00875A] rounded-full flex items-center justify-center text-sm">
                                            <IconGift />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-xs font-bold text-slate-700">Reward Locked</h3>
                                            <p className="text-[10px] text-slate-400">QR appears on visit {totalVisits}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full uppercase">
                                        {currentVisits}/{totalVisits}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* STORE OFFERS SECTION */}
                        {offers.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-slate-100 text-left">
                                <div className="flex items-center gap-1.5 text-[#00875A] font-extrabold text-xs uppercase tracking-wider mb-3">
                                    <IconMegaphone />
                                    <span>STORE OFFERS & DEALS</span>
                                </div>
                                <div className="space-y-3">
                                    {offers.map((offer) => (
                                        <div key={offer.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 shadow-xs overflow-hidden">
                                            {offer.image_url && (
                                                <div className="w-full h-40 bg-slate-200 rounded-xl overflow-hidden mb-3">
                                                    <img 
                                                        src={offer.image_url} 
                                                        alt={offer.title} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <h4 className="font-bold text-xs text-slate-800 leading-snug">{offer.title}</h4>
                                            {offer.description && (
                                                <p className="text-[11px] text-slate-500 mt-1 leading-normal">{offer.description}</p>
                                            )}
                                            {offer.expires_at && (
                                                <div className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                    Ends: {new Date(offer.expires_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Location & Review Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 mt-4">
                            {store?.location_url ? (
                                <a
                                    href={store.location_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-3 px-3 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold rounded-xl text-center text-xs hover:bg-emerald-100 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                                >
                                    <IconLocation />
                                    <span>LOCATION</span>
                                </a>
                            ) : (
                                <button disabled className="py-3 px-3 bg-slate-100 border border-slate-200/60 rounded-xl text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                                    <IconLocation />
                                    <span>LOCATION</span>
                                </button>
                            )}

                            {store?.review_url ? (
                                <a
                                    href={store.review_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-3 px-3 bg-[#00875A] text-white font-bold rounded-xl text-center text-xs hover:bg-[#00704a] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                                >
                                    <IconStar />
                                    <span>REVIEW</span>
                                </a>
                            ) : (
                                <button disabled className="py-3 px-3 bg-slate-100 border border-slate-200/60 rounded-xl text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                                    <IconStar />
                                    <span>REVIEW</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="py-6 text-center text-[10px] text-slate-400 tracking-wider uppercase font-extrabold">
                    <p>© RETCASH DIGITAL LOYALTY PLATFORM</p>
                </div>
            </div>

            {/* CASHBACK & VISIT HISTORY MODAL */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col p-5 shadow-2xl">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-50 text-[#00875A] rounded-xl">
                                    <IconHistory />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800">Visit & Cashback History</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">{store?.store_name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center hover:bg-slate-200 transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
                            {loadingHistory ? (
                                <div className="text-center py-8 text-xs text-slate-400 font-medium">Loading history...</div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-8 text-xs text-slate-400 font-medium">No prior visits found.</div>
                            ) : (
                                history.map((item) => (
                                    <div key={item.id} className="bg-slate-50 border border-slate-100/80 rounded-2xl p-3 flex justify-between items-center text-xs">
                                        <div>
                                            <div className="font-extrabold text-slate-700">Visit #{item.visit_count || 1}</div>
                                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                {new Date(item.created_at).toLocaleDateString('en-US', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-extrabold text-[#00875A]">
                                                + Rs. {Number(item.cashback_amount || 0).toFixed(2)}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                                item.status === 'REDEEMED' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-[#00875A]'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}