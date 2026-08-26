'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RedeemPage() {
    const params = useParams()
    const id = params.id as string

    const [status, setStatus] = useState<'loading' | 'success' | 'already_claimed' | 'error'>('loading')
    const [amount, setAmount] = useState<number>(0)

    useEffect(() => {
        const processRedeem = async () => {
            if (!id) return

            try {
                // 1. Claim விவரங்களை எடுத்தல்
                const { data: claim, error: fetchErr } = await supabase
                    .from('cashback_claims')
                    .select('*, customers(*)')
                    .eq('claim_token', id)
                    .single()

                if (fetchErr || !claim) {
                    setStatus('error')
                    return
                }

                // 2. ஏற்கனவே Claim செய்யப்பட்டிருந்தால் தடுப்பது
                if (claim.status === 'CLAIMED') {
                    setAmount(claim.claimable_amount)
                    setStatus('already_claimed')
                    return
                }

                // 3. Status-ஐ CLAIMED என மாற்றுதல்
                const { error: updateClaimErr } = await supabase
                    .from('cashback_claims')
                    .update({ status: 'CLAIMED' })
                    .eq('id', claim.id)

                if (updateClaimErr) {
                    setStatus('error')
                    return
                }

                // 4. வாடிக்கையாளரின் கேஷ்பேக் இருப்பை பூஜ்ஜியமாக்குதல் (அடுத்த சுழற்சிக்கு)
                await supabase
                    .from('customers')
                    .update({ total_cashback: 0 })
                    .eq('id', claim.customer_id)

                setAmount(claim.claimable_amount)
                setStatus('success')
            } catch (err) {
                setStatus('error')
            }
        }

        processRedeem()
    }, [id])

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border">
                {status === 'loading' && (
                    <p className="text-gray-600 font-medium animate-pulse">சரிபார்க்கப்படுகிறது...</p>
                )}

                {status === 'success' && (
                    <div>
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">✓</div>
                        <h1 className="text-2xl font-bold text-gray-800">பணம் வழங்கவும்!</h1>
                        <p className="text-gray-500 text-sm mt-1">வாடிக்கையாளருக்கு அளிக்க வேண்டிய கேஷ்பேக்:</p>
                        <p className="text-4xl font-extrabold text-green-600 my-4">Rs. {amount.toFixed(2)}</p>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase">வெற்றிகரமாக மீட்கப்பட்டது</span>
                    </div>
                )}

                {status === 'already_claimed' && (
                    <div>
                        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">⚠️</div>
                        <h1 className="text-xl font-bold text-gray-800">ஏற்கனவே மீட்கப்பட்டது!</h1>
                        <p className="text-gray-500 text-sm mt-2">இந்த கேஷ்பேக் (Rs. {amount.toFixed(2)}) ஏற்கனவே வாடிக்கையாளருக்கு வழங்கப்பட்டுவிட்டது.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <h1 className="text-xl font-bold text-red-600">செல்லாத QR கோடு</h1>
                        <p className="text-gray-500 text-sm mt-2">விவரங்களைப் பெற முடியவில்லை.</p>
                    </div>
                )}
            </div>
        </div>
    )
}