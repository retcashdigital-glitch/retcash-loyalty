'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ClientCardView from './ClientCardView'

export default function SingleCardPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()

    const paramId = params.id as string
    const rawPhone = searchParams.get('phone') || ''

    const phone = rawPhone
        ? (rawPhone.startsWith('94') ? rawPhone : `94${rawPhone.replace(/^0/, '')}`)
        : ''

    const [claim, setClaim] = useState<any>(null)
    const [latestTransaction, setLatestTransaction] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [accessDenied, setAccessDenied] = useState(false)

    const updateWalletCacheAndNotify = (
        formattedAuthPhone: string,
        updatedClaimData: any,
        updatedSummaryData?: any,
        updatedTxData?: any,
        displayCashbackVal?: number
    ) => {
        if (typeof window === 'undefined' || !formattedAuthPhone || !updatedClaimData) return

        try {
            const cacheKey = `wallet_cache_${formattedAuthPhone}`
            const cachedWalletRaw = localStorage.getItem(cacheKey)

            if (cachedWalletRaw) {
                let parsedStores = JSON.parse(cachedWalletRaw)
                const storeIdToFind = updatedClaimData.store_id || updatedClaimData.stores?.id
                const isNowRedeemed = updatedClaimData.status
                    ? updatedClaimData.status === 'REDEEMED'
                    : updatedSummaryData?.status === 'REDEEMED'
                const isNowReady =
                    !isNowRedeemed &&
                    updatedClaimData.status === 'READY' &&
                    Number(updatedClaimData.claimable_amount || 0) > 0

                let updated = false
                parsedStores = parsedStores.map((s: any) => {
                    if (String(s.id) === String(storeIdToFind) || String(s.claimId) === String(updatedClaimData.id)) {
                        updated = true
                        const resolvedCashback = (displayCashbackVal !== undefined && displayCashbackVal > 0)
                            ? displayCashbackVal
                            : (isNowRedeemed && updatedTxData?.transaction_type?.includes('REDEEMED') && Number(updatedTxData.cashback_amount) > 0)
                                ? Number(updatedTxData.cashback_amount)
                                : (updatedClaimData.cashback_amount ?? s.cashbackAmount)

                        return {
                            ...s,
                            claimId: updatedClaimData.id,
                            cashbackAmount: resolvedCashback,
                            balance: isNowRedeemed ? 0 : (updatedClaimData.claimable_amount ?? updatedSummaryData?.current_balance ?? s.balance),
                            visits: updatedClaimData.visit_count ?? s.visits,
                            isRedeemed: isNowRedeemed,
                            isReadyToRedeem: isNowReady,
                            latestTransaction: updatedTxData !== undefined ? updatedTxData : s.latestTransaction
                        }
                    }
                    return s
                })

                if (updated) {
                    localStorage.setItem(cacheKey, JSON.stringify(parsedStores))
                }
            }

            const walletChannel = new BroadcastChannel('retcash_wallet_sync')
            walletChannel.postMessage({
                type: 'WALLET_DATA_UPDATED',
                phone: formattedAuthPhone,
                updatedClaim: updatedClaimData
            })
            walletChannel.close()
        } catch (e) {
            console.error('Error updating wallet cache from card page:', e)
        }
    }

    useEffect(() => {
        if (!paramId) return

        let channel: any = null

        async function loadFromSecureApi(formattedAuthPhone: string) {
            const res = await fetch('/api/customer/card-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_card',
                    paramId,
                    phone: formattedAuthPhone,
                }),
            })

            if (res.status === 403) {
                setAccessDenied(true)
                setIsAuthorized(true)
                setLoading(false)
                return null
            }

            if (!res.ok) return null
            return res.json()
        }

        async function verifyAuthAndFetchCardData() {
            try {
                let authenticatedPhone = ''

                if (typeof window !== 'undefined') {
                    if (phone && localStorage.getItem(`retcash_wallet_session_${phone}`)) {
                        authenticatedPhone = phone
                    } else {
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i)
                            if (key && key.startsWith('retcash_wallet_session_')) {
                                authenticatedPhone = key.replace('retcash_wallet_session_', '')
                                break
                            }
                        }
                    }

                    if (!authenticatedPhone) {
                        authenticatedPhone = localStorage.getItem('retcash_phone') || ''
                    }
                }

                if (!authenticatedPhone) {
                    setIsAuthorized(false)
                    router.replace('/customer/login')
                    return
                }

                const formattedAuthPhone = authenticatedPhone.startsWith('94')
                    ? authenticatedPhone
                    : `94${authenticatedPhone.replace(/^0/, '')}`

                // Optimistic Cache Read
                let hasLoadedFromCache = false
                if (typeof window !== 'undefined') {
                    const cachedWallet = localStorage.getItem(`wallet_cache_${formattedAuthPhone}`)
                    if (cachedWallet) {
                        try {
                            const parsedStores = JSON.parse(cachedWallet)
                            const cachedStore = parsedStores.find((s: any) => String(s.id) === String(paramId) || String(s.claimId) === String(paramId))

                            if (cachedStore && cachedStore.latestTransaction) {
                                setClaim({
                                    id: cachedStore.claimId || cachedStore.id,
                                    store_id: cachedStore.id,
                                    customer_phone: formattedAuthPhone,
                                    cashback_amount: cachedStore.cashbackAmount || 0,
                                    claimable_amount: cachedStore.balance || 0,
                                    visit_count: cachedStore.visits ?? 0,
                                    status: cachedStore.isRedeemed
                                        ? 'REDEEMED'
                                        : cachedStore.isReadyToRedeem
                                        ? 'READY'
                                        : 'PENDING',
                                    stores: cachedStore
                                })
                                setLatestTransaction(cachedStore.latestTransaction)
                                setIsAuthorized(true)
                                setLoading(false)
                                hasLoadedFromCache = true
                            }
                        } catch (e) {
                            console.error('Error reading wallet cache:', e)
                        }
                    }
                }

                if (!hasLoadedFromCache) {
                    setLoading(true)
                }

                const apiResult = await loadFromSecureApi(formattedAuthPhone)
                if (!apiResult) {
                    setIsAuthorized(true)
                    setLoading(false)
                    return
                }

                const { claim: currentClaim, latestTransaction: resolvedTxObj, walletSummary } = apiResult

                if (currentClaim) {
                    let trueDisplayCashback = Number(currentClaim.cashback_amount || 0)
                    if (resolvedTxObj) {
                        setLatestTransaction(resolvedTxObj)
                        if (currentClaim.status === 'REDEEMED' && Number(resolvedTxObj.redeemed_amount || 0) > 0) {
                            trueDisplayCashback = Number(resolvedTxObj.redeemed_amount)
                        }
                    }

                    updateWalletCacheAndNotify(
                        formattedAuthPhone,
                        currentClaim,
                        walletSummary,
                        resolvedTxObj,
                        trueDisplayCashback
                    )

                    setClaim(currentClaim)

                    if (currentClaim.id) {
                        channel = supabase
                            .channel(`realtime-card-${currentClaim.id}`)
                            .on(
                                'postgres_changes',
                                {
                                    event: '*',
                                    schema: 'public',
                                    table: 'cashback_claims',
                                    filter: `id=eq.${currentClaim.id}`
                                },
                                async () => {
                                    const freshResult = await loadFromSecureApi(formattedAuthPhone)
                                    if (freshResult?.claim) {
                                        const freshClaim = freshResult.claim
                                        const freshTx = freshResult.latestTransaction
                                        let updatedDisplayCashback = Number(freshClaim.cashback_amount || 0)

                                        setClaim(freshClaim)
                                        if (freshTx) {
                                            setLatestTransaction(freshTx)
                                            if (freshClaim.status === 'REDEEMED' && Number(freshTx.redeemed_amount || 0) > 0) {
                                                updatedDisplayCashback = Number(freshTx.redeemed_amount)
                                            }
                                        }

                                        updateWalletCacheAndNotify(
                                            formattedAuthPhone,
                                            freshClaim,
                                            freshResult.walletSummary,
                                            freshTx,
                                            updatedDisplayCashback
                                        )
                                    }
                                }
                            )
                            .subscribe()
                    }
                }

                setIsAuthorized(true)
            } catch (err) {
                console.error('Error fetching card details:', err)
            } finally {
                setLoading(false)
            }
        }

        verifyAuthAndFetchCardData()

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [paramId, phone, router])

    if (loading && !claim) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-[430px] bg-white rounded-3xl p-6 space-y-4 shadow-sm border border-slate-100 animate-pulse">
                    <div className="w-16 h-16 bg-slate-200 rounded-2xl mx-auto"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
                    <div className="h-32 bg-slate-100 rounded-2xl w-full mt-4"></div>
                    <div className="h-10 bg-slate-200 rounded-xl w-full mt-4"></div>
                </div>
            </div>
        )
    }

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center font-bold text-xl shadow-xs">
                    ✕
                </div>
                <div className="space-y-1.5 max-w-xs">
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Access Denied</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        This digital card belongs to another customer. Please return to your wallet to view your personal loyalty cards.
                    </p>
                </div>
                <button
                    onClick={() => {
                        const storedPhone = localStorage.getItem('retcash_phone') || ''
                        router.push(storedPhone ? `/wallet/${storedPhone}` : '/customer/login')
                    }}
                    className="px-5 py-2.5 bg-[#00875A] hover:bg-[#059669] text-white text-xs font-extrabold rounded-xl shadow-md shadow-[#00875A]/20 cursor-pointer active:scale-95 transition-all"
                >
                    Go to My Wallet
                </button>
            </div>
        )
    }

    if (!claim) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500">Card details not found.</p>
                <button
                    onClick={() => {
                        const storedPhone = localStorage.getItem('retcash_phone') || ''
                        router.push(storedPhone ? `/wallet/${storedPhone}` : '/customer/login')
                    }}
                    className="px-4 py-2 bg-[#00875A] hover:bg-[#059669] text-white text-xs font-extrabold rounded-xl shadow-md shadow-[#00875A]/20 cursor-pointer active:scale-95 transition-all"
                >
                    Back to Wallet
                </button>
            </div>
        )
    }

    return (
        <ClientCardView
            initialClaim={{
                ...claim,
                customer_phone: claim.customer_phone || ''
            }}
            latestTransaction={latestTransaction}
            id={claim.id}
        />
    )
}