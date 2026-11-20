'use client'

import { useState, useEffect } from 'react'
import { Search, RotateCcw, KeyRound, AlertTriangle } from 'lucide-react'

interface CashbackClaim {
  id: string
  customer_phone: string
  claimable_amount: number
  visit_count: number
  status: string
  bill_amount?: number
  cashback_amount?: number
  updated_at?: string
}

interface CustomersSectionProps {
  filteredCustomers: CashbackClaim[]
  customerSearchQuery: string
  setCustomerSearchQuery: (val: string) => void
  targetVisits: number
  onVoidCashback: (claim: CashbackClaim) => Promise<void> | void
  onResetCustomerPin: (phone: string) => Promise<void> | void
  actionLoading: boolean
}

export default function CustomersSection({
  filteredCustomers,
  customerSearchQuery,
  setCustomerSearchQuery,
  targetVisits,
  onVoidCashback,
  onResetCustomerPin,
  actionLoading,
}: CustomersSectionProps) {
  const [, setTick] = useState(0)
  const [voidTarget, setVoidTarget] = useState<CashbackClaim | null>(null)
  const [resetPinPhone, setResetPinPhone] = useState<string | null>(null)

  // Refresh remaining minutes every 30 seconds so expired Undo buttons disappear automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const getRemainingUndoMinutes = (cust: CashbackClaim): number => {
    if (!cust.updated_at) return 0
    if (cust.status === 'REDEEMED' || cust.status === 'VOIDED') return 0
    const lastCashback = Number(cust.cashback_amount || 0)
    const balance = Number(cust.claimable_amount || 0)
    if (lastCashback <= 0 || balance < lastCashback) return 0

    const diffMs = Date.now() - new Date(cust.updated_at).getTime()
    const windowMs = 15 * 60 * 1000
    if (diffMs < 0 || diffMs > windowMs) return 0

    return Math.max(1, Math.ceil((windowMs - diffMs) / 60000))
  }

  return (
    <section className="max-w-3xl">
      {/* Confirmation Modal: Void Cashback */}
      {voidTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle className="size-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Undo Last Cashback
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Void <strong className="text-slate-900">Rs. {Number(voidTarget.cashback_amount || 0).toFixed(2)}</strong> cashback for{' '}
                <span className="font-mono font-bold text-slate-800">{voidTarget.customer_phone}</span>? This will deduct the cashback and revert 1 visit.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  const target = voidTarget
                  setVoidTarget(null)
                  await onVoidCashback(target)
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Voiding...' : 'Confirm Undo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Counter Reset Customer PIN */}
      {resetPinPhone && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-[#00875A] rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <KeyRound className="size-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Reset Customer PIN
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reset 4-digit PIN for <span className="font-mono font-bold text-slate-800">{resetPinPhone}</span>? The customer will set a new PIN on their next login.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetPinPhone(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  const phone = resetPinPhone
                  setResetPinPhone(null)
                  await onResetCustomerPin(phone)
                }}
                className="flex-1 bg-[#00875A] hover:bg-[#00704a] text-white font-extrabold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Resetting...' : 'Reset PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Customers directory</h2>
            <p className="mt-1 text-xs text-slate-500">Your most recent customer activity.</p>
          </div>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 font-mono text-[10px] text-slate-600 font-bold">
            {filteredCustomers.length} customers
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white font-mono transition"
            placeholder="Search customer by phone number..."
          />
        </div>

        <div className="space-y-3">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((cust) => {
              const isTargetReached = cust.visit_count >= targetVisits
              const undoMinsLeft = getRemainingUndoMinutes(cust)

              return (
                <div
                  key={cust.id || cust.customer_phone}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center hover:border-emerald-100 transition"
                >
                  <div>
                    <p className="font-mono text-sm font-black text-slate-900">{cust.customer_phone}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Visits:{' '}
                        <strong className={`font-extrabold ${isTargetReached ? 'text-[#00875A]' : 'text-slate-900'}`}>
                          {cust.visit_count} / {targetVisits}
                        </strong>
                      </span>
                      <span>
                        Cashback Balance:{' '}
                        <strong className="font-extrabold text-slate-900">Rs. {cust.claimable_amount || 0}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* 15-Minute Undo Button (Only shown within 15 mins of adding cashback) */}
                    {undoMinsLeft > 0 && (
                      <button
                        type="button"
                        onClick={() => setVoidTarget(cust)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-[10px] font-extrabold text-red-600 hover:bg-red-100 transition cursor-pointer disabled:opacity-50"
                        title="Undo last cashback within 15 minutes"
                      >
                        <RotateCcw className="size-3" />
                        Undo ({undoMinsLeft}m)
                      </button>
                    )}

                    {/* Counter PIN Reset Button */}
                    <button
                      type="button"
                      onClick={() => setResetPinPhone(cust.customer_phone)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-slate-600 hover:border-[#00875A] hover:text-[#00875A] transition cursor-pointer disabled:opacity-50"
                      title="Reset customer's 4-digit PIN"
                    >
                      <KeyRound className="size-3" />
                      Reset PIN
                    </button>

                    {/* Status Badge */}
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase tracking-wider ${
                        cust.status === 'VOIDED'
                          ? 'border-red-200 bg-red-50 text-red-600'
                          : cust.status === 'REDEEMED'
                          ? 'border-slate-300 bg-slate-200 text-slate-600'
                          : isTargetReached
                          ? 'border-amber-200 bg-amber-50 text-amber-700 animate-pulse'
                          : 'border-emerald-200 bg-emerald-50 text-[#00875A]'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          cust.status === 'VOIDED'
                            ? 'bg-red-500'
                            : cust.status === 'REDEEMED'
                            ? 'bg-slate-400'
                            : isTargetReached
                            ? 'bg-amber-500'
                            : 'bg-[#00875A]'
                        }`}
                      />
                      {isTargetReached && cust.status !== 'REDEEMED' && cust.status !== 'VOIDED'
                        ? 'REDEEM READY'
                        : cust.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No matching customers found.</p>
          )}
        </div>
      </div>
    </section>
  )
}