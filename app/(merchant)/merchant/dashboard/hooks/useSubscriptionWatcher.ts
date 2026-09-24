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

  // 🌟 1. Subscription நிலையைச் சரிபார்க்கும் பொதுவான ஃபங்ஷன்
  const checkSubscriptionStatus = (session: MerchantSession | null) => {
    if (!session) return

    const now = new Date()
    const status = session.subscription_status

    // Explicit Expiry / Cancelled Checks
    const isExplicitlyExpired = status === 'expired' || status === 'cancelled' || status === 'cancel'
    
    // Active & Trialing status-ஐ செல்லுபடியாகும் நிலையாகக் கொள்ளுதல்
    const isSubValid = status === 'active' || status === 'trialing'

    // Trial End Date Calculation
    const trialEnd = session.trial_ends_at
      ? new Date(session.trial_ends_at)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const isDatePassed = now.getTime() >= trialEnd.getTime()

    // STRICT LOCK CHECK:
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

    // 1. ஆரம்பத்தில் சோதித்தல்
    checkSubscriptionStatus(merchantSession)

    // 2. Refresh செய்யாமலேயே 15 விநாடிக்கு ஒருமுறை பின்னணியில் சோதித்தல்
    const interval = setInterval(() => {
      checkSubscriptionStatus(merchantSession)
    }, 15000)

    // 🟢 3. SUPABASE REALTIME LISTENER (Supabase டேட்டாபேஸில் மாற்றம் செய்த மறுகணமே பக்கத்தை பூட்டுவதற்கு)
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

          // LocalStorage ஐ உடனுக்குடன் புதுப்பித்தல்
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

          // நேரலையாக நிலையைச் சரிபார்த்து State-ஐ மாற்றுதல்
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