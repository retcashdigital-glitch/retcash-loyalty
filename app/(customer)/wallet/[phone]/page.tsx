'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProfileInstallSection from '@/components/ProfileInstallSection'
import CustomerLangSwitcher from '@/components/CustomerLangSwitcher'
import { useCustomerLang } from '@/lib/i18n/useCustomerLang'
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
  Dumbbell,
  Gamepad2,
  Pill,
  BookOpen,
  Car,
  Sparkle,
  Wrench,
  Camera,
  Loader2,
  Lock,
  Bell,
  BellRing,
  RefreshCw
} from 'lucide-react'

const NAV_TAB_IDS = [
  { id: 'wallet', Icon: Wallet },
  { id: 'offers', Icon: Tag },
  { id: 'profile', Icon: User },
] as const

type NavTabId = (typeof NAV_TAB_IDS)[number]['id']

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

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

function sortStoresByLatestActivity(storeList: any[]) {
  return [...storeList].sort((a, b) => {
    const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
    const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
    return timeB - timeA
  })
}

export default function CustomerWalletPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useCustomerLang()
  const rawPhone = (params?.phone as string) || ''

  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  let decodedRawPhone = rawPhone
  try {
    decodedRawPhone = decodeURIComponent(rawPhone)
  } catch {
    decodedRawPhone = rawPhone
  }
  const cleanedDigits = decodedRawPhone.replace(/\D/g, '')
  const phone = cleanedDigits
    ? cleanedDigits.startsWith('94')
      ? cleanedDigits
      : `94${cleanedDigits.replace(/^0+/, '')}`
    : ''

  const [customerName, setCustomerName] = useState<string>('')
  const [customerEmail, setCustomerEmail] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [activeTab, setActiveTab] = useState<NavTabId>('wallet')
  const [loading, setLoading] = useState(true)
  const [walletError, setWalletError] = useState<string | null>(null)
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

  const [notifPermission, setNotifPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('unsupported')
  const [isSubscribingNotif, setIsSubscribingNotif] = useState(false)
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false)

  const [dragProgress, setDragProgress] = useState<number | null>(null)
  const [isDraggingNav, setIsDraggingNav] = useState(false)
  const navPillRef = useRef<HTMLDivElement>(null)
  const pointerStartXRef = useRef<number>(0)
  const hasDraggedRef = useRef<boolean>(false)
  const isPointerDownRef = useRef<boolean>(false)

  const isFetchingRef = useRef<boolean>(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const navTabs = [
    { id: 'wallet' as const, label: t.navWallet, Icon: Wallet },
    { id: 'offers' as const, label: t.navOffers, Icon: Tag },
    { id: 'profile' as const, label: t.navProfile, Icon: User },
  ]

  const availableCategories = Array.from(
    new Set(
      stores
        .map((s) => s.category)
        .filter((cat) => cat && cat.trim() !== '' && cat.toLowerCase() !== 'others')
    )
  )
  const categoryList = ['All', ...availableCategories]

  useEffect(() => {
    if (typeof window === 'undefined' || !phone) return

    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'offers' || tabParam === 'profile' || tabParam === 'wallet') {
      setActiveTab(tabParam)
    }

    const ua = window.navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(ua)
    const isStandalone =
      Boolean((window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches

    if (isIos && !isStandalone) {
      setIsIosNotStandalone(true)
    }

    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setNotifPermission(Notification.permission)

      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          if (Notification.permission === 'granted') {
            const existingSub = await reg.pushManager.getSubscription()
            if (existingSub) {
              const syncKey = `retcash_push_synced_${phone}`
              const alreadySyncedEndpoint = localStorage.getItem(syncKey)
              if (alreadySyncedEndpoint !== existingSub.endpoint) {
                const res = await fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone, subscription: existingSub.toJSON() }),
                })
                if (res.ok) {
                  localStorage.setItem(syncKey, existingSub.endpoint)
                }
              }
            }
          }
        })
        .catch((err) => console.error('Service Worker registration failed:', err))
    } else {
      setNotifPermission('unsupported')
    }
  }, [phone])

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !phone) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing')
      return
    }

    try {
      setIsSubscribingNotif(true)
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)

      if (permission !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          subscription: subscription.toJSON(),
        }),
      })
      if (res.ok) {
        localStorage.setItem(`retcash_push_synced_${phone}`, subscription.endpoint)
      }
    } catch (err) {
      console.error('Failed to enable push notifications:', err)
    } finally {
      setIsSubscribingNotif(false)
    }
  }

  const reloadFromCache = () => {
    if (!phone || typeof window === 'undefined') return
    const cachedName = localStorage.getItem(`customer_name_${phone}`)
    if (cachedName) {
      setCustomerName((prev) => prev || cachedName)
    }

    const cachedData = localStorage.getItem(`wallet_cache_${phone}`)
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData)
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item: any) => {
            const target = Math.max(1, Number(item.targetVisits) || 6)
            const rawVisits = Number(item.visits || 0)
            const fixedVisits = item.isRedeemed && rawVisits === 0 ? target : rawVisits
            return {
              ...item,
              visits: fixedVisits,
              targetVisits: target
            }
          })
          setStores(sortStoresByLatestActivity(normalized))
          setLoading(false)
        }
      } catch (e) {
        console.error('Error parsing wallet cache reload:', e)
      }
    }
  }

  useEffect(() => {
    if (!phone) {
      router.replace('/customer/login')
      return
    }

    const session = localStorage.getItem(`retcash_wallet_session_${phone}`)
    const authKey = localStorage.getItem(`retcash_wallet_auth_${phone}`)

    if (!session || !authKey) {
      router.replace('/customer/login')
      return
    }

    reloadFromCache()
    setIsCheckingAuth(false)

    // Single unified call: verifies session cookie AND loads wallet data in 1 network hop
    fetchWalletAndClaimsData(true)

    // RLS-safe Realtime Broadcast listener for instant updates when merchant bills or redeems
    const realtimeWalletChannel = supabase
      .channel(`realtime-wallet-${phone}`)
      .on(
        'broadcast',
        { event: 'wallet_updated' },
        () => {
          fetchWalletAndClaimsData(false)
        }
      )
      .subscribe()

    let syncChannel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      syncChannel = new BroadcastChannel('retcash_wallet_sync')
      syncChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'WALLET_DATA_UPDATED' && event.data.phone === phone) {
          if (event.data.updatedClaim) {
            try {
              const cachedRaw = localStorage.getItem(`wallet_cache_${phone}`)
              if (cachedRaw) {
                const parsed = JSON.parse(cachedRaw)
                const targetStoreId = String(event.data.updatedClaim.store_id || event.data.updatedClaim.stores?.id || '')
                const targetClaimId = String(event.data.updatedClaim.id || '')
                const updatedList = parsed.map((s: any) => {
                  if (String(s.id) === targetStoreId || String(s.claimId) === targetClaimId) {
                    return {
                      ...s,
                      lastActivityAt: event.data.updatedClaim.updated_at || new Date().toISOString()
                    }
                  }
                  return s
                })
                const sortedList = sortStoresByLatestActivity(updatedList)
                localStorage.setItem(`wallet_cache_${phone}`, JSON.stringify(sortedList))
              }
            } catch (e) {
              console.error('Error updating latest activity timestamp in cache:', e)
            }
          }
          reloadFromCache()
          fetchWalletAndClaimsData(false)
        }
      }
    }

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        reloadFromCache()
        fetchWalletAndClaimsData(false)
      }
    }

    window.addEventListener('visibilitychange', handleFocusOrVisibility)
    window.addEventListener('focus', handleFocusOrVisibility)

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchWalletAndClaimsData(false)
      }
    }, 10000)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(realtimeWalletChannel)
      if (syncChannel) syncChannel.close()
      window.removeEventListener('visibilitychange', handleFocusOrVisibility)
      window.removeEventListener('focus', handleFocusOrVisibility)
    }
  }, [phone, router])

  const fetchWalletAndClaimsData = async (verifyCustomerExists = false) => {
    if (isFetchingRef.current && !verifyCustomerExists) return
    isFetchingRef.current = true

    try {
      if (activeOffers.length === 0) {
        setOffersLoading(true)
      }
      setWalletError(null)

      const existingCacheMap = new Map<string, any>()
      if (typeof window !== 'undefined') {
        try {
          const existingRaw = localStorage.getItem(`wallet_cache_${phone}`)
          if (existingRaw) {
            const existingArr = JSON.parse(existingRaw)
            if (Array.isArray(existingArr)) {
              existingArr.forEach((item: any) => existingCacheMap.set(String(item.id), item))
            }
          }
        } catch (e) {
          console.error('Error reading existing wallet cache:', e)
        }
      }

      const res = await fetch('/api/customer/wallet-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_wallet', phone }),
      })

      const payload = await res.json().catch(() => ({}))

      if (res.status === 401 || res.status === 403 || payload?.authenticated === false) {
        localStorage.removeItem(`retcash_wallet_session_${phone}`)
        localStorage.removeItem(`retcash_wallet_auth_${phone}`)
        router.replace('/customer/login')
        return
      }

      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to fetch wallet data')
      }

      const {
        customer,
        claimsData,
        walletSummaries,
        lastRedeemedTxs,
        userStores,
        activeOffers: fetchedOffers,
      } = payload

      if (verifyCustomerExists) {
        if (!customer) {
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
      }

      if (Array.isArray(fetchedOffers)) {
        setActiveOffers(fetchedOffers)
      }

      if (!claimsData || claimsData.length === 0) {
        setStores([])
        localStorage.setItem(`wallet_cache_${phone}`, JSON.stringify([]))
        setLoading(false)
        return
      }

      const summaryMap = new Map<string, any>()
      walletSummaries?.forEach((sum: any) => {
        summaryMap.set(String(sum.store_id), sum)
      })

      const lastRedeemedMap = new Map<string, number>()
      lastRedeemedTxs?.forEach((tx: any) => {
        const claimIdStr = String(tx.claim_id)
        if (!lastRedeemedMap.has(claimIdStr)) {
          lastRedeemedMap.set(claimIdStr, Number(tx.cashback_amount || 0))
        }
      })

      const latestClaimsMap = new Map<string, any>()
      claimsData.forEach((claim: any) => {
        const storeIdStr = String(claim.store_id)
        if (!latestClaimsMap.has(storeIdStr)) {
          latestClaimsMap.set(storeIdStr, claim)
        }
      })

      const mergedStores = userStores?.map((store: any) => {
        const latestClaim = latestClaimsMap.get(String(store.id))
        const storeSummary = summaryMap.get(String(store.id))

        const rawVisitCount = Number(latestClaim?.visit_count || 0)
        const claimableAmount = Number(latestClaim?.claimable_amount || 0)
        const claimStatus = latestClaim?.status || storeSummary?.status || 'PENDING'

        const isRedeemed = latestClaim
          ? latestClaim.status === 'REDEEMED'
          : storeSummary?.status === 'REDEEMED'
        const isReadyToRedeem = !isRedeemed && claimStatus === 'READY' && claimableAmount > 0

        const lastRedeemedVal = latestClaim ? lastRedeemedMap.get(String(latestClaim.id)) : 0
        const displayRedeemedCashback = (lastRedeemedVal && lastRedeemedVal > 0)
          ? lastRedeemedVal
          : Number(latestClaim?.cashback_amount || 0)

        const storeTarget = Math.max(1, Number(store.target_visits) || 6)
        const visitCount = isRedeemed && rawVisitCount === 0 ? storeTarget : rawVisitCount
        const lastActivityAt = latestClaim?.updated_at || latestClaim?.created_at || store.created_at || ''

        const prevCached = existingCacheMap.get(String(store.id))
        const isSameState = prevCached &&
          prevCached.visits === visitCount &&
          prevCached.isRedeemed === isRedeemed &&
          prevCached.isReadyToRedeem === isReadyToRedeem &&
          Number(prevCached.balance) === claimableAmount &&
          Number(prevCached.cashbackAmount) === displayRedeemedCashback

        router.prefetch(`/card/${store.id}?phone=${phone}`)

        return {
          ...store,
          claimId: latestClaim?.id,
          balance: claimableAmount,
          cashbackAmount: displayRedeemedCashback,
          isRedeemed,
          isReadyToRedeem,
          visits: visitCount,
          targetVisits: storeTarget,
          lastActivityAt,
          latestTransaction: isSameState ? prevCached.latestTransaction : undefined
        }
      }) || []

      const sortedStores = sortStoresByLatestActivity(mergedStores)

      setStores(sortedStores)
      localStorage.setItem(`wallet_cache_${phone}`, JSON.stringify(sortedStores))
    } catch (err: any) {
      console.error('Error in fetching wallet data:', err)
      setWalletError(err?.message || 'Unable to load store cards right now.')
    } finally {
      isFetchingRef.current = false
      setLoading(false)
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

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
    } catch {
      // Proceed with local cleanup even if offline
    }
    localStorage.removeItem(`wallet_cache_${phone}`)
    localStorage.removeItem(`retcash_wallet_session_${phone}`)
    localStorage.removeItem(`retcash_wallet_auth_${phone}`)
    localStorage.removeItem(`customer_name_${phone}`)
    localStorage.removeItem(`retcash_push_synced_${phone}`)
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

      const formData = new FormData()
      formData.append('action', 'upload_avatar')
      formData.append('file', file)
      formData.append('customerId', customerId)
      formData.append('phone', phone)

      const res = await fetch('/api/customer/wallet-data', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile picture.')
      }

      setAvatarUrl(data.avatarUrl)
      setProfileMessage({ type: 'success', text: t.avatarSuccess })
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

      const res = await fetch('/api/customer/wallet-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          customerId,
          phone,
          fullName: customerName,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save changes.')
      }

      localStorage.setItem(`customer_name_${phone}`, customerName)
      setProfileMessage({ type: 'success', text: t.nameSuccess })
    } catch (err: any) {
      console.error('Update profile error:', err)
      setProfileMessage({ type: 'error', text: err.message || 'Failed to save changes.' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const getProgressFromClientX = (clientX: number) => {
    if (!navPillRef.current) return 0
    const rect = navPillRef.current.getBoundingClientRect()
    const horizontalPadding = 6
    const innerLeft = rect.left + horizontalPadding
    const innerWidth = Math.max(1, rect.width - horizontalPadding * 2)
    const tabWidth = innerWidth / navTabs.length
    const rawIndex = (clientX - innerLeft - tabWidth / 2) / tabWidth
    return Math.min(navTabs.length - 1, Math.max(0, rawIndex))
  }

  const getTappedIndexFromClientX = (clientX: number) => {
    if (!navPillRef.current) return 0
    const rect = navPillRef.current.getBoundingClientRect()
    const relX = Math.min(rect.width - 1, Math.max(0, clientX - rect.left))
    return Math.min(navTabs.length - 1, Math.floor((relX / rect.width) * navTabs.length))
  }

  const handleNavPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true
    hasDraggedRef.current = false
    pointerStartXRef.current = e.clientX
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Ignore if pointer capture is unavailable
    }
  }

  const handleNavPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return
    const deltaX = Math.abs(e.clientX - pointerStartXRef.current)

    if (deltaX > 6 || hasDraggedRef.current) {
      hasDraggedRef.current = true
      setIsDraggingNav(true)
      const nextProgress = getProgressFromClientX(e.clientX)
      setDragProgress(nextProgress)

      const nearestIdx = Math.round(nextProgress)
      const targetTab = navTabs[nearestIdx]?.id
      if (targetTab && targetTab !== activeTab) {
        setActiveTab(targetTab)
      }
    }
  }

  const handleNavPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return
    isPointerDownRef.current = false

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Ignore
    }

    if (hasDraggedRef.current) {
      const finalProgress = getProgressFromClientX(e.clientX)
      const snappedIdx = Math.round(finalProgress)
      const targetTab = navTabs[snappedIdx]?.id
      if (targetTab) {
        setActiveTab(targetTab)
      }
    } else {
      const tappedIdx = getTappedIndexFromClientX(e.clientX)
      const targetTab = navTabs[tappedIdx]?.id
      if (targetTab) {
        setActiveTab(targetTab)
      }
    }

    hasDraggedRef.current = false
    setIsDraggingNav(false)
    setDragProgress(null)
  }

  const handleNavPointerCancel = () => {
    isPointerDownRef.current = false
    hasDraggedRef.current = false
    setIsDraggingNav(false)
    setDragProgress(null)
  }

  const activeTabIndex = Math.max(0, navTabs.findIndex((tab) => tab.id === activeTab))
  const visualPillIndex = dragProgress !== null ? dragProgress : activeTabIndex

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
        <p className="text-xs text-slate-500 font-semibold mt-3">{t.verifyingSession}</p>
      </div>
    )
  }

  return (
    <div className="flex justify-center min-h-full bg-slate-200/60 font-sans selection:bg-[#00875A] selection:text-white antialiased">
      <div className="relative bg-slate-50 w-full max-w-[430px] flex flex-col min-h-screen border-x border-slate-200/50 shadow-2xl">
        
        <header className="sticky top-0 z-40 flex-shrink-0 bg-white border-b border-slate-200/80 px-4 pt-3.5 pb-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo.png"
                alt="RETCASH Logo"
                className="h-8 w-auto object-contain shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[15px] font-black tracking-tight text-slate-800 leading-none block uppercase">
                  RETCASH
                </span>
                <span className="text-[10px] text-slate-400 font-bold tracking-wide block mt-0.5 truncate leading-normal">
                  {t.loyaltyWallet}
                </span>
              </div>
            </div>

            <CustomerLangSwitcher />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
          {activeTab === 'wallet' && (
            <>
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
                      <Sparkles size={11} className="text-emerald-200 shrink-0" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider leading-normal">
                        {t.digitalLoyaltyPass}
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
                    <div className="min-w-0">
                      <p className="text-[11px] text-white/80 font-medium leading-normal">{t.welcomeBackShort}</p>
                      <h1 className="text-[20px] font-extrabold leading-tight text-white truncate">
                        {customerName ? customerName : loading ? '...' : t.valuedCustomer}
                      </h1>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="w-full bg-white hover:bg-emerald-50 text-[#00875A] font-extrabold text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition cursor-pointer leading-normal"
                  >
                    <QrCode size={16} className="shrink-0" />
                    <span>{t.showPassAtCheckout}</span>
                  </button>

                  <div className="mt-4 pt-3.5 border-t border-white/20 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/90 font-semibold truncate leading-normal">
                      {t.connectedStores(stores.length)}
                    </span>

                    <button
                      onClick={handleCopyPhone}
                      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition text-[11px] font-semibold text-white cursor-pointer whitespace-nowrap shrink-0"
                      title="Click to copy member ID"
                    >
                      <span>ID: {formatPhoneNumber(phone)}</span>
                      {copied ? <Check size={12} className="text-emerald-200 shrink-0" /> : <Copy size={12} className="text-white/80 shrink-0" />}
                    </button>
                  </div>
                </div>
              </div>

              {notifPermission === 'default' && (
                <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#00875A] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Bell size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 leading-snug">
                        Get Instant Cashback & Offer Alerts
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                        Tap to receive alerts when you earn rewards or new store deals drop.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEnableNotifications}
                    disabled={isSubscribingNotif}
                    className="bg-[#00875A] hover:bg-emerald-700 text-white text-[11px] font-extrabold px-3 py-2 rounded-xl shrink-0 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSubscribingNotif ? '...' : 'Enable'}
                  </button>
                </div>
              )}

              {isIosNotStandalone && notifPermission !== 'granted' && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-[11px] text-amber-900 font-medium leading-snug">
                  <strong>iPhone Tip:</strong> Tap <strong>Share → Add to Home Screen</strong> to install RETCASH and receive instant cashback & offer notifications.
                </div>
              )}

              <div className="space-y-3">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <button
                    type="submit"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-500 hover:text-[#00875A] transition-colors cursor-pointer p-1"
                    title="Search"
                  >
                    <Search size={16} />
                  </button>
                  <input
                    ref={searchInputRef}
                    type="search"
                    enterKeyHint="search"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setActiveSearch('')
                    }}
                    className="w-full bg-white rounded-2xl pl-11 pr-10 py-3.5 text-sm text-slate-800 font-medium placeholder-slate-500 shadow-xs border border-slate-200 outline-none focus:ring-2 focus:ring-[#00875A]/20 focus:border-[#00875A] transition leading-normal"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setActiveSearch('')
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </form>

                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                  {categoryList.map((cat) => {
                    const active = selectedCategory === cat
                    const CatIcon = getCategoryIcon(cat)
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 cursor-pointer leading-normal"
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
                          className="shrink-0"
                          style={{ color: active ? '#fff' : '#94a3b8' }}
                        />
                        {cat === 'All' ? t.allCategory : cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between px-0.5 pt-1">
                <h2 className="text-[13px] font-bold text-slate-700 leading-normal">
                  {t.storesCount(filteredStores.length, selectedCategory)}
                </h2>
              </div>

              {walletError && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-amber-900 leading-snug">
                    {walletError}
                  </p>
                  <button
                    type="button"
                    onClick={() => fetchWalletAndClaimsData(true)}
                    className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shrink-0 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Retry</span>
                  </button>
                </div>
              )}

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
                  <p className="text-sm font-semibold text-slate-500 leading-normal">{t.noStoreCards}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">{t.shareIdHint}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStores.map((store) => {
                    const style = getCategoryColor(store.category)
                    const Icon = getCategoryIcon(store.category)
                    const visits = store.visits || 0
                    const targetVisits = Math.max(1, store.targetVisits || 6)
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

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold text-slate-800 leading-snug truncate" title={store.store_name}>
                                  {store.store_name} {isThisNavigating && t.openingStore}
                                </h3>

                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {hasValidCategory && (
                                    <span
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize inline-block truncate max-w-full"
                                      style={{ background: style.bgColor, color: style.color }}
                                    >
                                      {store.category}
                                    </span>
                                  )}
                                  {store.isReadyToRedeem && (
                                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#00875A] text-white uppercase tracking-wider">
                                      READY
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                {store.isRedeemed ? (
                                  <div>
                                    <p className="text-[10px] text-black font-black uppercase tracking-wider flex items-center justify-end gap-1 leading-normal">
                                      <span>✓</span> {t.claimedLabel}
                                    </p>
                                    <p className="text-sm font-bold text-slate-400 leading-tight mt-0.5 whitespace-nowrap">
                                      Rs. {Number(store.cashbackAmount || 0).toFixed(2)}
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-[10px] text-slate-700 font-black uppercase tracking-wider leading-normal">
                                      {t.cashbackLabel}
                                    </p>
                                    <p className="text-sm font-extrabold text-[#00875A] leading-tight mt-0.5 whitespace-nowrap">
                                      Rs. {Number(store.balance).toFixed(2)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-700 flex-shrink-0 whitespace-nowrap leading-normal">
                                {t.visitsProgress(visits, targetVisits)}
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
                  <Megaphone className="w-5 h-5 text-[#00875A] shrink-0" />
                  <h1 className="text-lg font-black text-[#0F172A] leading-normal">{t.storeOffersTitle}</h1>
                </div>
                <p className="text-xs text-slate-500 leading-normal">{t.storeOffersDesc}</p>
              </div>

              {offersLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold leading-normal">{t.loadingOffers}</div>
              ) : activeOffers.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center space-y-2 shadow-xs border border-slate-100">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold leading-normal">{t.noActiveOffers}</p>
                </div>
              ) : (
                activeOffers.map((offer) => {
                  const storeLogo =
                    offer.stores?.logo_url ||
                    stores.find((s) => String(s.id) === String(offer.store_id))?.logo_url

                  return (
                    <div key={offer.id} className="bg-white rounded-3xl p-4 space-y-3 shadow-xs border border-slate-100">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-xs text-[#00875A] shrink-0 overflow-hidden">
                            {storeLogo ? (
                              <img
                                src={storeLogo}
                                alt={offer.stores?.store_name || 'Store Logo'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              offer.stores?.store_name?.[0]?.toUpperCase() || 'S'
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-[#0F172A] truncate leading-normal">{offer.stores?.store_name || 'Store'}</h3>
                            <p className="text-[10px] text-slate-400 font-medium leading-normal">{t.activePromotion}</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-[#00875A] px-2.5 py-1 rounded-full font-bold border border-emerald-100 uppercase tracking-wider whitespace-nowrap shrink-0">
                          {t.dealBadge}
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
                        <h4 className="font-bold text-sm text-[#0F172A] leading-normal">{offer.title}</h4>
                        {offer.description && (
                          <p className="text-xs text-slate-500 leading-relaxed">{offer.description}</p>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 leading-normal">
                          {t.endsLabel} {new Date(offer.expires_at).toLocaleDateString()}
                        </span>
                        {offer.stores?.id && (
                          <button
                            onClick={() => handleStoreClick(offer.stores.id)}
                            className="text-xs font-bold text-[#00875A] hover:underline flex items-center space-x-1 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <span>{t.viewCard}</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <h1 className="text-lg font-black text-[#0F172A] leading-normal">{t.myProfileTitle}</h1>
                <p className="text-xs text-slate-500 leading-normal">{t.myProfileDesc}</p>
              </div>

              {profileMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold leading-normal ${
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
                  <span className="text-[11px] font-semibold text-slate-400 leading-normal">
                    {t.uploadPhotoHint}
                  </span>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 leading-normal">
                      {t.fullNameLabel}
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      placeholder={t.enterFullNamePlaceholder}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#00875A]/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1 leading-normal">
                      <span>{t.mobileLabel}</span>
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
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
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1 leading-normal">
                      <span>{t.emailAddressLabel}</span>
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    </label>
                    <input
                      type="text"
                      value={customerEmail || t.noEmailAssociated}
                      disabled
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-semibold cursor-not-allowed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full bg-[#00875A] hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50 leading-normal"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>{t.savingChangesBtn}</span>
                      </>
                    ) : (
                      <span>{t.saveChangesBtn}</span>
                    )}
                  </button>
                </form>

                {notifPermission !== 'unsupported' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-[#00875A] shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Push Notifications</span>
                    </div>
                    {notifPermission === 'granted' ? (
                      <span className="text-[11px] font-extrabold text-[#00875A] bg-emerald-50 px-2.5 py-1 rounded-full">
                        Active ✓
                      </span>
                    ) : notifPermission === 'denied' ? (
                      <span className="text-[10px] font-bold text-slate-400">
                        Blocked in Browser Settings
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        disabled={isSubscribingNotif}
                        className="text-[11px] font-extrabold bg-[#00875A] text-white px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        {isSubscribingNotif ? '...' : 'Turn On'}
                      </button>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer leading-normal"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{t.logoutBtn}</span>
                  </button>
                </div>
              </div>

              <ProfileInstallSection />
            </div>
          )}
        </main>

        <nav
          className="fixed bottom-0 max-w-[430px] w-full z-30 px-3 pt-2 pointer-events-none"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
        >
          <div
            ref={navPillRef}
            onPointerDown={handleNavPointerDown}
            onPointerMove={handleNavPointerMove}
            onPointerUp={handleNavPointerUp}
            onPointerCancel={handleNavPointerCancel}
            style={{ touchAction: 'none' }}
            className="pointer-events-auto relative mx-auto max-w-[375px] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.12)] select-none cursor-pointer"
          >
            <div className="relative grid grid-cols-3 items-center">
              <div
                aria-hidden="true"
                className={`absolute top-0 bottom-0 left-0 w-1/3 rounded-full bg-[#00875A] shadow-[0_4px_14px_rgba(0,135,90,0.35)] ${
                  isDraggingNav ? 'transition-none' : 'transition-transform duration-300 ease-out'
                }`}
                style={{
                  transform: `translateX(${visualPillIndex * 100}%)`,
                }}
              />

              {navTabs.map(({ id, label, Icon }, idx) => {
                const closeness = Math.max(0, 1 - Math.abs(visualPillIndex - idx))
                const isHighlighted = closeness > 0.5

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (!hasDraggedRef.current) {
                        setActiveTab(id)
                      }
                    }}
                    className="relative z-10 min-w-0 flex items-center justify-center gap-1 py-2.5 px-1.5 rounded-full transition-colors duration-150 cursor-pointer"
                  >
                    <Icon
                      size={16}
                      className="shrink-0"
                      style={{ color: isHighlighted ? '#ffffff' : '#64748B' }}
                      strokeWidth={isHighlighted ? 2.3 : 1.9}
                    />
                    <span
                      className="text-xs font-extrabold leading-normal tracking-tight truncate"
                      style={{ color: isHighlighted ? '#ffffff' : '#64748B' }}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

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
                <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider leading-normal">
                  {t.myDigitalPassModalTitle}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-normal">{t.showQrCheckoutDesc}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-100 shadow-inner">
                <img src={qrCodeUrl} alt="Customer QR Code" className="w-48 h-48 mx-auto rounded-xl" />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 py-2.5 px-4 rounded-xl flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#00875A] whitespace-nowrap">{formatPhoneNumber(phone)}</p>
                <button
                  onClick={handleCopyPhone}
                  className="text-[10px] bg-[#00875A] text-white px-2 py-1 rounded-md font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copied ? t.copiedBtn : t.copyBtn}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}