'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function VisitProgress({ visits, total }: { visits: number; total: number }) {
    const totalPills = total || 6
    return (
        <div className="flex gap-1">
            {Array.from({ length: totalPills }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: `${Math.min(32, Math.max(6, 120 / totalPills))}px`,
                        height: '5px',
                        borderRadius: '99px',
                        backgroundColor: i < visits ? '#F97316' : '#E2E8F0',
                        transition: 'background-color 0.2s',
                    }}
                />
            ))}
        </div>
    )
}

function NavIcon({ id, active }: { id: string; active: boolean }) {
    const color = active ? '#F97316' : '#94A3B8'
    if (id === 'wallet') {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="14" rx="3" fill={active ? '#FFF7ED' : 'none'} stroke={color} strokeWidth="1.8" />
                <path d="M16 13C16 13.55 16.45 14 17 14C17.55 14 18 13.55 18 13C16.45 12 16 12.45 17 12Z" fill={color} />
                <path d="M2 10H22" stroke={color} strokeWidth="1.8" />
            </svg>
        )
    }
    if (id === 'explore') {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" fill={active ? '#FFF7ED' : 'none'} stroke={color} strokeWidth="1.8" />
                <path d="M16.24 7.76L13.41 13.41L7.76 16.24L10.59 10.59L16.24 7.76Z" fill={color} />
            </svg>
        )
    }
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill={active ? '#FFF7ED' : 'none'} stroke={color} strokeWidth="1.8" />
            <path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    )
}

export default function CustomerHomeWalletPage({ params }: { params: Promise<{ phone: string }> }) {
    const resolvedParams = use(params)
    const phone = resolvedParams?.phone || ''
    const router = useRouter()
    const cleanPhone = phone ? phone.replace(/\D/g, '') : ''

    const [claims, setClaims] = useState<any[]>([])
    const [filteredClaims, setFilteredClaims] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [activeCategory, setActiveCategory] = useState<string>('All Stores')
    const [searchQuery, setSearchQuery] = useState('')
    const [showQrModal, setShowQrModal] = useState(false)
    const [activeTab, setActiveTab] = useState<'wallet' | 'explore' | 'profile'>('wallet')

    useEffect(() => {
        if (cleanPhone) {
            checkAuthAndFetchData()
        }
    }, [cleanPhone])

    const checkAuthAndFetchData = async () => {
        try {
            const savedAuth = localStorage.getItem(`retcash_wallet_auth_${cleanPhone}`)

            // லாகின் செய்யவில்லை எனில் நேராக Login பக்கத்திற்கு அனுப்பவும்
            if (savedAuth !== 'true') {
                router.push(`/customer/login?phone=${cleanPhone}`)
                return
            }

            // டேட்டாக்களைப் பெற்றுக்கொள்ளுதல்
            await fetchCustomerClaims()
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    // Filter Logic
    useEffect(() => {
        let result = claims

        if (activeCategory !== 'All Stores') {
            result = result.filter(item => {
                const category = item.stores?.category?.toLowerCase() || 'others'
                return category === activeCategory.toLowerCase()
            })
        }

        if (searchQuery.trim() !== '') {
            result = result.filter(item =>
                item.stores?.store_name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        setFilteredClaims(result)
    }, [claims, activeCategory, searchQuery])

    const fetchCustomerClaims = async () => {
        if (!cleanPhone) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('cashback_claims')
                .select(`
                    id,
                    claimable_amount,
                    visit_count,
                    created_at,
                    stores (
                        id,
                        store_name,
                        store_slug,
                        logo_url,
                        category
                    )
                `)
                .eq('customer_phone', cleanPhone)
                .order('created_at', { ascending: false })

            if (!error && data) {
                const uniqueStoresMap = new Map()
                let totalAcc = 0

                data.forEach((item: any) => {
                    const storeObj = Array.isArray(item.stores) ? item.stores[0] : item.stores
                    const amount = Number(item.claimable_amount || 0)
                    totalAcc += amount

                    if (storeObj && storeObj.id && !uniqueStoresMap.has(storeObj.id)) {
                        uniqueStoresMap.set(storeObj.id, {
                            ...item,
                            stores: storeObj
                        })
                    }
                })

                const uniqueList = Array.from(uniqueStoresMap.values())
                setClaims(uniqueList)
                setFilteredClaims(uniqueList)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem(`retcash_wallet_auth_${cleanPhone}`)
        router.push(`/customer/login?phone=${cleanPhone}`)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#F97316]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full max-w-[420px] mx-auto relative overflow-hidden font-sans pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <div className="flex-1 overflow-y-auto w-full">

                <div className="bg-white border-b border-slate-100 p-5 space-y-4 w-full">
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Welcome Back</p>
                            <p className="text-base font-bold text-slate-900">+{cleanPhone}</p>
                        </div>
                        <button
                            onClick={() => setShowQrModal(true)}
                            className="bg-[#F97316] hover:bg-[#ea580c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition shrink-0"
                        >
                            <span>📱</span> My QR
                        </button>
                    </div>

                    {activeTab === 'wallet' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 focus-within:border-[#F97316] rounded-xl px-3.5 py-2.5 gap-2.5 shadow-xs transition w-full">
                            <span className="text-slate-400 text-sm">🔍</span>
                            <input
                                type="text"
                                placeholder="Search stores, categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-none outline-none bg-transparent text-sm text-slate-900 flex-1 font-sans placeholder:text-slate-400 w-full min-w-0"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-xs text-slate-600 shrink-0"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {activeTab === 'wallet' && (
                    <div className="p-5 space-y-4 w-full">
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar w-full">
                            {['All Stores', 'Food', 'Retail', 'Others'].map((cat) => {
                                const isActive = activeCategory === cat
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap shrink-0 ${isActive
                                            ? 'bg-[#F97316] text-white shadow-xs'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex items-center justify-between pt-1 w-full">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Your Stores & Loyalty Cards <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px] lowercase font-semibold ml-1">{filteredClaims.length} stores</span>
                            </p>
                        </div>

                        {filteredClaims.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-1 w-full">
                                <p className="text-sm font-semibold text-slate-700">No stores found</p>
                                <p className="text-xs text-slate-400">Try adjusting your category filters</p>
                            </div>
                        ) : (
                            <div className="space-y-3 w-full">
                                {filteredClaims.map((item: any) => {
                                    const visits = item.visit_count || 1
                                    const storeName = item.stores?.store_name || 'Store'
                                    const storeCategory = item.stores?.category || 'Others'

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => router.push(`/card/${item.id}`)}
                                            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs hover:shadow-md transition cursor-pointer space-y-3 w-full"
                                        >
                                            <div className="flex items-center gap-3 w-full">
                                                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {item.stores?.logo_url ? (
                                                        <img src={item.stores.logo_url} alt={storeName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[#F97316] font-bold text-lg">{storeName.charAt(0)}</span>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{storeName}</p>
                                                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                                                            Pass
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 font-medium capitalize truncate">{storeCategory}</p>
                                                </div>

                                                <button className="bg-[#F97316] text-white w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs hover:bg-[#ea580c] transition shrink-0">
                                                    →
                                                </button>
                                            </div>

                                            <div className="flex items-end justify-between pt-1 border-t border-slate-50 w-full">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-0.5">BALANCE</p>
                                                    <p className="text-base font-black text-[#F97316]">
                                                        Rs. {Number(item.claimable_amount || 0).toFixed(2)}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">{visits}/6 VISITS</p>
                                                    <VisitProgress visits={visits} total={6} />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'explore' && (
                    <div className="p-5 space-y-4 w-full">
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2 w-full shadow-xs">
                            <span className="text-3xl">🎁</span>
                            <h3 className="text-sm font-bold text-slate-900">Exclusive Deals</h3>
                            <p className="text-xs text-slate-500">Partner offers and active campaigns will appear here.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="p-5 space-y-4 w-full">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 w-full shadow-xs">
                            <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Account Profile</h3>
                            <div className="flex justify-between text-xs py-1">
                                <span className="text-slate-400">Phone Number:</span>
                                <span className="text-slate-900 font-bold">+{cleanPhone}</span>
                            </div>
                            <div className="flex justify-between text-xs py-1">
                                <span className="text-slate-400">Total Passes:</span>
                                <span className="text-slate-900 font-bold">{claims.length}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-xs border border-red-200 transition mt-2 active:scale-98"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showQrModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-xs font-bold text-slate-600 uppercase">Customer Identification QR</h3>
                            <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-800 text-lg">✕</button>
                        </div>
                        <div className="bg-slate-50 p-4 border rounded-2xl inline-block">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${cleanPhone}`}
                                alt="Customer QR"
                                className="w-44 h-44"
                            />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Phone ID</p>
                            <p className="text-base font-mono font-black text-[#F97316]">+{cleanPhone}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto bg-white border-t border-slate-100 px-4 py-2 flex justify-around items-center z-40 shadow-lg pb-[env(safe-area-inset-bottom)]">
                {[
                    { id: 'wallet', label: 'Wallet' },
                    { id: 'explore', label: 'Discover' },
                    { id: 'profile', label: 'Profile' }
                ].map((item) => {
                    const isActive = activeTab === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className="flex flex-col items-center gap-1 py-1 px-3 relative"
                        >
                            <NavIcon id={item.id} active={isActive} />
                            <span className={`text-[10px] font-medium ${isActive ? 'text-[#F97316] font-semibold' : 'text-slate-400'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-gradient-to-r from-[#F97316] to-[#FB923C]" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}