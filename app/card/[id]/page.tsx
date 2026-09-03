import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ClientCardView from './ClientCardView'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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

    // 1. முதலாவதாக paramId-ஐ Claim ID ஆக தேடுதல்
    const { data: claimById } = await supabase
        .from('cashback_claims')
        .select(`
            *,
            stores:store_id (
                id,
                store_name,
                store_slug,
                logo_url,
                location_url,
                review_url,
                target_visits
            )
        `)
        .eq('id', paramId)
        .maybeSingle()

    if (claimById) {
        claim = claimById;
    } else if (phone) {
        // 2. paramId என்பது Store ID ஆக இருந்தால், இந்த Store ID + Phone சேர்க்கையை நேரடியாகத் தேடுதல்
        const { data: claimByStoreAndPhone } = await supabase
            .from('cashback_claims')
            .select(`
                *,
                stores:store_id (
                    id,
                    store_name,
                    store_slug,
                    logo_url,
                    location_url,
                    review_url,
                    target_visits
                )
            `)
            .eq('store_id', paramId)
            .eq('customer_phone', phone)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        claim = claimByStoreAndPhone;
    }

    // 3. இன்னும் Claim கிடைக்கவில்லை என்றால், இந்த வாடிக்கையாளருக்கு புதிய Claim கணக்கை உருவாக்குதல்
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
                        id,
                        store_name,
                        store_slug,
                        logo_url,
                        location_url,
                        review_url,
                        target_visits
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