'use client'

import { useEffect, useState, use } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Store, MapPin, Star, Wallet, Loader2, ArrowLeft } from 'lucide-react'

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
            <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col items-center justify-center font-sans">
                <Loader2 className="size-10 text-[#00875A] animate-spin mb-2" />
                <p className="text-xs text-slate-500 font-semibold">Loading Store Information...</p>
            </div>
        )
    }

    if (!store) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col items-center justify-center p-4 font-sans">
                <div className="bg-white p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 max-w-sm w-full text-center space-y-3">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                        <Store className="size-6" />
                    </div>
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Store Not Found</h1>
                    <p className="text-xs text-slate-500 leading-relaxed">The store link you accessed might be invalid, renamed, or expired.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#00875A] selection:text-white">
            
            <div className="pt-2"></div>

            {/* Single Clean Card Container */}
            <div className="w-full max-w-md bg-white border border-slate-100 rounded-[28px] p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative my-auto space-y-6">

                {/* Retcash Platform Header */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] mb-2 p-2">
                        <Image 
                            src="/logo.png" 
                            alt="RETCASH Logo" 
                            width={44} 
                            height={44} 
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <span className="text-[10px] tracking-widest text-slate-400 font-extrabold uppercase">
                        Digital Loyalty Network
                    </span>
                </div>

                {/* Active Store Details Header */}
                <div className="flex items-center gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60">
                    {store.logo_url ? (
                        <img src={store.logo_url} alt={store.store_name} className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                    ) : (
                        <div className="w-14 h-14 bg-[#E6F4EA] border border-[#00875A]/20 rounded-xl flex items-center justify-center text-[#00875A] font-black text-xl">
                            {store.store_name?.charAt(0)}
                        </div>
                    )}
                    <div>
                        <span className="text-[10px] font-extrabold text-[#00875A] uppercase tracking-wider block">
                            OFFICIAL PARTNER
                        </span>
                        <h1 className="text-base font-black text-slate-900">{store.store_name}</h1>
                        <p className="text-xs text-slate-500 font-medium">{store.default_cashback_percent}% Cashback Available</p>
                    </div>
                </div>

                {/* Action Form or Customer Dashboard */}
                {!isLoggedIn ? (
                    <form onSubmit={handlePhoneCheck} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Enter Mobile Number to Check Balance
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="e.g. 0771234567"
                                value={userPhone}
                                onChange={(e) => setUserPhone(e.target.value)}
                                className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-[#00875A]/20 rounded-xl text-slate-900 text-sm font-semibold outline-none transition"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3.5 bg-[#00875A] hover:bg-[#059669] text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md shadow-[#00875A]/25 active:scale-[0.98] transition duration-200 cursor-pointer"
                        >
                            View My Cashback & Rewards
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">

                        {/* Current Store Specific Balance */}
                        <div className="bg-[#E6F4EA] border border-[#00875A]/30 p-5 rounded-2xl text-center">
                            <span className="text-[10px] font-extrabold text-[#00875A] uppercase tracking-wider block">
                                Your Balance at {store.store_name}
                            </span>
                            <div className="text-3xl font-black text-slate-900 mt-1">
                                Rs. {customerBalances.find(b => b.store_name === store.store_name)?.total_cashback?.toFixed(2) || '0.00'}
                            </div>
                        </div>

                        {/* Quick Links for Store */}
                        {(store.location_url || store.review_url) && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                {store.location_url && (
                                    <a href={store.location_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-[#00875A] hover:text-[#00875A] transition">
                                        <MapPin className="size-4" /> Google Map
                                    </a>
                                )}
                                {store.review_url && (
                                    <a href={store.review_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-bold text-[#00875A] hover:bg-[#E6F4EA] transition">
                                        <Star className="size-4" /> Rate Store
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Network Wallet Accordion */}
                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 mb-3">
                                <Wallet className="size-3.5 text-slate-400" />
                                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    Your Network Wallet Balances
                                </h3>
                            </div>

                            {customerBalances.length === 0 ? (
                                <p className="text-xs text-slate-400 font-medium">No previous cashback history found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {customerBalances.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-[#F8FAFC] border border-slate-200/60 rounded-xl text-xs">
                                            <span className="font-bold text-slate-800">{item.store_name}</span>
                                            <span className="font-extrabold text-[#00875A]">Rs. {Number(item.total_cashback).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsLoggedIn(false)}
                            className="w-full text-center text-[11px] font-bold text-slate-400 hover:text-slate-600 pt-2 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <ArrowLeft className="size-3" /> Change Mobile Number
                        </button>
                    </div>
                )}

            </div>

            {/* Bottom Footer */}
            <div className="py-6 text-center text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
            </div>

        </div>
    )
}