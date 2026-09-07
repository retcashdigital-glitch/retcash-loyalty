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

        async function fetchCardData() {
            setLoading(true)
            try {
                // 1. Claim ID அல்லது Store ID + Phone மூலம் தரவை எடுத்தல்
                const { data, error } = await supabase
                    .from('cashback_claims')
                    .select(`
                        *,
                        stores:store_id (
                            id, store_name, store_slug, logo_url, location_url, review_url, target_visits
                        )
                    `)
                    .or(`id.eq.${paramId},store_id.eq.${paramId}`)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (data) {
                    setClaim(data)
                }
            } catch (err) {
                console.error('Error loading card:', err)
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
                    className="px-4 py-2 bg-[#EE8838] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                    வாலட்டிற்கு திரும்பச் செல்
                </button>
            </div>
        )
    }

    // Phone parameter கட்டாயமாக ClientCardView-க்கு செலுத்தப்படுகிறது (Back Button சரி செய்யப்பட்டது)
    return <ClientCardView initialClaim={claim} id={claim.id} phone={phone} customerPhone={phone} />
}