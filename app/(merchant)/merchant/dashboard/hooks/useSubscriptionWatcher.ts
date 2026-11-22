'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface MerchantSession {
  id: string
  store_name: string
  trial_ends_at?: string
  subscription_status?: string
}

export function useSubscriptionWatcher(merchantSession: MerchantSession | null) {
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const [daysRemainingInTrial, setDaysRemainingInTrial] = useState<number | null>(null)

  const checkSubscriptionStatus = (session: MerchantSession | null) => {
    if (!session) return

    const now = new Date()
    const status = session.subscription_status

    const isExplicitlyExpired = status === 'expired' || status === 'cancelled' || status === 'cancel'
    const isSubValid = status === 'active' || status === 'trialing'

    const trialEnd = session.trial_ends_at
      ? new Date(session.trial_ends_at)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const isDatePassed = now.getTime() >= trialEnd.getTime()

    if (isExplicitlyExpired || (!isSubValid && isDatePassed) || (status === 'trialing' && isDatePassed)) {
      setIsTrialExpired(true)
      setDaysRemainingInTrial(0)
    } else {
      setIsTrialExpired(false)
      const diffTime = trialEnd.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setDaysRemainingInTrial(diffDays > 0 ? diffDays : 0)
    }
  }

  useEffect(() => {
    if (!merchantSession?.id) return

    checkSubscriptionStatus(merchantSession)

    // Poll server API every 15 seconds so subscription lock works even when client DB read is locked by RLS
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/merchant/portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify_session', storeId: merchantSession.id }),
        })
        if (res.ok) {
          const { store } = await res.json()
          if (store) {
            const savedMerchant = localStorage.getItem('retcash_merchant')
            if (savedMerchant) {
              const parsed = JSON.parse(savedMerchant)
              localStorage.setItem('retcash_merchant', JSON.stringify({ ...parsed, ...store }))
            }
            checkSubscriptionStatus(store)
            return
          }
        }
      } catch {
        // Fallback to local session check if offline
      }
      checkSubscriptionStatus(merchantSession)
    }, 15000)

    const channel = supabase
      .channel(`store-subscription-watch-${merchantSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stores',
          filter: `id=eq.${merchantSession.id}`,
        },
        (payload) => {
          const updatedStore = payload.new as MerchantSession

          const savedMerchant = localStorage.getItem('retcash_merchant')
          if (savedMerchant) {
            try {
              const parsed = JSON.parse(savedMerchant)
              const updatedSession = { ...parsed, ...updatedStore }
              localStorage.setItem('retcash_merchant', JSON.stringify(updatedSession))
            } catch (e) {
              console.error('Error updating localStorage:', e)
            }
          }

          checkSubscriptionStatus(updatedStore)
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [merchantSession?.id])

  return { isTrialExpired, daysRemainingInTrial, setIsTrialExpired }
}