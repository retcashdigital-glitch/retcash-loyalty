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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!paramId) return

        async function fetchCardData() {
            setLoading(true)
            try {
                let currentClaim = null;

                // A. முதலில் கிடைத்த ID நேரடியாக ஒரு Claim ID-ஆ என சோதித்தல்
                const { data: claimById } = await supabase
                    .from('cashback_claims')
                    .select(`
                        *,
                        stores:store_id (
                            id, store_name, store_slug, logo_url, location_url, review_url, target_visits
                        )
                    `)
                    .eq('id', paramId)
                    .maybeSingle()

                if (claimById) {
                    currentClaim = claimById;
                } else if (phone) {
                    // B. ID என்பது Store ID ஆக இருந்தால், இந்த குறிப்பிட்ட Phone நம்பருக்குரிய சமீபத்திய Claim-ஐ மட்டுமே எடுத்தல்
                    const { data: claimByStore } = await supabase
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

                    currentClaim = claimByStore;
                }

                // C. ஒருவேளை Claim இல்லை என்றால், இந்த Store-க்கான விவரங்களை நேரடியாக எடுத்து போலி Claim உருவாக்குதல்
                if (!currentClaim) {
                    const { data: storeData } = await supabase
                        .from('stores')
                        .select('*')
                        .eq('id', paramId)
                        .maybeSingle()

                    if (storeData) {
                        currentClaim = {
                            id: storeData.id,
                            store_id: storeData.id,
                            customer_phone: phone,
                            cashback_amount: 0,
                            claimable_amount: 0,
                            visit_count: 1,
                            status: 'ACTIVE',
                            stores: storeData
                        }
                    }
                }

                setClaim(currentClaim)
            } catch (err) {
                console.error('Error fetching card details:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchCardData()
    }, [paramId, phone])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-[#EE8838] rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!claim) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500">கார்டு விபரங்கள் கிடைக்கவில்லை.</p>
                <button 
                    onClick={() => router.push(phone ? `/wallet/${phone}` : '/customer/login')}
                    className="px-4 py-2 bg-[#EE8838] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                    வாலட்டிற்கு திரும்பச் செல்
                </button>
            </div>
        )
    }

    // Phone parameter கட்டாயமாக ClientCardView-க்கு செலுத்தப்படுகிறது
  return (
    <ClientCardView 
        initialClaim={{
            ...claim,
            customer_phone: phone || claim.customer_phone || ''
        }} 
        id={claim.id} 
    />
)
}