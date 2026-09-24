'use client'

import { useState, useEffect } from 'react'

interface MerchantSession {
  id: string
  store_name: string
  trial_ends_at?: string
  subscription_status?: string
}

export function useSubscriptionWatcher(merchantSession: MerchantSession | null) {
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const [daysRemainingInTrial, setDaysRemainingInTrial] = useState<number | null>(null)

  useEffect(() => {
    if (!merchantSession) return

    const checkSubscriptionStatus = () => {
      const now = new Date()
      
      const status = merchantSession.subscription_status

      // 1. Explicit Expiry / Cancelled Checks
      const isExplicitlyExpired = status === 'expired' || status === 'cancelled'
      
      // 2. Active & Trialing status-ஐ செல்லுபடியாகும் நிலையாகக் கொள்ளுதல்
      const isSubValid = status === 'active' || status === 'trialing'

      // 3. Trial End Date Calculation
      const trialEnd = merchantSession.trial_ends_at
        ? new Date(merchantSession.trial_ends_at)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const isDatePassed = now.getTime() >= trialEnd.getTime()

      // 🌟 STRICT LOCK CHECK:
      // - Explicitly expired ஆக இருந்தால் OR
      // - Status Valid ஆக இல்லாமல் தேதி முடிந்திருந்தால் OR
      // - Trialing ஆக இருந்து தேதி முடிந்திருந்தால்
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

    // 1. ஆரம்பத்தில் சோதித்தல்
    checkSubscriptionStatus()

    // 2. Refresh செய்யாமலேயே பின்னணியில் ஒவ்வொரு 15 விநாடிக்கும் தற்போதைய நேரத்தை வைத்து சோதிக்கும் முறை
    const interval = setInterval(() => {
      checkSubscriptionStatus()
    }, 15000)

    return () => clearInterval(interval)
  }, [merchantSession])

  return { isTrialExpired, daysRemainingInTrial, setIsTrialExpired }
}