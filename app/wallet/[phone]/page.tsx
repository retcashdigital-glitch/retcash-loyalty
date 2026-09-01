'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Wallet, Compass, User, Search, QrCode, ChevronRight, X, LogOut } from 'lucide-react'

export default function CustomerWalletPage() {
    const params = useParams()
    const router = useRouter()
    const phone = params.phone as string

    const [activeTab, setActiveTab] = useState<'wallet' | 'discover' | 'profile'>('wallet')
    const [loading, setLoading] = useState(true)
    const [stores, setStores] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All Stores')

    const [showQrModal, setShowQrModal] = useState(false)
    const [selectedStore, setSelectedStore] = useState<any>(null)

    useEffect(() => {
        if (phone) {
            fetchCustomerBalancesFromDatabase()
        }
    }, [phone])

    // சரியான முறையில் customer_store_balances மற்றும் stores டேபிள்களிலிருந்து டேட்டா எடுத்தல்
    const fetchCustomerBalancesFromDatabase = async () => {
        try {
            setLoading(true)

            // 1. முதலில் எல்லா கடைகளையும் எடுப்போம்
            const { data: allStores, error: storeError } = await supabase
                .from('stores')
                .select('*')

            if (storeError) throw storeError

            // 2. குறிப்பிட்ட கஸ்டமரின் ஃபோன் எண்ணுக்கான பேலன்ஸ் விவரங்களை customer_store_balances டேபிளிலிருந்து எடுப்போம்
            const { data: balancesData, error: balanceError } = await supabase
                .from('customer_store_balances')
                .select('*')
                .eq('phone_number', phone) // உமது டேபிளில் காலம் பெயர் 'phone_number' அல்லது 'customer_phone' என இருக்கலாம்

            if (balanceError) {
                console.error('Balance fetch error:', balanceError)
            }

            // 3. கடைகளையும் கஸ்டமர் பேலன்ஸையும் இணைத்து சரியான அரே உருவாக்குதல்
            const formattedList = allStores?.map((store: any) => {
                // customer_store_balances டேபிளில் இந்த ஸ்டோர் ஐடிக்குரிய டேட்டா உள்ளதா எனப் பார்த்தல்
                const userBalance = balancesData?.find(
                    (b: any) => b.store_id === store.id || b.store_id === store.store_id
                )

                return {
                    ...store,
                    // டேபிளில் உள்ள உண்மையான பேலன்ஸ் மற்றும் விசிட்களை எடுத்தல். டேட்டா இல்லையெனில் 0.
                    balance: userBalance?.balance ?? userBalance?.store_credit_balance ?? 0.00,
                    visits: userBalance?.visits ?? userBalance?.completed_visits ?? 0
                }
            }) || []

            setStores(formattedList)

        } catch (err) {
            console.error('Error fetching data from Supabase:', err)
        } finally {
            setLoading(false)
        }
    }

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${phone}`;

    const filteredStores = stores.filter(store => {
        const matchesSearch = store.store_name?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesSearch
    })

    return (
        <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col pb-24 font-sans selection:bg-[#FF6B00]">

            {/* Top Header */}
            <header className="flex items-center justify-between px-4 py-4 border-b border-gray-800 bg-[#161B26]/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center space-x-2">
                    <div className="bg-[#FF6B00] p-1.5 rounded-xl text-white">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <span className="font-black text-lg tracking-wider text-white">RET<span className="text-[#FF6B00]">CASH</span></span>
                </div>
                <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center space-x-1.5 bg-[#FF6B00] hover:bg-[#ff8526] text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow-lg shadow-orange-500/20 outline-none"
                >
                    <QrCode className="w-4 h-4" />
                    <span>My QR</span>
                </button>
            </header>

            {/* Main Content Container */}
            <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-5">

                {/* ================= 1. WALLET TAB ================= */}
                {activeTab === 'wallet' && (
                    <>
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

                        {/* Stores Header */}
                        <div className="flex items-center justify-between pt-2">
                            <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">YOUR STORES & LOYALTY CARDS</h2>
                            <span className="text-xs font-bold bg-[#161B26] text-[#FF6B00] px-2.5 py-1 rounded-full border border-gray-800">
                                {filteredStores.length} stores
                            </span>
                        </div>

                        {/* Dynamic Stores List */}
                        {loading ? (
                            <div className="text-center py-10 text-gray-500 text-xs">Loading correct data from database...</div>
                        ) : filteredStores.length === 0 ? (
                            <div className="bg-[#161B26] border border-gray-800 rounded-3xl p-6 text-center space-y-2">
                                <p className="text-xs text-gray-400">No stores found.</p>
                            </div>
                        ) : (
                            filteredStores.map((store, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedStore(store)}
                                    className="bg-[#161B26] border border-gray-800 rounded-3xl p-4 space-y-4 hover:border-gray-700 transition cursor-pointer shadow-xl"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-2xl bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-700">
                                                <span className="text-xs font-bold text-[#FF6B00]">
                                                    {store.store_name?.[0] || 'S'}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">{store.store_name}</h3>
                                                <p className="text-[11px] text-gray-400">Partner Store</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    </div>

                                    <div className="pt-2 border-t border-gray-800/80 flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">CASHBACK BALANCE</p>
                                            <p className="text-lg font-black text-white">Rs. {Number(store.balance).toFixed(2)}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400">{store.visits || 0}/6 VISITS</p>
                                            <div className="flex space-x-1">
                                                {[1, 2, 3, 4, 5, 6].map((v) => (
                                                    <div
                                                        key={v}
                                                        className={`w-3 h-3 rounded-full ${v <= (store.visits || 0) ? 'bg-[#FF6B00]' : 'bg-gray-800'}`}
                                                    ></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {/* ================= 2. DISCOVER TAB ================= */}
                {activeTab === 'discover' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="space-y-1">
                            <h1 className="text-xl font-extrabold text-white">Discover Offers</h1>
                            <p className="text-xs text-gray-400">Explore partner stores offering special cashback and rewards.</p>
                        </div>

                        {stores.map((store, idx) => (
                            <div key={idx} className="bg-[#161B26] border border-gray-800 rounded-3xl p-4 space-y-2 shadow-xl">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white">{store.store_name}</h3>
                                    <span className="text-[10px] bg-orange-500/10 text-[#FF6B00] px-2 py-1 rounded-full font-bold">
                                        Active Offer
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Visit this store and earn exciting cashback rewards on every purchase!</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ================= 3. PROFILE TAB ================= */}
                {activeTab === 'profile' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <div className="space-y-1">
                            <h1 className="text-xl font-extrabold text-white">My Profile</h1>
                            <p className="text-xs text-gray-400">Manage your account details and session.</p>
                        </div>

                        <div className="bg-[#161B26] border border-gray-800 rounded-3xl p-5 space-y-4 shadow-xl">
                            <div className="flex items-center space-x-3 pb-4 border-b border-gray-800">
                                <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center font-black text-lg">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold">Phone Number</p>
                                    <p className="text-base font-extrabold text-white">+{phone}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={() => router.push('/customer/login')}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition outline-none"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout / Switch Account</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Store Detail Modal Popup */}
            {selectedStore && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#161B26] border border-gray-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setSelectedStore(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-1.5 rounded-full outline-none"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-1 pt-2">
                            <h3 className="text-base font-extrabold text-white">{selectedStore.store_name}</h3>
                            <p className="text-[11px] text-gray-400">Loyalty Card Details</p>
                        </div>

                        <div className="bg-[#0B0E14] border border-gray-800 p-4 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Available Balance</span>
                                <span className="text-sm font-black text-[#FF6B00]">Rs. {Number(selectedStore.balance).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Visits Completed</span>
                                <span className="text-xs font-bold text-white">{selectedStore.visits || 0} / 6 Visits</span>
                            </div>
                        </div>

                        <div className="text-center pt-2">
                            <p className="text-[10px] text-gray-500">Show your My QR at the counter to update visits and cashback.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal Popup */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#161B26] border border-gray-800 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-1.5 rounded-full outline-none"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-1 pt-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Wallet QR</h3>
                            <p className="text-[11px] text-gray-400">Scan this QR to get your phone number</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
                            <img src={qrCodeUrl} alt="Customer QR Code" className="w-48 h-48 mx-auto" />
                        </div>

                        <div className="bg-[#0B0E14] border border-gray-800 py-2 px-4 rounded-xl">
                            <p className="text-xs font-bold text-[#FF6B00]">+{phone}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#161B26] border-t border-gray-800 py-2.5 px-6 flex justify-around items-center z-50 max-w-md mx-auto rounded-t-3xl shadow-2xl">
                <button
                    onClick={() => setActiveTab('wallet')}
                    className={`flex flex-col items-center space-x-1 outline-none transition ${activeTab === 'wallet' ? 'text-[#FF6B00]' : 'text-gray-400 hover:text-white'}`}
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Wallet</span>
                </button>
                <button
                    onClick={() => setActiveTab('discover')}
                    className={`flex flex-col items-center space-x-1 outline-none transition ${activeTab === 'discover' ? 'text-[#FF6B00]' : 'text-gray-400 hover:text-white'}`}
                >
                    <Compass className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Discover</span>
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center space-x-1 outline-none transition ${activeTab === 'profile' ? 'text-[#FF6B00]' : 'text-gray-400 hover:text-white'}`}
                >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Profile</span>
                </button>
            </nav>

        </div>
    )
}