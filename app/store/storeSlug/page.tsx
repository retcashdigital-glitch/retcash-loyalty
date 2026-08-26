'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'

export default function DynamicStorePage({ params }: { params: Promise<{ storeSlug: string }> }) {
    const { storeSlug } = use(params)

    const [store, setStore] = useState<any>(null)
    const [userPhone, setUserPhone] = useState('')
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [customerBalances, setCustomerBalances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStoreDetails()
    }, [storeSlug])

    const fetchStoreDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('*')
                .eq('store_slug', storeSlug)
                .single()

            if (error && storeSlug) {
                // Fallback: If slug match fails, try ID
                const { data: idData } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('id', storeSlug)
                    .single()
                setStore(idData)
            } else {
                setStore(data)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handlePhoneCheck = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userPhone) return
        const cleanPhone = userPhone.replace(/\D/g, '')

        // Fetch all balances for this customer across ALL stores
        const { data: transactions } = await supabase
            .from('transactions')
            .select('store_id, cashback_amount, stores(store_name, logo_url)')
            .eq('customer_phone', cleanPhone)

        // Calculate aggregated balances per store
        const storeMap: Record<string, any> = {}
        transactions?.forEach((tx: any) => {
            const sId = tx.store_id
            if (!storeMap[sId]) {
                storeMap[sId] = {
                    store_name: tx.stores?.store_name || 'Store',
                    logo_url: tx.stores?.logo_url,
                    total_cashback: 0
                }
            }
            storeMap[sId].total_cashback += Number(tx.cashback_amount || 0)
        })

        setCustomerBalances(Object.values(storeMap))
        setIsLoggedIn(true)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]"></div>
            </div>
        )
    }

    if (!store) {
        return (
            <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-xl font-bold text-red-400 mb-2">Store Not Found</h1>
                <p className="text-xs text-gray-400">The link you accessed might be invalid or expired.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center p-4 font-sans selection:bg-[#FF6B00]">

            {/* Header Branding */}
            <div className="pt-6 pb-4 flex flex-col items-center">
                <img src="/puff.png" alt="Retcash" className="h-10 w-auto object-contain mb-1" />
                <span className="text-[10px] tracking-widest text-gray-500 uppercase font-semibold">Digital Loyalty Network</span>
            </div>

            {/* Main Container */}
            <div className="w-full max-w-md bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">

                {/* Active Store Card Header */}
                <div className="flex items-center gap-4 bg-[#0D1117] p-4 rounded-2xl border border-gray-800 mb-6">
                    {store.logo_url ? (
                        <img src={store.logo_url} alt={store.store_name} className="w-14 h-14 rounded-xl object-cover border border-gray-700" />
                    ) : (
                        <div className="w-14 h-14 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-xl flex items-center justify-center text-[#FF6B00] font-black text-xl">
                            {store.store_name?.charAt(0)}
                        </div>
                    )}
                    <div>
                        <span className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-wider block">OFFICIAL PARTNER</span>
                        <h1 className="text-lg font-black text-white">{store.store_name}</h1>
                        <p className="text-xs text-gray-400">{store.default_cashback_percent}% Cashback Available</p>
                    </div>
                </div>

                {/* Action Form or Customer Dashboard */}
                {!isLoggedIn ? (
                    <form onSubmit={handlePhoneCheck} className="flex flex-col gap-3">
                        <label className="text-xs text-gray-300 font-semibold">Enter Mobile Number to Check Your Balance:</label>
                        <input
                            type="tel"
                            required
                            placeholder="e.g. 0771234567"
                            value={userPhone}
                            onChange={(e) => setUserPhone(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0D1117] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00] text-sm"
                        />
                        <button
                            type="submit"
                            className="w-full py-3.5 bg-gradient-to-r from-[#D95200] via-[#FF6B00] to-[#D95200] text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-98 transition"
                        >
                            VIEW MY CASHBACK & REWARDS
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">

                        {/* Current Store Specific Balance */}
                        <div className="bg-gradient-to-br from-[#FF6B00]/20 to-[#0D1117] border border-[#FF6B00]/40 p-5 rounded-2xl">
                            <span className="text-[11px] font-bold text-gray-300 uppercase">Your Balance at {store.store_name}</span>
                            <div className="text-3xl font-black text-white mt-1">
                                Rs. {customerBalances.find(b => b.store_name === store.store_name)?.total_cashback || '0.00'}
                            </div>
                        </div>

                        {/* Quick Links for this store */}
                        {(store.location_url || store.review_url) && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                {store.location_url && (
                                    <a href={store.location_url} target="_blank" rel="noreferrer" className="p-3 bg-[#0D1117] border border-gray-800 rounded-xl text-center text-xs font-semibold text-gray-300 hover:text-white hover:border-gray-600 transition">
                                        📍 Google Map
                                    </a>
                                )}
                                {store.review_url && (
                                    <a href={store.review_url} target="_blank" rel="noreferrer" className="p-3 bg-[#0D1117] border border-gray-800 rounded-xl text-center text-xs font-semibold text-[#FF6B00] hover:border-[#FF6B00]/50 transition">
                                        ⭐ Rate Store
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Unified Wallet Accordion - All Other Stores */}
                        <div className="pt-4 border-t border-gray-800">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Retcash Network Wallet</h3>

                            {customerBalances.length === 0 ? (
                                <p className="text-xs text-gray-500">No previous cashback history found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {customerBalances.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-[#0D1117] border border-gray-800 rounded-xl text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{item.store_name}</span>
                                            </div>
                                            <span className="font-bold text-[#FF6B00]">Rs. {item.total_cashback}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsLoggedIn(false)}
                            className="w-full text-center text-[11px] text-gray-500 hover:text-gray-300 pt-2"
                        >
                            Change Mobile Number
                        </button>
                    </div>
                )}

            </div>
        </div>
    )
}