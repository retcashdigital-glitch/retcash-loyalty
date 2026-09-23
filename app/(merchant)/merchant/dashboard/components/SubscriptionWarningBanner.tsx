'use client'

import { AlertTriangle, ShieldCheck } from 'lucide-react'

interface Props {
  isTrialExpired: boolean
  daysRemainingInTrial: number | null
  storeName: string
  adminPhone: string
}

export default function SubscriptionWarningBanner({
  isTrialExpired,
  daysRemainingInTrial,
  storeName,
  adminPhone,
}: Props) {
  if (isTrialExpired || daysRemainingInTrial === null || daysRemainingInTrial > 7) {
    return null
  }

  const whatsappMsg = encodeURIComponent(
    `Hi RETCASH, I want to renew my subscription for ${storeName}.`
  )

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
            Free Trial Ending Soon
          </h4>
          <p className="text-xs text-amber-700 font-medium mt-0.5">
            Your free trial expires in{' '}
            <strong className="font-extrabold">
              {daysRemainingInTrial} {daysRemainingInTrial === 1 ? 'day' : 'days'}
            </strong>
            . Renew your pass to avoid service interruption.
          </p>
        </div>
      </div>
      <a
        href={`https://wa.me/${adminPhone}?text=${whatsappMsg}`}
        target="_blank"
        rel="noreferrer"
        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shrink-0 flex items-center gap-1.5 shadow-xs"
      >
        <ShieldCheck size={14} />
        <span>Renew Subscription</span>
      </a>
    </div>
  )
}