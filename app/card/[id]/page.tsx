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
    const phone = rawPhone ? (rawPhone.startsWith('94') ? rawPhone : `94${rawPhone.replace(/^0/, '')}`) : ''

    const [claim, setClaim] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!paramId) return

        // 1. Session check for security
        const session = localStorage.getItem(`retcash_wallet_session_${phone}`)
        if (!session && phone) {
            router.replace('/customer/login')
            return
        }

        // 2. 0ms Instant Cache Loading (வாலட் பக்கத்தில் இருந்து உடனடி காட்சி)
        const cachedWallet = localStorage.getItem(`wallet_cache_${phone}`)
        let initialClaimData: any = null

        if (cachedWallet) {
            try {
                const storesList = JSON.parse(cachedWallet)
                const matchedStore = storesList.find(
                    (s: any) => String(s.id) === String(paramId) || String(s.store_id) === String(paramId)
                )

                if (matchedStore) {
                    initialClaimData = {
                        id: matchedStore.id || paramId,
                        cashback_amount: matchedStore.cashbackAmount ?? matchedStore.cashback_amount ?? 0,
                        claimable_amount: matchedStore.balance ?? matchedStore.claimable_amount ?? 0,
                        visit_count: matchedStore.visits ?? matchedStore.visit_count ?? 1,
                        status: matchedStore.isRedeemed ? 'REDEEMED' : 'ACTIVE',
                        stores: matchedStore
                    }
                    setClaim(initialClaimData)
                    setLoading(false)
                }
            } catch (e) {
                console.error("Cache reading error:", e)
            }
        }

        // 3. பின்னணியில் பாதுகாப்பாக Supabase Data Validation
        fetchSecureCardDetails(initialClaimData)
    }, [paramId, phone, router])

    const fetchSecureCardDetails = async (currentData: any) => {
        try {
            const [claimByIdRes, claimByStoreRes] = await Promise.all([
                supabase
                    .from('cashback_claims')
                    .select(`
                        *,
                        stores:store_id (
                            id, store_name, store_slug, logo_url, location_url, review_url, target_visits
                        )
                    `)
                    .eq('id', paramId)
                    .maybeSingle(),

                phone
                    ? supabase
                        .from('cashback_claims')
                        .select(`
                            *,
                            stores:store_id (
                                id, store_name, store_slug, logo_url, location_url, review_url, target_visits
                            )
                        `)
                        .eq('store_id', paramId)
                        .or(`customer_phone.eq.${phone},customer_phone.eq.${phone.replace(/^94/, '0')}`)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                    : Promise.resolve({ data: null, error: null })
            ])

            let latestClaim = claimByIdRes.data || claimByStoreRes.data

            // Claim இல்லை என்றால் புதிய Claim உருவாக்குதல்
            if (!latestClaim) {
                const { data: storeData } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('id', paramId)
                    .maybeSingle()

                if (storeData) {
                    const { data: newClaim } = await supabase
                        .from('cashback_claims')
                        .insert({
                            store_id: storeData.id,
                            customer_phone: phone || null,
                            cashback_amount: 0,
                            claimable_amount: 0,
                            visit_count: 1,
                            status: 'ACTIVE'
                        })
                        .select(`
                            *,
                            stores:store_id (
                                id, store_name, store_slug, logo_url, location_url, review_url, target_visits
                            )
                        `)
                        .single()

                    latestClaim = newClaim
                }
            }

            if (latestClaim) {
                // கிளிச்சைத் தவிர்க்க: Cache தரவிலும் புதிய தரவிலும் மாற்றம் இருந்தால் மட்டுமே UI புதுப்பிக்கப்படும்
                if (!currentData || JSON.stringify(currentData) !== JSON.stringify(latestClaim)) {
                    setClaim(latestClaim)
                }
            }
        } catch (err) {
            console.error('Data verification error:', err)
        } finally {
            setLoading(false)
        }
    }

    // Professional Skeleton Screen Loading
    if (loading && !claim) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] p-4 max-w-md mx-auto space-y-4">
                <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-xl mt-2"></div>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs animate-pulse">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-slate-200 rounded-2xl"></div>
                        <div className="space-y-2 flex-1">
                            <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                            <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
                        </div>
                    </div>
                    <div className="h-24 bg-slate-100 rounded-2xl w-full"></div>
                    <div className="h-12 bg-slate-200 rounded-xl w-full"></div>
                </div>
            </div>
        )
    }

    if (!claim) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 text-center">
                <p className="text-sm font-bold text-slate-400">Loyalty Card Not Found.</p>
            </div>
        )
    }

    return <ClientCardView initialClaim={claim} id={claim.id} />
}