'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'

export default function CustomerWalletPage({ params }: { params: Promise<{ phone: string }> }) {
    const { phone } = use(params)
    const cleanPhone = phone?.replace(/\D/g, '') || ''

    const [balances, setBalances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (cleanPhone) {
            fetchCustomerBalances()
        }
    }, [cleanPhone])

    const fetchCustomerBalances = async () => {
        try {
            setLoading(true)

            // Get store-wise balances with joined store details
            const { data, error } = await supabase
                .from('customer_store_balances')
                .select(`
          id,
          balance_amount,
          stores (
            id,
            store_name,
            logo_url,
            store_slug,
            location_url,
            review_url
          )
        `)
                .eq('customer_phone', cleanPhone)
                .gt('balance_amount', 0)

            if (error) {
                console.error('Error fetching balances:', error)
            } else {
                setBalances(data || [])
            }
        } catch (err) {
            console.error(err)
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

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center p-4 font-sans selection:bg-[#FF6B00]">

            {/* Branding Header */}
            <div className="pt-6 pb-4 flex flex-col items-center">
                <img src="/puff.png" alt="Retcash" className="h-12 w-auto object-contain mb-1 drop-shadow-[0_0_15px_rgba(255,107,0,0.3)]" />
                <span className="text-[10px] tracking-widest text-gray-500 uppercase font-semibold">My Digital Cashback Wallet</span>
            </div>

            <div className="w-full max-w-md space-y-4">
                {/* User Mobile Info Banner */}
                <div className="bg-[#161B26] border border-gray-800 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                        <span className="text-[10px] text-gray-400 font-semibold block uppercase">Registered Account</span>
                        <span className="text-sm font-bold text-white">📱 +94 {cleanPhone}</span>
                    </div>
                    <span className="text-[10px] bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 px-2.5 py-1 rounded-lg font-bold">
                        {balances.length} {balances.length === 1 ? 'Store Card' : 'Store Cards'}
                    </span>
                </div>

                {/* Dynamic Store-Wise Cashback Cards */}
                {balances.length === 0 ? (
                    <div className="bg-[#161B26] border border-gray-800 rounded-3xl p-8 text-center">
                        <p className="text-xs text-gray-400 mb-2">No active cashback cards found for this mobile number.</p>
                        <p className="text-[11px] text-gray-500">Shop at partner stores to earn digital rewards!</p>
                    </div>
                ) : (
                    balances.map((card: any) => (
                        <div
                            key={card.id}
                            className="bg-[#161B26] border border-gray-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden transition hover:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {card.stores?.logo_url ? (
                                        <img
                                            src={card.stores.logo_url}
                                            alt={card.stores.store_name}
                                            className="w-12 h-12 rounded-2xl object-cover border border-gray-700"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-2xl flex items-center justify-center text-[#FF6B00] font-black text-lg">
                                            {card.stores?.store_name?.charAt(0) || 'S'}
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[9px] font-bold text-[#FF6B00] uppercase tracking-wider block">RETCASH PARTNER</span>
                                        <h2 className="text-base font-black text-white">{card.stores?.store_name}</h2>
                                    </div>
                                </div>
                            </div>

                            {/* Balance Card Container */}
                            <div className="bg-[#0D1117] p-4 rounded-2xl border border-gray-800/80 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Available Balance</span>
                                    <span className="text-xs text-gray-500">Can be redeemed on next purchase</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-[#FF6B00]">
                                        Rs. {Number(card.balance_amount || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Actions (Map / Review) */}
                            {(card.stores?.location_url || card.stores?.review_url) && (
                                <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-800/60 text-[11px]">
                                    {card.stores?.location_url && (
                                        <a
                                            href={card.stores.location_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2 bg-[#0D1117] border border-gray-800 rounded-xl text-center text-gray-300 hover:text-white transition font-medium"
                                        >
                                            📍 Location
                                        </a>
                                    )}
                                    {card.stores?.review_url && (
                                        <a
                                            href={card.stores.review_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2 bg-[#0D1117] border border-gray-800 rounded-xl text-center text-[#FF6B00] hover:border-[#FF6B00]/40 transition font-medium"
                                        >
                                            ⭐ Write Review
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="py-6 text-center text-[10px] text-gray-600 tracking-wider">
                <p>© 2026 RETCASH DIGITAL LOYALTY PLATFORM</p>
            </div>
        </div>
    )
}