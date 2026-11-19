'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomerEntryRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const rawPhone = localStorage.getItem('customer_phone') || ''
    const savedCardId = localStorage.getItem('customer_card_id')

    // Normalize phone to 94XXXXXXXXX format safely
    let cleanPhone = rawPhone.replace(/\D/g, '')
    if (cleanPhone.startsWith('0') && cleanPhone.length >= 10) {
      cleanPhone = `94${cleanPhone.slice(1)}`
    } else if (!cleanPhone.startsWith('94') && cleanPhone.length === 9) {
      cleanPhone = `94${cleanPhone}`
    }

    if (cleanPhone) {
      const hasSession =
        localStorage.getItem(`retcash_wallet_session_${cleanPhone}`) === 'true' ||
        localStorage.getItem(`retcash_wallet_auth_${cleanPhone}`) === 'true' ||
        localStorage.getItem(`retcash_wallet_session_${rawPhone}`) === 'true' ||
        localStorage.getItem(`retcash_wallet_auth_${rawPhone}`) === 'true'

      if (hasSession) {
        router.replace(`/wallet/${cleanPhone}`)
        return
      }
    }

    if (savedCardId) {
      router.replace(`/card/${savedCardId}`)
      return
    }

    router.replace('/customer/login')
  }, [router])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00875A] mb-3" />
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        Opening Your Wallet...
      </p>
    </div>
  )
}