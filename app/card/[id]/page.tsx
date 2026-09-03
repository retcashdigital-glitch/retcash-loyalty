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

    // 1. முதலில் இந்த id-ஐ cashback_claims டேபிளின் id-ஆக வைத்துத் தேடுதல்
    let { data: claim } = await supabase
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

    // 2. ஒருவேளை cashback_claims-ல் கிடைக்கவில்லை என்றால் (id என்பது Store ID ஆக இருந்தால்)
    if (!claim) {
        const { data: storeData } = await supabase
            .from('stores')
            .select('*')
            .eq('id', id)
            .maybeSingle()

        if (storeData) {
            // இந்த ஸ்டோருக்கும் போன் நம்பருக்கும் ஏற்கனவே கிளைம் இருக்கிறதா எனப் பார்த்தல்
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
                .eq('store_id', id)

            if (phone) {
                query = query.eq('customer_phone', phone)
            }

            const { data: existingClaim } = await query
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
    }

    if (!claim) {
        notFound()
    }

    return <ClientCardView initialClaim={claim} id={claim.id} />
}