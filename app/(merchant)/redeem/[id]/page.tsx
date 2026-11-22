'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react'

export default function RedeemPage() {
    const params = useParams()
    const id = params.id as string

    const [status, setStatus] = useState<'loading' | 'success' | 'already_claimed' | 'error'>('loading')
    const [amount, setAmount] = useState<number>(0)

    useEffect(() => {
        const processRedeem = async () => {
            if (!id) return

            try {
                const res = await fetch('/api/merchant/claim-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: id }),
                })

                const data = await res.json()

                if (data.status === 'already_claimed') {
                    setAmount(Number(data.amount || 0))
                    setStatus('already_claimed')
                    return
                }

                if (!res.ok || data.status !== 'success') {
                    setStatus('error')
                    return
                }

                setAmount(Number(data.amount || 0))
                setStatus('success')
            } catch {
                setStatus('error')
            }
        }

        processRedeem()
    }, [id])

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col items-center justify-between p-4 font-sans selection:bg-[#00875A] selection:text-white">
            
            <div className="pt-2"></div>

            {/* Single Unified Clean Card Container */}
            <div className="bg-white w-full max-w-sm rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 md:p-8 border border-slate-100 relative my-auto text-center space-y-6">
                
                {/* Brand Logo Header */}
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] mb-3 p-2.5">
                        <Image 
                            src="/logo.png" 
                            alt="RETCASH Logo" 
                            width={48} 
                            height={48} 
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 tracking-wider uppercase">
                        RET<span className="text-[#00875A]">CASH</span>
                    </h1>
                    <span className="mt-1 px-3 py-0.5 bg-[#E6F4EA] text-[#00875A] text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                        Cashback Verification
                    </span>
                </div>

                {/* State: Loading */}
                {status === 'loading' && (
                    <div className="py-6 space-y-3 flex flex-col items-center">
                        <Loader2 className="size-10 text-[#00875A] animate-spin" />
                        <p className="text-xs text-slate-500 font-semibold tracking-wide">
                            Verifying claim token...
                        </p>
                    </div>
                )}

                {/* State: Success */}
                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="w-14 h-14 bg-[#E6F4EA] text-[#00875A] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                            <CheckCircle2 className="size-8" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Pay Out Cashback!
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Amount to be disbursed to customer:
                            </p>
                            <p className="text-3xl font-black text-[#00875A] my-3">
                                Rs. {amount.toFixed(2)}
                            </p>
                            <span className="inline-block bg-[#E6F4EA] text-[#00875A] text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                Successfully Redeemed
                            </span>
                        </div>
                    </div>
                )}

                {/* State: Already Claimed */}
                {status === 'already_claimed' && (
                    <div className="space-y-4">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                            <AlertTriangle className="size-8" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Already Redeemed
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                This cashback reward of <strong className="text-slate-800">Rs. {amount.toFixed(2)}</strong> has already been claimed by the customer.
                            </p>
                        </div>
                    </div>
                )}

                {/* State: Error */}
                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="w-14 h-14 bg-red-50 text-red-600 border border-red-200/60 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                            <XCircle className="size-8" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-red-600 uppercase tracking-tight">
                                Invalid QR Code
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Unable to fetch or verify claim details. Please try scanning again.
                            </p>
                        </div>
                    </div>
                )}

            </div>

            {/* Bottom Footer */}
            <div className="py-6 text-center text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
            </div>

        </div>
    )
}