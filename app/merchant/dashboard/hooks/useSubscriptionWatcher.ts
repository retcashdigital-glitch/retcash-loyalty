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
      const trialEnd = merchantSession.trial_ends_at
        ? new Date(merchantSession.trial_ends_at)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const isSubActive = merchantSession.subscription_status === 'active'

      // ரீஃப்ரெஷ் செய்யாவிட்டாலும் தற்போதைய நேரத்துடன் ஒப்பீட்டு பரிசோதனை செய்யப்படுகிறது
      if (!isSubActive && now.getTime() >= trialEnd.getTime()) {
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

    // 2. Refresh செய்யாமலேயே பின்னணியில் ஒவ்வொரு 30 விநாடிக்கும் தற்போதைய நேரத்தை வைத்து சோதிக்கும் முறை
    const interval = setInterval(() => {
      checkSubscriptionStatus()
    }, 30000)

    return () => clearInterval(interval)
  }, [merchantSession])

  return { isTrialExpired, daysRemainingInTrial, setIsTrialExpired }
}