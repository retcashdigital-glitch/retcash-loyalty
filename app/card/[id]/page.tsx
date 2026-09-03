import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ClientCardView from './ClientCardView'

// Dynamic rendering ஆனால் வேகமான cacher configurations
export const dynamic = 'force-dynamic'

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

    let claim: any = null;

    // 1. Claim ID அல்லது (Store ID + Phone) இரண்டையும் ஒரே நேரத்தில் Parallel Query செய்கிறோம்
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
                .eq('customer_phone', phone)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null })
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

            claim = newClaim;
        }
    }

    if (!claim) {
        notFound()
    }

    return <ClientCardView initialClaim={claim} id={claim.id} />
}