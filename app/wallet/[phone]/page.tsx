'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Wallet, Compass, User, Search, QrCode, ChevronRight } from 'lucide-react'

export default function CustomerWalletPage() {
    const params = useParams()
    const router = useRouter()
    const phone = params.phone as string

    const [loading, setLoading] = useState(true)
    const [customerData, setCustomerData] = useState<any>(null)
    const [stores, setStores] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All Stores')

    useEffect(() => {
        fetchWalletData()
    }, [phone])

    const fetchWalletData = async () => {
        try {
            setLoading(true)
            // 1. Fetch customer details if needed
            // 2. Fetch stores and customer balances from Supabase
            // தற்காலிகமாக UI சரியாகக் காட்டுவதற்கான லே அவுட் இதுவாகும்.

        } catch (error) {
            console.error('Error fetching wallet data:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col pb-20 font-sans selection:bg-[#FF6B00]">

            {/* Top Header */}
            <header className="flex items-center justify-between px-4 py-4 border-b border-gray-800 bg-[#161B26]/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center space-x-2">
                    <div className="bg-[#FF6B00] p-1.5 rounded-xl text-white">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <span className="font-black text-lg tracking-wider text-white">RET<span className="text-[#FF6B00]">CASH</span></span>
                </div>
                <button
                    onClick={() => router.push(`/wallet/${phone}/qr`)}
                    className="flex items-center space-x-1.5 bg-[#FF6B00] hover:bg-[#ff8526] text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow-lg shadow-orange-500/20"
                >
                    <QrCode className="w-4 h-4" />
                    <span>My QR</span>
                </button>
            </header>

            {/* Main Content Container */}
            <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-5">

                {/* Welcome Section */}
                <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">WELCOME BACK</p>
                    <h1 className="text-xl font-extrabold text-white">+{phone}</h1>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search stores, categories..."
                        className="w-full bg-[#161B26] border border-gray-800 focus:border-[#FF6B00] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white outline-none transition shadow-inner"
                    />
                </div>

                {/* Category Filters */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                    {['All Stores', 'Food', 'Retail', 'Others'].map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === category
                                    ? 'bg-[#FF6B00] text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-[#161B26] text-gray-400 border border-gray-800 hover:text-white'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Stores & Loyalty Cards Header */}
                <div className="flex items-center justify-between pt-2">
                    <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">YOUR STORES & LOYALTY CARDS</h2>
                    <span className="text-xs font-bold bg-[#161B26] text-[#FF6B00] px-2.5 py-1 rounded-full border border-gray-800">
                        2 stores
                    </span>
                </div>

                {/* Loyalty Card 1 */}
                <div
                    onClick={() => router.push(`/card/mathiyalagi`)}
                    className="bg-[#161B26] border border-gray-800 rounded-3xl p-4 space-y-4 hover:border-gray-700 transition cursor-pointer shadow-xl"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-2xl bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-700">
                                <span className="text-xs font-bold text-[#FF6B00]">M</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Mathiyalagi store</h3>
                                <p className="text-[11px] text-gray-400">Others</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>

                    <div className="pt-2 border-t border-gray-800/80 flex items-end justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">BALANCE</p>
                            <p className="text-lg font-black text-white">Rs. 45.00</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[10px] font-bold text-gray-400">2/6 VISITS</p>
                            <div className="flex space-x-1">
                                <div className="w-3 h-3 rounded-full bg-[#FF6B00]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#FF6B00]"></div>
                                <div className="w-3 h-3 rounded-full bg-gray-800"></div>
                                <div className="w-3 h-3 rounded-full bg-gray-800"></div>
                                <div className="w-3 h-3 rounded-full bg-gray-800"></div>
                                <div className="w-3 h-3 rounded-full bg-gray-800"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loyalty Card 2 */}
                <div
                    onClick={() => router.push(`/card/kvs`)}
                    className="bg-[#161B26] border border-gray-800 rounded-3xl p-4 space-y-4 hover:border-gray-700 transition cursor-pointer shadow-xl"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-2xl bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-700">
                                <span className="text-xs font-bold text-[#FF6B00]">K</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">KVS store</h3>
                                <p className="text-[11px] text-gray-400">Others</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                </div>

            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#161B26] border-t border-gray-800 py-2.5 px-6 flex justify-around items-center z-50 max-w-md mx-auto rounded-t-3xl shadow-2xl">
                <button
                    onClick={() => router.push(`/wallet/${phone}`)}
                    className="flex flex-col items-center text-[#FF6B00] space-y-1"
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Wallet</span>
                </button>
                <button
                    onClick={() => router.push(`/discover`)}
                    className="flex flex-col items-center text-gray-400 hover:text-white space-y-1 transition"
                >
                    <Compass className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Discover</span>
                </button>
                <button
                    onClick={() => router.push(`/profile`)}
                    className="flex flex-col items-center text-gray-400 hover:text-white space-y-1 transition"
                >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Profile</span>
                </button>
            </nav>

        </div>
    )
}