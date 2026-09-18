'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Wallet,
  Tag,
  User,
  Search,
  QrCode,
  ChevronRight,
  X,
  LogOut,
  Megaphone,
  Maximize2,
  Store as StoreIcon,
  Utensils,
  ShoppingBag,
  Shirt,
  Tv,
  ShoppingCart,
  Copy,
  Check,
  Sparkles,
  Dumbbell,     // Fitness / Gym
  Gamepad2,     // Gaming / Entertainment
  Pill,         // Healthcare / Pharmacy
  BookOpen,     // Education / Books
  Car,          // Automobile
  Sparkle,      // Beauty
  Wrench,       // General Services
  Camera,
  Loader2,
  Lock
} from 'lucide-react'

// ─── Visual Helpers ───────────────────────────────────────────────────────────

const ScissorsIcon = Wrench

function getCategoryColor(_category?: string) {
  return { color: '#00875A', bgColor: '#ECFDF5' }
}

function getCategoryIcon(category?: string) {
  if (!category || category === 'All') return StoreIcon
  const cat = category.toLowerCase().trim()

  if (cat.includes('food') || cat.includes('dining') || cat.includes('restaurant') || cat.includes('cafe')) return Utensils
  if (cat.includes('grocer') || cat.includes('supermarket') || cat.includes('mart')) return ShoppingCart
  if (cat.includes('fashion') || cat.includes('cloth') || cat.includes('wear')) return Shirt
  if (cat.includes('electronic') || cat.includes('tech') || cat.includes('gadget') || cat.includes('mobile')) return Tv
  if (cat.includes('beauty') || cat.includes('salon') || cat.includes('spa') || cat.includes('cosmetic')) return Sparkle
  if (cat.includes('service') || cat.includes('repair') || cat.includes('clean') || cat.includes('wash')) return Wrench
  if (cat.includes('fit') || cat.includes('gym') || cat.includes('sport')) return Dumbbell
  if (cat.includes('game') || cat.includes('gaming') || cat.includes('arcade') || cat.includes('entertain')) return Gamepad2
  if (cat.includes('health') || cat.includes('pharmacy') || cat.includes('medical') || cat.includes('clinic')) return Pill
  if (cat.includes('book') || cat.includes('educat') || cat.includes('stationery')) return BookOpen
  if (cat.includes('auto') || cat.includes('car') || cat.includes('bike') || cat.includes('garage')) return Car
  if (cat.includes('retail') || cat.includes('shop')) return ShoppingBag

  return StoreIcon
}

function VisitCapsules({ visits, maxVisits, color }: { visits: number; maxVisits: number; color: string }) {
  const targetVisits = Math.max(1, Math.min(maxVisits, 12))
  
  return (
    <div className="w-[130px] sm:w-[150px] flex-shrink-0 flex items-center justify-end">
      <div className="flex gap-1.5 w-full items-center">
        {Array.from({ length: targetVisits }).map((_, i) => (
          <div
            key={i}
            className="h-2 flex-1 rounded-full transition-all duration-300"
            style={{ 
              background: i < visits ? color : '#E2E8F0',
              opacity: i < visits ? 1 : 0.7
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CustomerWalletPage() {
  const params = useParams()
  const router = useRouter()
  const rawPhone = params.phone as string

  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const phone = rawPhone ? (rawPhone.startsWith('94') ? rawPhone : `94${rawPhone.replace(/^0/, '')}`) : ''

  const [customerName, setCustomerName] = useState<string>('')
  const [customerEmail, setCustomerEmail] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  
  // Profile editing state
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [activeTab, setActiveTab] = useState<'wallet' | 'offers' | 'profile'>('wallet')
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<any[]>([])
  const [activeOffers, setActiveOffers] = useState<any[]>([])
  const [offersLoading, setOffersLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [showQrModal, setShowQrModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [navigatingStoreId, setNavigatingStoreId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const availableCategories = Array.from(
    new Set(
      stores
        .map((s) => s.category)
        .filter((cat) => cat && cat.trim() !== '' && cat.toLowerCase() !== 'others')
    )
  )
  const categoryList = ['All', ...availableCategories]

  useEffect(() => {
    if (!phone) {
      router.replace('/customer/login')
      return
    }

    const checkAuthAndInit = async () => {
      try {
        const session = localStorage.getItem(`retcash_wallet_session_${phone}`)
        const authKey = localStorage.getItem(`retcash_wallet_auth_${phone}`)

        if (!session || !authKey) {
          router.replace('/customer/login')
          return
        }

        const cleanPhone = phone.replace(/\D/g, '')
        const phoneWithZero = cleanPhone.startsWith('94') ? `0${cleanPhone.slice(2)}` : cleanPhone

        const { data: customer, error } = await supabase
          .from('customers')
          .select('id, full_name, email, avatar_url')
          .or(`phone_number.eq.${phone},phone_number.eq.${phoneWithZero}`)
          .maybeSingle()

        if (error || !customer) {
          localStorage.removeItem(`retcash_wallet_session_${phone}`)
          localStorage.removeItem(`retcash_wallet_auth_${phone}`)
          router.replace('/customer/login')
          return
        }

        setCustomerId(customer.id)
        if (customer.full_name) {
          setCustomerName(customer.full_name)
          localStorage.setItem(`customer_name_${phone}`, customer.full_name)
        }
        if (customer.email) setCustomerEmail(customer.email)
        if (customer.avatar_url) setAvatarUrl(customer.avatar_url)

        setIsCheckingAuth(false)

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

        fetchWalletAndClaimsData()
        fetchActiveOffers()

      } catch (err) {
        console.error('Authentication verification error:', err)
        router.replace('/customer/login')
      }
    }

    checkAuthAndInit()

    // Realtime changes listener
    const cleanPhone = phone.replace(/\D/g, '')
    const phoneWithZero = cleanPhone.startsWith('94') ? `0${cleanPhone.slice(2)}` : cleanPhone

    const channel = supabase
      .channel(`wallet_realtime_${phone}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cashback_claims'
        },
        (payload: any) => {
          const updatedPhone = payload.new?.customer_phone || payload.old?.customer_phone
          if (updatedPhone === phone || updatedPhone === phoneWithZero) {
            fetchWalletAndClaimsData()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [phone, router])

  // ==========================================
  // 🎯 FETCH WALLET DATA (கார்டு பக்கத்தைப் போன்று துல்லியமாக எடுக்கும் லாஜிக்)
  // ==========================================
  const fetchWalletAndClaimsData = async () => {
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      const phoneWithZero = cleanPhone.startsWith('94') ? `0${cleanPhone.slice(2)}` : cleanPhone

      // 1. பயனரின் அனைத்து cashback_claims தரவுகளை எடுக்கிறது
      const { data: claimsData, error: claimsError } = await supabase
        .from('cashback_claims')
        .select('*')
        .or(`customer_phone.eq.${phone},customer_phone.eq.${phoneWithZero}`)
        .order('updated_at', { ascending: false })

      if (claimsError) throw claimsError

      if (!claimsData || claimsData.length === 0) {
        setStores([])
        localStorage.setItem(`wallet_cache_${phone}`, JSON.stringify([]))
        setLoading(false)
        return
      }

      // 2. customer_wallet_summary View-லிருந்து மொத்த Redeem / Balance தொகைகளை எடுத்தல்
      const { data: walletSummaries } = await supabase
        .from('customer_wallet_summary')
        .select('store_id, total_redeemed_amount, current_balance, status')
        .or(`customer_phone.eq.${phone},customer_phone.eq.${phoneWithZero}`)

      const summaryMap = new Map<string, any>()
      walletSummaries?.forEach((sum: any) => {
        summaryMap.set(String(sum.store_id), sum)
      })

      // ஒவ்வொரு கடைக்கும் சமீபத்திய Claim தரவை மட்டும் பிரித்தெடுத்தல்
      const latestClaimsMap = new Map<string, any>()
      claimsData.forEach((claim: any) => {
        const storeIdStr = String(claim.store_id)
        if (!latestClaimsMap.has(storeIdStr)) {
          latestClaimsMap.set(storeIdStr, claim)
        }
      })

      const customerStoreIds = Array.from(latestClaimsMap.keys())

      // 3. கடைகளின் விவரங்களை எடுக்கிறது
      const { data: userStores, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .in('id', customerStoreIds)

      if (storeError) throw storeError

      // 4. கார்டு பக்கத்தைப் போன்று நேரடி தரவுகளுடன் இணைத்தல்
      const mergedStores = userStores?.map((store: any) => {
        const latestClaim = latestClaimsMap.get(String(store.id))
        const storeSummary = summaryMap.get(String(store.id))

        const visitCount = Number(latestClaim?.visit_count || 0)
        const claimableAmount = Number(latestClaim?.claimable_amount || 0)

        // நிலையைச் சரிபார்த்தல் (REDEEMED-ஆ இல்லையா?)
        const isRedeemed = latestClaim?.status === 'REDEEMED' || storeSummary?.status === 'REDEEMED'

        // அசல் மொத்தக் கேஷ்பேக் தொகையைக் கணக்கிடுதல் (Rs. 245.00 சரியாக வருவதற்கு)
        const displayRedeemedCashback = Number(
          storeSummary?.total_redeemed_amount > 0 
            ? storeSummary.total_redeemed_amount 
            : (latestClaim?.cashback_amount || latestClaim?.claimable_amount || 0)
        )

        const storeTarget = Number(store.target_visits) || 6

        router.prefetch(`/card/${store.id}?phone=${phone}`)

        return {
          ...store,
          claimId: latestClaim?.id,
          balance: claimableAmount,
          cashbackAmount: displayRedeemedCashback,
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
    if (!storeId || navigatingStoreId) return
    setNavigatingStoreId(storeId)
    startTransition(() => {
      router.push(`/card/${storeId}?phone=${phone}`)
    })
  }

  const handleLogout = () => {
    localStorage.removeItem(`wallet_cache_${phone}`)
    localStorage.removeItem(`retcash_wallet_session_${phone}`)
    localStorage.removeItem(`retcash_wallet_auth_${phone}`)
    localStorage.removeItem(`customer_name_${phone}`)
    router.replace('/customer/login')
  }

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

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!phone) return
    navigator.clipboard.writeText(phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveSearch(searchQuery)
    if (searchInputRef.current) {
      searchInputRef.current.blur()
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file || !customerId) return

      setIsUploadingImage(true)
      setProfileMessage(null)

      const fileExt = file.name.split('.').pop()
      const filePath = `${customerId}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('customers')
        .update({ avatar_url: publicUrl })
        .eq('id', customerId)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      setProfileMessage({ type: 'success', text: 'Profile picture updated successfully!' })
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile picture.' })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) return

    try {
      setIsSavingProfile(true)
      setProfileMessage(null)

      const { error } = await supabase
        .from('customers')
        .update({ full_name: customerName })
        .eq('id', customerId)

      if (error) throw error

      localStorage.setItem(`customer_name_${phone}`, customerName)
      setProfileMessage({ type: 'success', text: 'Name updated successfully!' })
    } catch (err: any) {
      console.error('Update profile error:', err)
      setProfileMessage({ type: 'error', text: err.message || 'Failed to save changes.' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const filteredStores = stores.filter(store => {
    const effectiveQuery = (activeSearch || searchQuery).toLowerCase().trim()
    const storeName = store.store_name?.toLowerCase() || ''
    const storeCat = store.category?.toLowerCase() || ''
    const storeDesc = store.description?.toLowerCase() || ''

    const matchesSearch = !effectiveQuery ||
      storeName.includes(effectiveQuery) ||
      storeCat.includes(effectiveQuery) ||
      storeDesc.includes(effectiveQuery)

    const matchesCategory = selectedCategory === 'All' ||
      storeCat === selectedCategory.toLowerCase()

    return matchesSearch && matchesCategory
  })

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${phone}`

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-[#00875A] rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold mt-3">Verifying wallet session...</p>
      </div>
    )
  }

  return (
    <div className="flex justify-center min-h-full bg-slate-200/60 font-sans selection:bg-[#00875A] selection:text-white antialiased">
      <div className="relative bg-slate-50 w-full max-w-[430px] flex flex-col min-h-screen border-x border-slate-200/50 shadow-2xl">
        
        {/* Header */}
        <header className="sticky top-0 z-40 flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 pt-4 pb-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="RETCASH Logo"
                className="h-9 w-auto object-contain"
              />
              <div>
                <span className="text-[16px] font-black tracking-tight text-slate-800 leading-none block">
                  Red Cash
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  Loyalty Wallet
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
          {activeTab === 'wallet' && (
            <>
              {/* Hero Card */}
              <div
                className="relative rounded-3xl overflow-hidden p-5 text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #00875A 0%, #059669 45%, #0d9488 100%)",
                  boxShadow: "0 8px 32px rgba(0,135,90,0.28)",
                }}
              >
                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute right-4 top-14 w-20 h-20 rounded-full bg-white/8 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-xs">
                      <Sparkles size={11} className="text-emerald-200" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        Digital Loyalty Pass
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 mb-4 flex items-center gap-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white/40 object-cover shadow-sm flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {customerName ? customerName[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] text-white/80 font-medium">Welcome back,</p>
                      <h1 className="text-[20px] font-extrabold leading-tight text-white">
                        {customerName ? customerName : loading ? '...' : 'Valued Customer'}
                      </h1>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="w-full bg-white hover:bg-emerald-50 text-[#00875A] font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition cursor-pointer"
                  >
                    <QrCode size={16} />
                    <span>Show My Pass at Checkout</span>
                  </button>

                  <div className="mt-4 pt-3.5 border-t border-white/20 flex items-center justify-between">
                    <span className="text-[11px] text-white/90 font-semibold">
                      {stores.length} Connected {stores.length === 1 ? 'Store' : 'Stores'}
                    </span>

                    <button
                      onClick={handleCopyPhone}
                      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition text-[11px] font-semibold text-white cursor-pointer"
                      title="Click to copy member ID"
                    >
                      <span>ID: {formatPhoneNumber(phone)}</span>
                      {copied ? <Check size={12} className="text-emerald-200" /> : <Copy size={12} className="text-white/80" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Search Bar */}
              <div className="space-y-3">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <button
                    type="submit"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00875A] transition-colors cursor-pointer p-1"
                    title="Search"
                  >
                    <Search size={16} />
                  </button>
                  <input
                    ref={searchInputRef}
                    type="search"
                    enterKeyHint="search"
                    placeholder="Search any store or category…"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setActiveSearch('')
                    }}
                    className="w-full bg-white rounded-2xl pl-11 pr-10 py-3.5 text-sm text-slate-700 placeholder-slate-400 shadow-xs border border-slate-100 outline-none focus:ring-2 focus:ring-[#00875A]/20 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setActiveSearch('')
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </form>

                {/* Dynamic Category Filter Pills */}
                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                  {categoryList.map((cat) => {
                    const active = selectedCategory === cat
                    const CatIcon = getCategoryIcon(cat)
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 cursor-pointer"
                        style={
                          active
                            ? {
                                background: '#00875A',
                                color: '#fff',
                                boxShadow: '0 4px 14px rgba(0,135,90,0.35)',
                              }
                            : {
                                background: '#fff',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                              }
                        }
                      >
                        <CatIcon
                          size={13}
                          style={{ color: active ? '#fff' : '#94a3b8' }}
                        />
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Store Header */}
              <div className="flex items-center justify-between px-0.5 pt-1">
                <h2 className="text-[13px] font-bold text-slate-700">
                  {filteredStores.length} {selectedCategory === 'All' ? 'stores' : selectedCategory + ' stores'}
                </h2>
              </div>

              {/* Stores Listing */}
              {loading && stores.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-3 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-200"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-3 bg-slate-100 rounded w-1/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                    <ShoppingBag size={28} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No store cards found</p>
                  <p className="text-xs text-slate-400 mt-1">Share member ID at store checkout</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStores.map((store) => {
                    const style = getCategoryColor(store.category)
                    const Icon = getCategoryIcon(store.category)
                    const visits = store.visits || 0
                    const targetVisits = store.targetVisits || 6
                    const isThisNavigating = navigatingStoreId === store.id

                    const hasValidCategory =
                      store.category &&
                      store.category.trim() !== '' &&
                      store.category.toLowerCase() !== 'others'

                    return (
                      <div
                        key={store.id}
                        onClick={() => handleStoreClick(store.id)}
                        onMouseEnter={() => router.prefetch(`/card/${store.id}?phone=${phone}`)}
                        className={`bg-white rounded-3xl p-4 shadow-xs border border-slate-100 active:scale-[0.985] transition-transform duration-150 cursor-pointer hover:border-slate-200 ${
                          isThisNavigating ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Store Icon / Logo */}
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ background: style.bgColor }}
                          >
                            {store.logo_url ? (
                              <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
                            ) : (
                              <Icon size={22} style={{ color: style.color }} />
                            )}
                          </div>

                          {/* Main Content Area */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              
                              {/* Store Title & Category */}
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold text-slate-800 leading-snug truncate" title={store.store_name}>
                                  {store.store_name} {isThisNavigating && '(Opening...)'}
                                </h3>

                                {hasValidCategory && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize inline-block truncate max-w-full"
                                      style={{ background: style.bgColor, color: style.color }}
                                    >
                                      {store.category}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Cashback Amount Display */}
                              <div className="text-right flex-shrink-0">
                                {store.isRedeemed ? (
                                  <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                                      REDEEMED
                                    </p>
                                    <p className="text-sm font-bold text-slate-400 line-through leading-tight mt-0.5">
                                      Rs. {Number(store.cashbackAmount || 0).toFixed(2)}
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-[10px] text-slate-700 font-black uppercase tracking-wider">
                                      CASHBACK
                                    </p>
                                    <p className="text-sm font-extrabold text-[#00875A] leading-tight mt-0.5">
                                      Rs. {Number(store.balance).toFixed(2)}
                                    </p>
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* Visit Counter */}
                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-700 flex-shrink-0 whitespace-nowrap">
                                {visits} / {targetVisits} visits
                              </span>
                              <VisitCapsules
                                visits={visits}
                                maxVisits={targetVisits}
                                color={style.color}
                              />
                            </div>
                          </div>

                          <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'offers' && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Megaphone className="w-5 h-5 text-[#00875A]" />
                  <h1 className="text-lg font-black text-[#0F172A]">Store Offers & Deals</h1>
                </div>
                <p className="text-xs text-slate-500">Exclusive active offers posted by stores.</p>
              </div>

              {offersLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold">Loading store offers...</div>
              ) : activeOffers.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center space-y-2 shadow-xs border border-slate-100">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">No active store offers available right now.</p>
                </div>
              ) : (
                activeOffers.map((offer) => (
                  <div key={offer.id} className="bg-white rounded-3xl p-4 space-y-3 shadow-xs border border-slate-100">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-xs text-[#00875A]">
                          {offer.stores?.store_name?.[0] || 'S'}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[#0F172A]">{offer.stores?.store_name || 'Store'}</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Active Promotion</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-[#00875A] px-2.5 py-1 rounded-full font-bold border border-emerald-100 uppercase tracking-wider">
                        Deal
                      </span>
                    </div>

                    {offer.image_url && (
                      <div
                        onClick={() => setSelectedImage(offer.image_url)}
                        className="relative w-full h-44 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 cursor-pointer group"
                      >
                        <img
                          src={offer.image_url}
                          alt={offer.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute bottom-2 right-2 bg-slate-900/60 text-white p-1.5 rounded-lg backdrop-blur-xs">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[#0F172A]">{offer.title}</h4>
                      {offer.description && (
                        <p className="text-xs text-slate-500 leading-relaxed">{offer.description}</p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Ends: {new Date(offer.expires_at).toLocaleDateString()}
                      </span>
                      {offer.stores?.id && (
                        <button
                          onClick={() => handleStoreClick(offer.stores.id)}
                          className="text-xs font-bold text-[#00875A] hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <span>View Card</span>
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
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <h1 className="text-lg font-black text-[#0F172A]">My Profile</h1>
                <p className="text-xs text-slate-500">Manage your personal information.</p>
              </div>

              {profileMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-50 text-[#00875A] border border-emerald-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}

              <div className="bg-white rounded-3xl p-5 space-y-5 shadow-xs border border-slate-100">
                <div className="flex flex-col items-center justify-center space-y-3 pb-2 border-b border-slate-100">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 text-[#00875A] flex items-center justify-center font-black text-2xl border-2 border-emerald-100 overflow-hidden shadow-xs">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10" />
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-[#00875A] text-white p-2 rounded-full shadow-md hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                      title="Upload Avatar"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Click camera button to upload new photo
                  </span>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      placeholder="Enter full name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#00875A]/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <span>Phone Number</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      value={formatPhoneNumber(phone)}
                      disabled
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-semibold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <span>Email Address</span>
                      <Lock className="w-3 h-3 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      value={customerEmail || 'No email associated'}
                      disabled
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-semibold cursor-not-allowed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full bg-[#00875A] hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Fixed Bottom Nav */}
        <nav
          className="fixed bottom-0 max-w-[430px] w-full z-30 bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <div className="flex items-center justify-around px-4 pt-2 pb-1">
            {[
              { id: 'wallet', label: 'Wallet', Icon: Wallet },
              { id: 'offers', label: 'Offers', Icon: Tag },
              { id: 'profile', label: 'Profile', Icon: User },
            ].map(({ id, label, Icon }) => {
              const active = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                    active ? 'shadow-md' : ''
                  }`}
                  style={
                    active
                      ? {
                          background: '#00875A',
                          color: '#ffffff',
                          boxShadow: '0 4px 14px rgba(0,135,90,0.35)',
                        }
                      : {
                          background: 'transparent',
                          color: '#64748B',
                        }
                  }
                >
                  <Icon
                    size={18}
                    style={{ color: active ? '#ffffff' : '#64748B' }}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span className="text-xs font-xs font-extrabold leading-none">
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Image Modal */}
        {selectedImage && (
          <div
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-sm w-full p-2">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-2 text-white bg-white/20 p-2 rounded-full cursor-pointer"
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

        {/* QR Code / Digital Pass Modal */}
        {showQrModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl relative">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-[#0F172A] bg-slate-100 p-1.5 rounded-full cursor-pointer transition hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 pt-2">
                <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider">My Digital Loyalty Pass</h3>
                <p className="text-[11px] text-slate-500 font-medium">Show phone number or QR at store checkout</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-100 shadow-inner">
                <img src={qrCodeUrl} alt="Customer QR Code" className="w-48 h-48 mx-auto rounded-xl" />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 py-2.5 px-4 rounded-xl flex items-between justify-between">
                <p className="text-xs font-bold text-[#00875A]">{formatPhoneNumber(phone)}</p>
                <button
                  onClick={handleCopyPhone}
                  className="text-[10px] bg-[#00875A] text-white px-2 py-1 rounded-md font-semibold cursor-pointer"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}