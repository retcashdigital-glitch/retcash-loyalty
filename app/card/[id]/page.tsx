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
    const { id } = await params
    const { phone } = await searchParams

    if (!id) {
        notFound()
    }

    let claim: any = null;

    // 1. மின்னல் வேகத் தேடல்: வரப்பெற்ற ID என்பது Claim ID ஆக இருந்தாலும் அல்லது Store ID ஆக இருந்தாலும் ஒரே Query-யில் எடுக்கிறது
    let query = supabase
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

    if (phone) {
        // ID என்பது Claim ID அல்லது Store ID ஆக இருந்து, போன் நம்பரும் பொருந்தி வருகிறதா என ஒரே அடியில் சரிபார்க்கிறது
        query = query.or(`id.eq.${id},and(store_id.eq.${id},customer_phone.eq.${phone})`)
    } else {
        query = query.or(`id.eq.${id},store_id.eq.${id}`)
    }

    const { data: existingClaim } = await query
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (existingClaim) {
        claim = existingClaim;
    } else {
        // 2. ஒருவேளை இந்த கஸ்டமருக்கு இன்னும் இந்த கடையில் Claim உருவாக்கப்படவில்லை என்றால் மட்டும் புதியதாக உருவாக்குதல்
        const { data: storeData } = await supabase
            .from('stores')
            .select('*')
            .eq('id', id)
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