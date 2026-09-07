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
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [accessDenied, setAccessDenied] = useState(false)

    useEffect(() => {
        if (!paramId) return

        async function verifyAuthAndFetchCardData() {
            setLoading(true)
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
                } else {
                    // B. ID என்பது Store ID ஆக இருந்தால், இந்த லாக்-இன் செய்த நபருக்குரிய Claim-ஐ எடுத்தல்
                    const { data: claimByStore } = await supabase
                        .from('cashback_claims')
                        .select(`
                            *,
                            stores:store_id (
                                id, store_name, store_slug, logo_url, location_url, review_url, target_visits
                            )
                        `)
                        .eq('store_id', paramId)
                        .or(`customer_phone.eq.${formattedAuthPhone},customer_phone.eq.${formattedAuthPhone.replace(/^94/, '0')}`)
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
                            customer_phone: formattedAuthPhone,
                            cashback_amount: 0,
                            claimable_amount: 0,
                            visit_count: 1,
                            status: 'ACTIVE',
                            stores: storeData
                        }
                    }
                }

                // ==========================================
                // STRICT OWNERSHIP CHECK: கார்டு சொந்தக்காரர் தானா எனச் சரிபார்த்தல்
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

                setClaim(currentClaim)
                setIsAuthorized(true)
            } catch (err) {
                console.error('Error fetching card details:', err)
            } finally {
                setLoading(false)
            }
        }

        verifyAuthAndFetchCardData()
    }, [paramId, phone, router])

    if (loading || isAuthorized === false || isAuthorized === null) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-[#EE8838] rounded-full animate-spin"></div>
            </div>
        )
    }

    // வேறு ஒருவரின் கார்டைத் திறக்க முயன்றால் காட்டும் பாதுகாப்புத் திரை
    if (accessDenied) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center font-bold text-xl">
                    ✕
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">அணுகல் மறுக்கப்பட்டது</h3>
                    <p className="text-xs text-slate-500 max-w-xs">
                        இந்த டிஜிட்டல் கார்டு வேறு ஒரு வாடிக்கையாளருக்குரியது. உங்களது கார்டுகளைக் காண உங்களது வாலட்டிற்குச் செல்லவும்.
                    </p>
                </div>
                <button 
                    onClick={() => {
                        const storedPhone = localStorage.getItem('retcash_phone') || ''
                        router.push(storedPhone ? `/wallet/${storedPhone}` : '/customer/login')
                    }}
                    className="px-5 py-2.5 bg-[#EE8838] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                    எனது வாலட்டிற்குச் செல்
                </button>
            </div>
        )
    }

    if (!claim) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500">கார்டு விபரங்கள் கிடைக்கவில்லை.</p>
                <button 
                    onClick={() => {
                        const storedPhone = localStorage.getItem('retcash_phone') || ''
                        router.push(storedPhone ? `/wallet/${storedPhone}` : '/customer/login')
                    }}
                    className="px-4 py-2 bg-[#EE8838] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                    வாலட்டிற்கு திரும்பச் செல்
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
            id={claim.id} 
        />
    )
}