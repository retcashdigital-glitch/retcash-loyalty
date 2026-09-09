'use client'

import { useState, useEffect, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Wallet, Tag, User, Search, QrCode, ChevronRight, X, LogOut, Megaphone, Maximize2, Sparkles, Store } from 'lucide-react'

export default function CustomerWalletPage() {
    const params = useParams()
    const router = useRouter()
    const rawPhone = params.phone as string

    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const phone = rawPhone ? (rawPhone.startsWith('94') ? rawPhone : `94${rawPhone.replace(/^0/, '')}`) : ''

    const [customerName, setCustomerName] = useState<string>('')
    const [customerEmail, setCustomerEmail] = useState<string>('')
    const [activeTab, setActiveTab] = useState<'wallet' | 'offers' | 'profile'>('wallet')
    const [loading, setLoading] = useState(true)
    const [stores, setStores] = useState<any[]>([])
    const [activeOffers, setActiveOffers] = useState<any[]>([])
    const [offersLoading, setOffersLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All Stores')
    const [showQrModal, setShowQrModal] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [navigatingStoreId, setNavigatingStoreId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    useEffect(() => {
        if (!phone) return;

        // 1. ROUTE GUARD & SESSION VERIFICATION
        const session = localStorage.getItem(`retcash_wallet_session_${phone}`)
        if (!session) {
            router.replace('/customer/login')
            return
        }

        setIsCheckingAuth(false)

        // Cache-இல் இருந்து பெயர் மற்றும் கார்டுகளை எடுத்தல்
        const cachedName = localStorage.getItem(`customer_name_${phone}`)
        if (cachedName) {
            setCustomerName(cachedName)
        }

        const cachedData = localStorage.getItem(`wallet_cache_${phone}`)
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData)
                if (Array.isArray(parsed)) {
                    setStores(parsed)
                    setLoading(false)
                    parsed.forEach((s: any) => {
                        router.prefetch(`/card/${s.id}?phone=${phone}`)
                    })
                }
            } catch (e) {
                console.error('Error parsing wallet cache:', e)
            }
        }

        fetchCustomerDetails()
        fetchWalletAndClaimsData()
        fetchActiveOffers()

        // Realtime listener
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
    }, [phone, router])

    const fetchCustomerDetails = async () => {
        try {
            const { data } = await supabase
                .from('customers')
                .select('full_name, email')
                .or(`phone_number.eq.${phone},phone_number.eq.${phone.replace(/^94/, '0')}`)
                .maybeSingle()

            if (data) {
                if (data.full_name) {
                    setCustomerName(data.full_name)
                    localStorage.setItem(`customer_name_${phone}`, data.full_name)
                }
                if (data.email) setCustomerEmail(data.email)
            }
        } catch (err) {
            console.error('Error fetching customer profile:', err)
        }
    }

    const fetchWalletAndClaimsData = async () => {
        try {
            const cachedData = localStorage.getItem(`wallet_cache_${phone}`)
            if (!cachedData) {
                setLoading(true)
            }

            const { data: claimsData, error: claimsError } = await supabase
                .from('cashback_claims')
                .select('*')
                .or(`customer_phone.eq.${phone},customer_phone.eq.${phone.replace(/^94/, '0')}`)
                .order('updated_at', { ascending: false })

            if (claimsError) throw claimsError

            const customerStoreIds = Array.from(
                new Set((claimsData || []).map((claim: any) => String(claim.store_id)).filter(Boolean))
            )

            if (customerStoreIds.length === 0) {
                setStores([])
                localStorage.setItem(`wallet_cache_${phone}`, JSON.stringify([]))
                setLoading(false)
                return
            }

            const { data: userStores, error: storeError } = await supabase
                .from('stores')
                .select('*')
                .in('id', customerStoreIds)

            if (storeError) throw storeError

            const mergedStores = userStores?.map((store: any) => {
                const storeClaims = claimsData?.filter(
                    (claim: any) => String(claim.store_id) === String(store.id)
                ) || []

                const latestClaim = storeClaims[0] || null

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

            if (JSON.stringify(mergedStores) !== cachedData) {
                setStores(mergedStores)
                localStorage.setItem(`wallet_cache_${phone}`, JSON.stringify(mergedStores))
            }

        } catch (err) {
            console.error('Error in fetching wallet data:', err)
        } finally {
            setLoading(false)
        }
    }

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
                        logo_url,
                        category
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

    const handleLogout = () => {
        localStorage.removeItem(`wallet_cache_${phone}`)
        localStorage.removeItem(`retcash_wallet_session_${phone}`)
        localStorage.removeItem(`customer_name_${phone}`)
        router.replace('/customer/login')
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
        const matchesSearch = store.store_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All Stores' || 
            (store.category && store.category.toLowerCase() === selectedCategory.toLowerCase());
        return matchesSearch && matchesCategory;
    })

    const totalWalletBalance = stores.reduce((acc, store) => acc + (store.isRedeemed ? 0 : Number(store.balance || 0)), 0);

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <div className="w-10 h-10 border-3 border-slate-200 border-t-[#00875A] rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans selection:bg-[#00875A] selection:text-white antialiased">
            <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-5 pb-32">
                {activeTab === 'wallet' && (
                    <>
                        {/* Header Profile Section */}
                        <div className="flex items-center justify-between pt-2 px-1">
                            <div className="flex items-center space-x-3">
                                <img
                                    src="/logo.jpeg"
                                    alt="Retcash Logo"
                                    className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-emerald-100"
                                />
                                <div>
                                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">WELCOME BACK</p>
                                    <h1 className="text-lg font-black text-[#1E293B] tracking-tight">
                                        {customerName ? (
                                            customerName
                                        ) : loading ? (
                                            <span className="inline-block w-28 h-5 bg-slate-200 animate-pulse rounded-md mt-0.5"></span>
                                        ) : (
                                            formatPhoneNumber(phone)
                                        )}
                                    </h1>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowQrModal(true)}
                                className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-[#00875A] transition text-slate-700 active:scale-95"
                            >
                                <QrCode className="w-5 h-5 text-[#00875A]" />
                            </button>
                        </div>

                        {/* Total Rewards Gradient Card */}
                        <div className="bg-gradient-to-br from-[#004D40] via-[#00695C] to-[#00875A] text-white rounded-3xl p-6 shadow-xl shadow-emerald-950/15 relative overflow-hidden space-y-4">
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <span className="text-xs font-semibold text-emerald-100/90 tracking-wide flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                                        Total Rewards Balance
                                    </span>
                                    <h2 className="text-3xl font-black mt-1 tracking-tight">
                                        Rs. {totalWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h2>
                                </div>
                                <span className="bg-white/15 backdrop-blur-md text-emerald-50 text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider">
                                    {stores.length} {stores.length === 1 ? 'Store' : 'Stores'}
                                </span>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search stores..."
                                className="w-full bg-white border border-slate-200/90 focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-[#1E293B] outline-none transition shadow-xs placeholder:text-slate-400 font-medium"
                            />
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                            {['All Stores', 'Food', 'Retail', 'Others'].map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${selectedCategory === category
                                        ? 'bg-[#00875A] text-white font-extrabold shadow-md shadow-emerald-600/20'
                                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* Stores Section Header */}
                        <div className="flex items-center justify-between pt-1">
                            <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">YOUR STORES</h2>
                            <span className="text-[11px] font-bold text-slate-400">
                                {filteredStores.length} Active
                            </span>
                        </div>

                        {/* Store Cards Listing */}
                        {loading && stores.length === 0 ? (
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 animate-pulse shadow-xs">
                                        <div className="flex items-center space-x-3.5">
                                            <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                                                <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                                            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                                            <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredStores.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                                <Store className="w-8 h-8 text-slate-300 mx-auto" />
                                <p className="text-xs text-slate-600 font-semibold">No active store cards found in your wallet.</p>
                                <p className="text-[11px] text-slate-400">Scan a store QR code to get your first loyalty card.</p>
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
                                        className={`bg-white border rounded-3xl p-5 space-y-4 transition cursor-pointer shadow-xs group active:scale-[0.99] ${isThisNavigating
                                            ? 'border-[#00875A] bg-emerald-50/20 opacity-80'
                                            : 'border-slate-200/90 hover:border-[#00875A] hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3.5">
                                                {store.logo_url ? (
                                                    <img 
                                                        src={store.logo_url} 
                                                        alt={store.store_name} 
                                                        className="w-12 h-12 rounded-2xl object-cover border border-slate-100 group-hover:scale-105 transition"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 overflow-hidden flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition">
                                                        <span className="text-base font-black text-[#00875A]">
                                                            {store.store_name?.[0] || 'S'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-sm font-extrabold text-[#1E293B] group-hover:text-[#00875A] transition">
                                                        {store.store_name} {isThisNavigating && '(Opening...)'}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-500 font-medium">
                                                        {store.category || 'Store'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 group-hover:bg-emerald-50 transition">
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#00875A]" />
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">CASHBACK BALANCE</p>
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
                                                    <p className="text-lg font-black text-[#00875A] mt-0.5">
                                                        Rs. {Number(store.balance).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-right space-y-1.5">
                                                <p className="text-[10px] font-extrabold text-slate-500">{visits}/{target} VISITS</p>
                                                <div className="flex space-x-1 justify-end">
                                                    {Array.from({ length: target }, (_, i) => i + 1).map((v) => (
                                                        <div
                                                            key={v}
                                                            className={`w-2.5 h-2.5 rounded-full transition ${v <= visits ? 'bg-[#00875A]' : 'bg-slate-200'}`}
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

                {activeTab === 'offers' && (
                    <div className="space-y-4 animate-in fade-in duration-200 pt-2">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <Megaphone className="w-5 h-5 text-[#00875A]" />
                                <h1 className="text-xl font-black text-[#1E293B]">Store Offers & Deals</h1>
                            </div>
                            <p className="text-xs text-slate-500">Exclusive active offers posted by stores.</p>
                        </div>

                        {offersLoading ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-medium">Loading store offers...</div>
                        ) : activeOffers.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                                <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
                                <p className="text-xs text-slate-600 font-semibold">No active store offers available right now.</p>
                            </div>
                        ) : (
                            activeOffers.map((offer) => (
                                <div key={offer.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs hover:border-[#00875A] transition">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <div className="flex items-center space-x-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-xs text-[#00875A]">
                                                {offer.stores?.store_name?.[0] || 'S'}
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-bold text-[#1E293B]">{offer.stores?.store_name || 'Store'}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium">Active Promotion</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] bg-emerald-50 text-[#00875A] px-2.5 py-1 rounded-full font-bold border border-emerald-100 uppercase tracking-wider">
                                            Special Deal
                                        </span>
                                    </div>

                                    {offer.image_url && (
                                        <div 
                                            onClick={() => setSelectedImage(offer.image_url)}
                                            className="relative w-full h-48 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 cursor-pointer group"
                                        >
                                            <img 
                                                src={offer.image_url} 
                                                alt={offer.title} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                            />
                                            <div className="absolute bottom-2 right-2 bg-slate-900/60 text-white p-1.5 rounded-lg backdrop-blur-xs group-hover:bg-[#00875A] transition">
                                                <Maximize2 className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <h4 className="font-extrabold text-sm text-[#1E293B]">{offer.title}</h4>
                                        {offer.description && (
                                            <p className="text-xs text-slate-500 leading-relaxed">{offer.description}</p>
                                        )}
                                    </div>

                                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Ends: {new Date(offer.expires_at).toLocaleDateString()}
                                        </span>
                                        {offer.stores?.id && (
                                            <button
                                                onClick={() => handleStoreClick(offer.stores.id)}
                                                className="text-xs font-bold text-[#00875A] hover:underline flex items-center space-x-1 cursor-pointer"
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

                {activeTab === 'profile' && (
                    <div className="space-y-5 animate-in fade-in duration-200 pt-2">
                        <div className="space-y-1">
                            <h1 className="text-xl font-black text-[#1E293B]">My Profile</h1>
                            <p className="text-xs text-slate-500">Manage your account details and session.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
                            <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-black text-lg border border-emerald-100 shadow-xs">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-[#1E293B]">
                                        {customerName || 'Customer'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">{formatPhoneNumber(phone)}</p>
                                    {customerEmail && (
                                        <p className="text-[11px] text-slate-400 font-normal pt-0.5">{customerEmail}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={handleLogout}
                                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition outline-none cursor-pointer shadow-xs active:scale-95"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout / Switch Account</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Image Modal */}
            {selectedImage && (
                <div 
                    onClick={() => setSelectedImage(null)}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
                >
                    <div className="relative max-w-sm w-full bg-transparent p-2">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-10 right-2 text-white bg-white/20 hover:bg-white/40 p-2 rounded-full outline-none transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img 
                            src={selectedImage} 
                            alt="Full Offer Poster" 
                            className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-[#1E293B] bg-slate-100 p-1.5 rounded-full outline-none cursor-pointer transition"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-1 pt-2">
                            <h3 className="text-sm font-black text-[#1E293B] uppercase tracking-wider">My Wallet QR</h3>
                            <p className="text-[11px] text-slate-500">Scan this QR to get your phone number</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-200/80 shadow-inner">
                            <img src={qrCodeUrl} alt="Customer QR Code" className="w-48 h-48 mx-auto rounded-xl" />
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 py-2.5 px-4 rounded-xl">
                            <p className="text-xs font-extrabold text-[#00875A]">{formatPhoneNumber(phone)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-2.5 px-6 flex justify-around items-center z-40 max-w-md mx-auto rounded-t-3xl shadow-2xl">
                <button
                    onClick={() => setActiveTab('wallet')}
                    className={`flex flex-col items-center space-y-1 outline-none transition cursor-pointer p-1 active:scale-90 ${activeTab === 'wallet' ? 'text-[#00875A]' : 'text-slate-400 hover:text-[#1E293B]'}`}
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-[10px] font-extrabold">Wallet</span>
                </button>

                <button
                    onClick={() => setActiveTab('offers')}
                    className={`flex flex-col items-center space-y-1 outline-none transition cursor-pointer p-1 active:scale-90 ${activeTab === 'offers' ? 'text-[#00875A]' : 'text-slate-400 hover:text-[#1E293B]'}`}
                >
                    <Tag className="w-5 h-5" />
                    <span className="text-[10px] font-extrabold">Offers</span>
                </button>

                <button
                    onClick={() => setShowQrModal(true)}
                    className="flex flex-col items-center space-y-1 outline-none transition cursor-pointer p-1 text-slate-400 hover:text-[#1E293B] active:scale-90"
                >
                    <QrCode className="w-5 h-5" />
                    <span className="text-[10px] font-extrabold">My QR</span>
                </button>

                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center space-y-1 outline-none transition cursor-pointer p-1 active:scale-90 ${activeTab === 'profile' ? 'text-[#00875A]' : 'text-slate-400 hover:text-[#1E293B]'}`}
                >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-extrabold">Profile</span>
                </button>
            </nav>
        </div>
    )
}