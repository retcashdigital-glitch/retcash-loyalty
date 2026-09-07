import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ClientCardView from './ClientCardView'

// 1. FAST SERVER RESPONSIVENESS:
// force-dynamic ஐ நீக்குவதன் மூலம் Server Response Time (TTFB) மிக வேகமாக மாறும்.
export const revalidate = 0;

interface PageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ phone?: string }>
}

export default async function SingleCardPage({ params, searchParams }: PageProps) {
    const { id: paramId } = await params
    const { phone } = await searchParams

    if (!paramId) {
        notFound()
    }

    // Phone normalization (Phone Number format இருந்தால் சீரமைத்தல்)
    const normalizedPhone = phone ? (phone.startsWith('94') ? phone : `94${phone.replace(/^0/, '')}`) : ''

    let claim: any = null;

    // 1. Parallel Supabase Queries (Claim ID அல்லது Store ID + Phone)
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

        normalizedPhone
            ? supabase
                .from('cashback_claims')
                .select(`
                    *,
                    stores:store_id (
                        id, store_name, store_slug, logo_url, location_url, review_url, target_visits
                    )
                `)
                .eq('store_id', paramId)
                .or(`customer_phone.eq.${normalizedPhone},customer_phone.eq.${normalizedPhone.replace(/^94/, '0')}`)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null })
    ]);

    claim = claimByIdRes.data || claimByStoreRes.data;

    // 2. Claim இல்லையென்றால் புதிய Claim உருவாக்குதல்
    if (!claim) {
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
                    customer_phone: normalizedPhone || null,
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

            claim = newClaim;
        }
    }

    if (!claim) {
        notFound()
    }

    return <ClientCardView initialClaim={claim} id={claim.id} />
}