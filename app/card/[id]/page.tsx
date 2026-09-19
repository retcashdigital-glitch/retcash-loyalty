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
    
    // 1. Phone Format Standardization (94XXXXXXXXX)
    const phone = rawPhone 
        ? (rawPhone.startsWith('94') ? rawPhone : `94${rawPhone.replace(/^0/, '')}`) 
        : ''

    const [claim, setClaim] = useState<any>(null)
    const [latestTransaction, setLatestTransaction] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [accessDenied, setAccessDenied] = useState(false)

    // ==========================================
    // ⚡ HELPER: WALLET CACHE-ஐ உடனடியாக Sync செய்யும் Function
    // ==========================================
    const updateWalletCacheAndNotify = (formattedAuthPhone: string, updatedClaimData: any, updatedSummaryData?: any) => {
        if (typeof window === 'undefined' || !formattedAuthPhone || !updatedClaimData) return

        try {
            const cacheKey = `wallet_cache_${formattedAuthPhone}`
            const cachedWalletRaw = localStorage.getItem(cacheKey)
            
            if (cachedWalletRaw) {
                let parsedStores = JSON.parse(cachedWalletRaw)
                const storeIdToFind = updatedClaimData.store_id || updatedClaimData.stores?.id

                // 1. Cache-இல் இருக்கும் குறித்த கடைக் கார்டைப் புதுப்பித்தல்
                let updated = false
                parsedStores = parsedStores.map((s: any) => {
                    if (String(s.id) === String(storeIdToFind) || String(s.claimId) === String(updatedClaimData.id)) {
                        updated = true
                        return {
                            ...s,
                            claimId: updatedClaimData.id,
                            cashbackAmount: updatedClaimData.cashback_amount ?? s.cashbackAmount,
                            balance: updatedSummaryData?.current_balance ?? updatedClaimData.claimable_amount ?? s.balance,
                            visits: updatedClaimData.visit_count ?? s.visits,
                            isRedeemed: (updatedSummaryData?.status || updatedClaimData.status) === 'REDEEMED'
                        }
                    }
                    return s
                })

                // 2. புதுப்பித்த Cache-ஐ LocalStorage-இல் சேமித்தல்
                if (updated) {
                    localStorage.setItem(cacheKey, JSON.stringify(parsedStores))
                }
            }

            // 3. ⚡ BROADCAST CHANNEL: வாலட் பக்கத்திற்கு உடனடி சிக்னல் அனுப்புதல்
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

        async function verifyAuthAndFetchCardData() {
            try {
                // ==========================================
                // STRICT AUTH GUARD: லாக்-இன் செய்த பயனரின் போன் நம்பரைக் கண்டறிதல்
                // ==========================================
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

                // லாக்-இன் செய்யவில்லை என்றால் லாக்-இன் பக்கத்திற்கு அனுப்புதல்
                if (!authenticatedPhone) {
                    setIsAuthorized(false)
                    router.replace('/customer/login')
                    return
                }

                // போன் நம்பரை 94... வடிவில் சீரமைத்தல்
                const formattedAuthPhone = authenticatedPhone.startsWith('94') 
                    ? authenticatedPhone 
                    : `94${authenticatedPhone.replace(/^0/, '')}`

                const localPhoneFormat = formattedAuthPhone.replace(/^94/, '0')

                // ==========================================
                // ⚡ OPTIMISTIC CACHE READ (உடனடி லோடிங் தீர்வு)
                // ==========================================
                let hasLoadedFromCache = false
                if (typeof window !== 'undefined') {
                    const cachedWallet = localStorage.getItem(`wallet_cache_${formattedAuthPhone}`)
                    if (cachedWallet) {
                        try {
                            const parsedStores = JSON.parse(cachedWallet)
                            const cachedStore = parsedStores.find((s: any) => String(s.id) === String(paramId) || String(s.claimId) === String(paramId))
                            
                            if (cachedStore) {
                                setClaim({
                                    id: cachedStore.claimId || cachedStore.id,
                                    store_id: cachedStore.id,
                                    customer_phone: formattedAuthPhone,
                                    cashback_amount: cachedStore.cashbackAmount || 0,
                                    claimable_amount: cachedStore.balance || 0,
                                    visit_count: cachedStore.visits || 1,
                                    status: cachedStore.isRedeemed ? 'REDEEMED' : 'ACTIVE',
                                    stores: cachedStore
                                })
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

                // ==========================================
                // BACKGROUND DATA FETCH (Supabase துல்லியமான தேடல்)
                // ==========================================
                let currentClaim = null;

                // A. முதலில் கிடைத்த ID நேரடியாக ஒரு Claim ID-ஆ என சோதித்தல்
                const { data: claimById } = await supabase
                    .from('cashback_claims')
                    .select(`
                        *,
                        stores:store_id (
                            id, store_name, store_slug, logo_url, location_url, review_url, target_visits, default_cashback_percent
                        )
                    `)
                    .eq('id', paramId)
                    .maybeSingle()

                if (claimById) {
                    currentClaim = claimById;
                } else {
                    // B. ID என்பது Store ID ஆக இருந்தால், இந்த லாக்-இன் செய்த நபருக்குரிய Unique Active Claim-ஐ எடுத்தல்
                    const { data: claimByStore } = await supabase
                        .from('cashback_claims')
                        .select(`
                            *,
                            stores:store_id (
                                id, store_name, store_slug, logo_url, location_url, review_url, target_visits, default_cashback_percent
                            )
                        `)
                        .eq('store_id', paramId)
                        .or(`customer_phone.eq.${formattedAuthPhone},customer_phone.eq.${localPhoneFormat}`)
                        .maybeSingle()

                    currentClaim = claimByStore;
                }

                // C. Claim இல்லை என்றால் Supabase-இல் Unique Upsert செய்து பெறுதல்
                if (!currentClaim) {
                    const { data: storeData } = await supabase
                        .from('stores')
                        .select('*')
                        .eq('id', paramId)
                        .maybeSingle()

                    if (storeData) {
                        let customerUuid: string | null = null
                        const { data: existingCust } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('phone_number', formattedAuthPhone)
                            .maybeSingle()

                        if (existingCust) {
                            customerUuid = existingCust.id
                        } else {
                            const { data: newCust } = await supabase
                                .from('customers')
                                .insert({ phone_number: formattedAuthPhone, store_id: storeData.id })
                                .select('id')
                                .maybeSingle()
                            if (newCust) customerUuid = newCust.id
                        }

                        // UPSERT using Unique Constraint (customer_phone, store_id)
                        const { data: newClaimData } = await supabase
                            .from('cashback_claims')
                            .upsert({
                                store_id: storeData.id,
                                customer_id: customerUuid,
                                customer_phone: formattedAuthPhone,
                                claimable_amount: 0,
                                visit_count: 1,
                                status: 'PENDING',
                                updated_at: new Date().toISOString()
                            }, {
                                onConflict: 'customer_phone,store_id'
                            })
                            .select(`
                                *,
                                stores:store_id (
                                    id, store_name, store_slug, logo_url, location_url, review_url, target_visits, default_cashback_percent
                                )
                            `)
                            .maybeSingle()

                        if (newClaimData) {
                            currentClaim = newClaimData
                        }
                    }
                }

                // ==========================================
                // STRICT OWNERSHIP CHECK
                // ==========================================
                if (currentClaim && currentClaim.customer_phone) {
                    const claimPhoneFormatted = currentClaim.customer_phone.startsWith('94')
                        ? currentClaim.customer_phone
                        : `94${currentClaim.customer_phone.replace(/^0/, '')}`

                    if (claimPhoneFormatted !== formattedAuthPhone) {
                        console.warn('Unauthorized Access: User trying to view someone else card.')
                        setAccessDenied(true)
                        setIsAuthorized(true)
                        setLoading(false)
                        return
                    }
                }

                // ==========================================
                // 🎯 LATEST TRANSACTION FETCH (customer_wallet_summary View-லிருந்து எடுத்தல்)
                // ==========================================
                if (currentClaim && currentClaim.store_id) {
                    // 1. கடைசியாக நடந்த அசல் பில் மற்றும் கேஷ்பேக் விவரத்தை எடுப்பது
                    const { data: lastTx } = await supabase
                        .from('cashback_history')
                        .select('bill_amount, cashback_percentage, cashback_amount, transaction_type, created_at')
                        .eq('claim_id', currentClaim.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    // 2. customer_wallet_summary View-லிருந்து அசல் பில் தொகையை மட்டும் எடுப்பது
                    const { data: walletSummary } = await supabase
                        .from('customer_wallet_summary')
                        .select('last_bill_amount, total_redeemed_amount, current_balance, status')
                        .eq('store_id', currentClaim.store_id)
                        .or(`customer_phone.eq.${formattedAuthPhone},customer_phone.eq.${localPhoneFormat}`)
                        .maybeSingle()

                    if (lastTx) {
                        setLatestTransaction({
                            ...lastTx,
                            bill_amount: (walletSummary?.last_bill_amount && walletSummary.last_bill_amount > 0) 
                                ? walletSummary.last_bill_amount 
                                : lastTx.bill_amount,
                            total_redeemed: walletSummary?.total_redeemed_amount || 0,
                            summary_status: walletSummary?.status || currentClaim.status
                        })
                    }

                    // ⚡ வாலட் கேஷை உடனடி அப்டேட் செய்தல்
                    updateWalletCacheAndNotify(formattedAuthPhone, currentClaim, walletSummary)
                }

                if (currentClaim) {
                    setClaim(currentClaim)

                    // ==========================================
                    // ⚡ SUPABASE REALTIME SUBSCRIPTION
                    // ==========================================
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
                                async (payload) => {
                                    if (payload.new) {
                                        const updatedClaimObj = {
                                            ...currentClaim,
                                            ...payload.new
                                        }

                                        setClaim((prevClaim: any) => ({
                                            ...prevClaim,
                                            ...payload.new,
                                            stores: prevClaim?.stores || (payload.new as any).stores
                                        }))

                                        const { data: updatedTx } = await supabase
                                            .from('cashback_history')
                                            .select('bill_amount, cashback_percentage, cashback_amount, transaction_type, created_at')
                                            .eq('claim_id', currentClaim.id)
                                            .order('created_at', { ascending: false })
                                            .limit(1)
                                            .maybeSingle()

                                        const { data: updatedSummary } = await supabase
                                            .from('customer_wallet_summary')
                                            .select('last_bill_amount, total_redeemed_amount, current_balance, status')
                                            .eq('store_id', currentClaim.store_id)
                                            .or(`customer_phone.eq.${formattedAuthPhone},customer_phone.eq.${localPhoneFormat}`)
                                            .maybeSingle()

                                        if (updatedTx) {
                                            setLatestTransaction({
                                                ...updatedTx,
                                                bill_amount: (updatedSummary?.last_bill_amount && updatedSummary.last_bill_amount > 0) 
                                                    ? updatedSummary.last_bill_amount 
                                                    : updatedTx.bill_amount,
                                                total_redeemed: updatedSummary?.total_redeemed_amount || 0,
                                                summary_status: (updatedSummary as { status?: string } | null)?.status || (payload.new as { status?: string }).status
                                            })
                                        }

                                        // ⚡ REALTIME UPDATE வந்தவுடன் Cache + Broadcast Sync
                                        updateWalletCacheAndNotify(formattedAuthPhone, updatedClaimObj, updatedSummary)
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