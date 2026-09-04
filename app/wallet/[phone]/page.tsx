'use client'

import { useState, useEffect, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Wallet, Tag, User, Search, QrCode, ChevronRight, X, LogOut, Megaphone, Store } from 'lucide-react'

export default function CustomerWalletPage() {
    const params = useParams()
    const router = useRouter()
    const phone = params.phone as string

    const [activeTab, setActiveTab] = useState<'wallet' | 'offers' | 'profile'>('wallet')
    const [loading, setLoading] = useState(true)
    const [stores, setStores] = useState<any[]>([])
    const [activeOffers, setActiveOffers] = useState<any[]>([])
    const [offersLoading, setOffersLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All Stores')
    const [showQrModal, setShowQrModal] = useState(false)
    const [navigatingStoreId, setNavigatingStoreId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        if (!phone) return;

        // 1. லோக்கல் கேஷில் உள்ள தரவுகளை உடனே காட்டுதல்
        const cachedData = localStorage.getItem(`wallet_cache_${phone}`)
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData)
                setStores(parsed)
                setLoading(false)
                
                parsed.forEach((s: any) => {
                    router.prefetch(`/card/${s.id}?phone=${phone}`)
                })
            } catch (e) {
                console.error('Error parsing cache:', e)
            }
        }

        fetchWalletAndClaimsData()
        fetchActiveOffers()

        // 2. Supabase Realtime Listener setup (ரீஃப்ரெஷ் இல்லாமலே டேட்டா அப்டேட் ஆக)
        const channel = supabase
            .channel(`wallet_realtime_${phone}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'cashback_claims',
                    filter: `customer_phone=eq.${phone}`
                },
                () => {
                    fetchWalletAndClaimsData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [phone])

    const fetchWalletAndClaimsData = async () => {
        try {
            const cachedData = localStorage.getItem(`wallet_cache_${phone}`)
            if (!cachedData) {
                setLoading(true)
            }

            const { data: allStores, error: storeError } = await supabase
                .from('stores')
                .select('*')

            if (storeError) throw storeError

            const { data: claimsData, error: claimsError } = await supabase
                .from('cashback_claims')
                .select('*')
                .eq('customer_phone', phone)
                .order('updated_at', { ascending: false })

            if (claimsError) {
                console.error('Error fetching claims:', claimsError)
            }

            const mergedStores = allStores?.map((store: any) => {
                const storeClaims = claimsData?.filter(
                    (claim: any) => String(claim.store_id) === String(store.id)
                ) || []

                // சமீபத்திய Claim தரவைக் கண்டறிதல்
                const latestClaim = storeClaims[0] || null

                // Redeem செய்யப்பட்டதா அல்லது Claimable Amount 0-வா எனச் சரிபார்த்தல்
                const isRedeemed = latestClaim
                    ? (latestClaim.status === 'REDEEMED' || Number(latestClaim.claimable_amount || 0) <= 0)
                    : false

                const cashbackAmount = latestClaim
                    ? Number(latestClaim.cashback_amount || 0)
                    : 0

                const totalBalance = storeClaims.reduce((sum: number, claim: any) => {
                    return sum + (Number(claim.claimable_amount) || 0)
                }, 0)

                const visitCount = storeClaims.reduce((max: number, claim: any) => {
                    return Math.max(max, Number(claim.visit_count) || 1)
                }, storeClaims.length > 0 ? storeClaims.length : 0)

                let storeTarget = Number(store.target_visits) || 6;
                if (storeTarget > 10) storeTarget = 10;

                router.prefetch(`/card/${store.id}?phone=${phone}`)

                return {
                    ...store,
                    balance: totalBalance,
                    cashbackAmount: cashbackAmount,
                    isRedeemed: isRedeemed,
                    visits: visitCount,
                    targetVisits: storeTarget
                }
            }) || []

            setStores(mergedStores)
            localStorage.setItem(`wallet_cache_${phone}`, JSON.stringify(mergedStores))

        } catch (err) {
            console.error('Error in fetching wallet data:', err)
        } finally {
            setLoading(false)
        }
    }

    // ஆஃபர் பதிவிட்டுள்ள கடைகளின் ஆஃபர்களை மட்டும் எடுக்கும் லாஜிக்
    const fetchActiveOffers = async () => {
        try {
            setOffersLoading(true)
            const { data, error } = await supabase
                .from('store_offers')
                .select(`
                    *,
                    stores:store_id (
                        id,
                        store_name,
                        logo_url
                    )
                `)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })

            if (!error && data) {
                setActiveOffers(data)
            }
        } catch (err) {
            console.error('Error fetching active offers:', err)
        } finally {
            setOffersLoading(false)
        }
    }

    const handleStoreClick = (storeId: string) => {
        if (!storeId || navigatingStoreId) return;
        
        setNavigatingStoreId(storeId);
        
        startTransition(() => {
            router.push(`/card/${storeId}?phone=${phone}`);
        })
    }

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${phone}`;

    const formatPhoneNumber = (num: string) => {
        if (!num) return ''
        const cleaned = num.replace(/\D/g, '')
        if (cleaned.length >= 11) {
            const country = cleaned.slice(0, 2)
            const operator = cleaned.slice(2, 4)
            const last = cleaned.slice(-4)
            return `+${country} ${operator} ••• •${last}`
        }
        return `+${num}`
    }

    const filteredStores = stores.filter(store => {
        const matchesSearch = store.store_name?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesSearch
    })

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col pb-24 font-sans selection:bg-[#EE8838]">

            <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-5">

                {/* WALLET TAB */}
                {activeTab === 'wallet' && (
                    <>
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4 mt-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2.5">
                                        <img
                                            src="/logo.jpeg"
                                            alt="Retcash Logo"
                                            className="w-8 h-8 rounded-xl object-cover shadow-xs border border-orange-200"
                                        />
                                        <span className="font-black text-lg tracking-wider text-[#0F172A]">RET<span className="text-[#EE8838]">CASH</span></span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider pt-2">WELCOME BACK</p>
                                    <h1 className="text-xl font-black text-[#0F172A]">{formatPhoneNumber(phone)}</h1>
                                </div>
                            </div>

                            <div className="relative pt-1">
                                <Search className="absolute left-3.5 top-4.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search stores..."
                                    className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#EE8838] focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm text-[#0F172A] outline-none transition shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                            {['All Stores', 'Food', 'Retail', 'Others'].map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${selectedCategory === category
                                        ? 'bg-[#EE8838] text-[#0F172A] font-extrabold shadow-md shadow-orange-500/20'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:text-[#0F172A]'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">YOUR STORES & LOYALTY CARDS</h2>
                            <span className="text-xs font-bold bg-white text-[#EE8838] px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
                                {filteredStores.length} stores
                            </span>
                        </div>

                        {loading && stores.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-medium">Loading wallet data...</div>
                        ) : filteredStores.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                                <p className="text-xs text-slate-500">No stores found in your wallet yet.</p>
                            </div>
                        ) : (
                            filteredStores.map((store, index) => {
                                const target = store.targetVisits || 6;
                                const visits = store.visits || 0;
                                const isThisNavigating = navigatingStoreId === store.id;

                                return (
                                    <div
                                        key={index}
                                        onClick={() => handleStoreClick(store.id)}
                                        onMouseEnter={() => router.prefetch(`/card/${store.id}?phone=${phone}`)}
                                        className={`bg-white border rounded-3xl p-5 space-y-4 transition cursor-pointer shadow-xs group ${isThisNavigating
                                            ? 'border-[#EE8838] bg-orange-50/20 opacity-80'
                                            : 'border-slate-200/80 hover:border-[#EE8838] hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3.5">
                                                <div className="w-11 h-11 rounded-2xl bg-orange-50 overflow-hidden flex items-center justify-center border border-orange-100 group-hover:scale-105 transition">
                                                    <span className="text-sm font-black text-[#EE8838]">
                                                        {store.store_name?.[0] || 'S'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#EE8838] transition">
                                                        {store.store_name} {isThisNavigating && '(Opening...)'}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400 font-medium">Partner Store</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 group-hover:bg-orange-50 transition">
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#EE8838]" />
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">CASHBACK BALANCE</p>
                                                
                                                {/* Redeem செய்யப்பட்டிருந்தால் REDEEMED Badge காட்டுவது */}
                                                {store.isRedeemed ? (
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className="text-base font-bold text-slate-400 line-through">
                                                            Rs. {Number(store.cashbackAmount).toFixed(2)}
                                                        </span>
                                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                            REDEEMED
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className="text-lg font-black text-[#0F172A] mt-0.5">
                                                        Rs. {Number(store.balance).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-right space-y-1.5">
                                                <p className="text-[10px] font-extrabold text-slate-400">{visits}/{target} VISITS</p>
                                                <div className="flex space-x-1">
                                                    {Array.from({ length: target }, (_, i) => i + 1).map((v) => (
                                                        <div
                                                            key={v}
                                                            className={`w-2.5 h-2.5 rounded-full transition ${v <= visits ? 'bg-[#EE8838]' : 'bg-slate-200'}`}
                                                        ></div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </>
                )}

                {/* OFFERS TAB */}
                {activeTab === 'offers' && (
                    <div className="space-y-4 animate-in fade-in duration-200 pt-2">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <Megaphone className="w-5 h-5 text-[#EE8838]" />
                                <h1 className="text-xl font-black text-[#0F172A]">Store Offers & Deals</h1>
                            </div>
                            <p className="text-xs text-slate-500">Exclusive active offers posted by our partner stores.</p>
                        </div>

                        {offersLoading ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-medium">Loading store offers...</div>
                        ) : activeOffers.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                                <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
                                <p className="text-xs text-slate-500 font-medium">No active store offers available right now.</p>
                            </div>
                        ) : (
                            activeOffers.map((offer) => (
                                <div key={offer.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs hover:border-[#EE8838] transition">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <div className="flex items-center space-x-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center font-bold text-xs text-[#EE8838]">
                                                {offer.stores?.store_name?.[0] || 'S'}
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-bold text-[#0F172A]">{offer.stores?.store_name || 'Partner Store'}</h3>
                                                <p className="text-[10px] text-slate-400 font-medium">Active Promotion</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] bg-orange-50 text-[#EE8838] px-2.5 py-1 rounded-full font-bold border border-orange-100 uppercase tracking-wider">
                                            Special Deal
                                        </span>
                                    </div>

                                    {offer.image_url && (
                                        <div className="w-full h-44 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
                                            <img 
                                                src={offer.image_url} 
                                                alt={offer.title} 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <h4 className="font-extrabold text-sm text-[#0F172A]">{offer.title}</h4>
                                        {offer.description && (
                                            <p className="text-xs text-slate-500 leading-relaxed">{offer.description}</p>
                                        )}
                                    </div>

                                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Ends: {new Date(offer.expires_at).toLocaleDateString()}
                                        </span>
                                        {offer.stores?.id && (
                                            <button
                                                onClick={() => handleStoreClick(offer.stores.id)}
                                                className="text-xs font-bold text-[#EE8838] hover:underline flex items-center space-x-1"
                                            >
                                                <span>View Store Card</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="space-y-5 animate-in fade-in duration-200 pt-2">
                        <div className="space-y-1">
                            <h1 className="text-xl font-black text-[#0F172A]">My Profile</h1>
                            <p className="text-xs text-slate-500">Manage your account details and session.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
                            <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#EE8838] flex items-center justify-center font-black text-lg border border-orange-100 shadow-xs">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold">Phone Number</p>
                                    <p className="text-base font-extrabold text-[#0F172A]">{formatPhoneNumber(phone)}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        localStorage.removeItem(`wallet_cache_${phone}`)
                                        router.push('/customer/login')
                                    }}
                                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition outline-none cursor-pointer shadow-xs"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout / Switch Account</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* MY QR MODAL */}
            {showQrModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-[#0F172A] bg-slate-100 p-1.5 rounded-full outline-none cursor-pointer transition"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-1 pt-2">
                            <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider">My Wallet QR</h3>
                            <p className="text-[11px] text-slate-500">Scan this QR to get your phone number</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-200/80 shadow-inner">
                            <img src={qrCodeUrl} alt="Customer QR Code" className="w-48 h-48 mx-auto rounded-xl" />
                        </div>

                        <div className="bg-orange-50 border border-orange-100 py-2.5 px-4 rounded-xl">
                            <p className="text-xs font-extrabold text-[#EE8838]">{formatPhoneNumber(phone)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTTOM NAVIGATION */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-2 px-6 flex justify-around items-center z-40 max-w-md mx-auto rounded-t-3xl shadow-lg">
                <button
                    onClick={() => setActiveTab('wallet')}
                    className={`flex flex-col items-center space-y-1 outline-none transition cursor-pointer p-1 ${activeTab === 'wallet' ? 'text-[#EE8838]' : 'text-slate-400 hover:text-[#0F172A]'}`}
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Wallet</span>
                </button>

                <button
                    onClick={() => setActiveTab('offers')}
                    className={`flex flex-col items-center space-y-1 outline-none transition cursor-pointer p-1 ${activeTab === 'offers' ? 'text-[#EE8838]' : 'text-slate-400 hover:text-[#0F172A]'}`}
                >
                    <Tag className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Offers</span>
                </button>

                <button
                    onClick={() => setShowQrModal(true)}
                    className="flex flex-col items-center space-y-1 outline-none transition cursor-pointer p-1 text-slate-400 hover:text-[#0F172A]"
                >
                    <QrCode className="w-5 h-5" />
                    <span className="text-[10px] font-bold">My QR</span>
                </button>

                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center space-y-1 outline-none transition cursor-pointer p-1 ${activeTab === 'profile' ? 'text-[#EE8838]' : 'text-slate-400 hover:text-[#0F172A]'}`}
                >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Profile</span>
                </button>
            </nav>

        </div>
    )
}