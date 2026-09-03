import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ClientCardView from './ClientCardView'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function SingleCardPage({ params }: PageProps) {
    const { id } = await params

    if (!id) {
        notFound()
    }

    // 1. முதலில் இந்த id-ஐ cashback_claims டேபிளின் id-ஆக வைத்துத் தேடுதல்
    let { data: claim, error } = await supabase
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
        .eq('id', id)
        .maybeSingle()

    // 2. ஒருவேளை cashback_claims-ல் இந்த id கிடைக்கவில்லை என்றால், 
    // இது store.id ஆக இருக்கக்கூடும் என்பதால் அந்த ஸ்டோருக்குரிய லேட்டஸ்ட் கிளைமைத் தேடுதல் அல்லது உருவாக்குதல்
    if (!claim) {
        const { data: storeData } = await supabase
            .from('stores')
            .select('*')
            .eq('id', id)
            .maybeSingle()

        if (storeData) {
            // இந்த ஸ்டோருக்கு ஏற்கனவே கிளைம் இருக்கிறதா எனப் பார்த்தல்
            const { data: existingClaim } = await supabase
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
                .eq('store_id', id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (existingClaim) {
                claim = existingClaim;
            } else {
                // முற்றிலும் புதியதாக ஒரு கிளைம் உருவாக்குதல்
                const { data: newClaim } = await supabase
                    .from('cashback_claims')
                    .insert({
                        store_id: storeData.id,
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
    }

    if (!claim) {
        notFound()
    }

    return <ClientCardView initialClaim={claim} id={claim.id} />
}