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

    const { data: claim, error } = await supabase
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

    if (error || !claim) {
        notFound()
    }

    return <ClientCardView initialClaim={claim} id={id} />
}