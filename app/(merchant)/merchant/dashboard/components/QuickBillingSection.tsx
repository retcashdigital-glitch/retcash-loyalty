'use client'

import { FormEvent, useState, useEffect, useRef } from 'react'
import {
  Zap,
  Phone,
  Gift,
  ChevronRight,
  QrCode,
  Users,
  WalletCards,
  Settings2,
  Search,
  CheckCircle2,
  RotateCcw,
  X,
  Sparkles,
} from 'lucide-react'

interface CashbackClaim {
  id: string
  customer_phone: string
  claimable_amount: number
  visit_count: number
  status: string
  customer_id?: string
  bill_amount?: number
  cashback_amount?: number
  updated_at?: string
}

interface QuickBillingSectionProps {
  customerPhone: string
  setCustomerPhone: (val: string) => void
  billAmount: string
  setBillAmount: (val: string) => void
  actionLoading: boolean
  isCheckingCustomer: boolean
  existingCustomerClaim: CashbackClaim | null
  currentClaimable: number
  customersList: CashbackClaim[]
  totalClaimableSum: number
  handleGenerateCashback: (e: FormEvent) => void
  startScanner: () => void
  startPhoneScanner: () => void
  onOpenProfile: () => void
  merchantStoreId?: string
  lastAddedClaim?: CashbackClaim | null
  targetVisits?: number
  onVoidLastClaim?: (claim: CashbackClaim) => void
  onDismissLastClaim?: () => void
}

function normalizePhoneCore(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.startsWith('94')) return digits.slice(2)
  if (digits.startsWith('0')) return digits.slice(1)
  return digits
}

export default function QuickBillingSection({
  customerPhone,
  setCustomerPhone,
  billAmount,
  setBillAmount,
  actionLoading,
  isCheckingCustomer,
  existingCustomerClaim,
  currentClaimable,
  customersList,
  totalClaimableSum,
  handleGenerateCashback,
  startScanner,
  startPhoneScanner,
  onOpenProfile,
  lastAddedClaim,
  targetVisits = 6,
  onVoidLastClaim,
  onDismissLastClaim,
}: QuickBillingSectionProps) {
  const [suggestions, setSuggestions] = useState<CashbackClaim[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [confirmVoidLast, setConfirmVoidLast] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const skipNextDropdownRef = useRef(false)

  useEffect(() => {
    setConfirmVoidLast(false)
  }, [lastAddedClaim?.id])

  // Instant 0ms in-memory phone auto-complete from verified store customersList
  useEffect(() => {
    if (skipNextDropdownRef.current) {
      skipNextDropdownRef.current = false
      return
    }

    const typedCore = normalizePhoneCore(customerPhone.trim())

    if (typedCore.length >= 2 && Array.isArray(customersList) && customersList.length > 0) {
      const seenPhones = new Set<string>()
      const prefixMatches: CashbackClaim[] = []
      const partialMatches: CashbackClaim[] = []

      for (const item of customersList) {
        const phoneStr = String(item?.customer_phone || '').trim()
        if (!phoneStr || seenPhones.has(phoneStr)) continue

        const itemCore = normalizePhoneCore(phoneStr)
        if (!itemCore) continue

        if (itemCore.startsWith(typedCore)) {
          seenPhones.add(phoneStr)
          prefixMatches.push(item)
        } else if (typedCore.length >= 3 && itemCore.includes(typedCore)) {
          seenPhones.add(phoneStr)
          partialMatches.push(item)
        }
      }

      const combined = [...prefixMatches, ...partialMatches].slice(0, 6)
      const isExactSingleMatch =
        combined.length === 1 && normalizePhoneCore(combined[0].customer_phone) === typedCore

      if (combined.length > 0 && !isExactSingleMatch) {
        setSuggestions(combined)
        setShowDropdown(true)
      } else {
        setSuggestions([])
        setShowDropdown(false)
      }
    } else {
      setSuggestions([])
      setShowDropdown(false)
    }
  }, [customerPhone, customersList])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  const isLastClaimStillUndoable = (() => {
    if (!lastAddedClaim?.updated_at) return false
    if (lastAddedClaim.status === 'REDEEMED' || lastAddedClaim.status === 'VOIDED') return false
    if (Number(lastAddedClaim.cashback_amount || 0) <= 0) return false
    const elapsed = Date.now() - new Date(lastAddedClaim.updated_at).getTime()
    return elapsed >= 0 && elapsed <= 15 * 60 * 1000
  })()

  // Predict upcoming visit milestone for clear counter feedback
  const upcomingVisitInfo = (() => {
    const hasActiveCycle =
      existingCustomerClaim &&
      existingCustomerClaim.status !== 'REDEEMED' &&
      existingCustomerClaim.status !== 'VOIDED' &&
      currentClaimable > 0

    const currentVisits = hasActiveCycle ? existingCustomerClaim.visit_count || 0 : 0
    const nextVisit = currentVisits >= targetVisits ? targetVisits : currentVisits + 1
    const isRedemptionVisit = targetVisits > 1 && nextVisit >= targetVisits && currentClaimable > 0

    return { nextVisit, isRedemptionVisit }
  })()

  return (
    <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-3xl border border-[#00875A]/10 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-[#00875A]">
              <Zap className="size-5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">New cashback transaction</h2>
            <p className="mt-1 text-xs text-slate-500">
              {targetVisits <= 1
                ? 'Instant Cashback Mode: Credit cashback immediately on this bill.'
                : `Collect cashback on Visits 1–${targetVisits - 1}; unlock & redeem on Visit #${targetVisits}.`}
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00875A]">
            {targetVisits <= 1 ? '1-Visit Instant' : `${targetVisits}-Visit Cycle`}
          </span>
        </div>

        {/* Instant Confirmation Banner for the just-added transaction */}
        {lastAddedClaim && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#00875A]">
                <CheckCircle2 className="size-4 shrink-0" />
                {Number(lastAddedClaim.cashback_amount || 0) > 0 ? (
                  <span>
                    Credited Rs. {Number(lastAddedClaim.cashback_amount || 0).toFixed(2)} to{' '}
                    <span className="font-mono underline">{lastAddedClaim.customer_phone}</span>
                  </span>
                ) : (
                  <span>
                    Unlocked Rs. {Number(lastAddedClaim.claimable_amount || 0).toFixed(2)} reward for{' '}
                    <span className="font-mono underline">{lastAddedClaim.customer_phone}</span>
                  </span>
                )}
              </div>
              {onDismissLastClaim && (
                <button
                  type="button"
                  onClick={onDismissLastClaim}
                  className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span>
                Progress: <strong className="text-slate-900">{lastAddedClaim.visit_count} / {targetVisits} Visits</strong> • Wallet Balance:{' '}
                <strong className="font-mono text-[#00875A]">Rs. {Number(lastAddedClaim.claimable_amount || 0).toFixed(2)}</strong>
                {lastAddedClaim.status === 'READY' && (
                  <span className="ml-1.5 rounded-full bg-[#00875A] px-2 py-0.5 text-[9px] font-extrabold text-white">
                    READY TO REDEEM
                  </span>
                )}
              </span>

              {isLastClaimStillUndoable && onVoidLastClaim && !confirmVoidLast && (
                <button
                  type="button"
                  onClick={() => setConfirmVoidLast(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[10px] font-extrabold text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <RotateCcw className="size-3" /> Wrong number? Undo
                </button>
              )}
            </div>

            {confirmVoidLast && onVoidLastClaim && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200/80">
                <span className="text-[11px] font-bold text-red-600">
                  Void Rs. {Number(lastAddedClaim.cashback_amount || 0).toFixed(2)} cashback?
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmVoidLast(false)}
                    className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setConfirmVoidLast(false)
                      onVoidLastClaim(lastAddedClaim)
                    }}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-extrabold text-white hover:bg-red-700 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'Voiding...' : 'Confirm Undo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleGenerateCashback} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Customer Mobile Number Input Section */}
            <label className="grid gap-2 text-xs font-semibold text-slate-700">
              Customer mobile number
              <div className="flex gap-2">
                <div className="relative flex-1" ref={dropdownRef}>
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="tel"
                    autoComplete="off"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-emerald-100 font-mono transition"
                    placeholder="077 123 4567"
                    required
                  />

                  {/* Instant Auto-complete Dropdown */}
                  {showDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in duration-150">
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Previous Store Customers
                      </p>
                      {suggestions.map((item) => (
                        <button
                          key={item.id || item.customer_phone}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            skipNextDropdownRef.current = true
                            setCustomerPhone(item.customer_phone)
                            setShowDropdown(false)
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-700 hover:bg-emerald-50 hover:text-[#00875A] active:bg-emerald-100 transition cursor-pointer"
                        >
                          <span>{item.customer_phone}</span>
                          <span className="flex items-center gap-1.5 text-[10px] font-sans font-semibold text-slate-400">
                            <span>{item.visit_count || 0}/{targetVisits} visits</span>
                            <Search className="size-3 text-slate-400" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scan Phone QR Button */}
                <button
                  type="button"
                  onClick={startPhoneScanner}
                  className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 text-xs font-bold text-[#00875A] hover:bg-emerald-100 transition cursor-pointer shrink-0"
                  title="Scan Customer Phone QR"
                >
                  <QrCode className="size-4" />
                  <span className="hidden sm:inline">Scan</span>
                </button>
              </div>
            </label>

            <label className="grid gap-2 text-xs font-semibold text-slate-700">
              Bill amount <span className="font-normal text-slate-500">LKR / Rs.</span>
              <input
                type="number"
                step="0.01"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white focus:ring-2 focus:ring-emerald-100 font-mono transition"
                placeholder="0.00"
                inputMode="decimal"
                required
              />
            </label>
          </div>

          {isCheckingCustomer && (
            <p className="text-xs text-slate-400 animate-pulse">Checking customer balance...</p>
          )}

          {/* Customer Balance & Milestone Status Display Box */}
          {existingCustomerClaim && currentClaimable > 0 && existingCustomerClaim.status !== 'REDEEMED' && existingCustomerClaim.status !== 'VOIDED' && (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="size-4 text-[#00875A] shrink-0" />
                  <span className="text-xs font-extrabold text-slate-900">
                    Collected Balance: <span className="font-mono text-[#00875A]">Rs. {currentClaimable.toFixed(2)}</span>
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-[#00875A] bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Visit {upcomingVisitInfo.nextVisit} of {targetVisits}
                </span>
              </div>

              {upcomingVisitInfo.isRedemptionVisit && (
                <p className="text-[11px] font-semibold text-[#00875A] flex items-center gap-1">
                  <Sparkles className="size-3.5 shrink-0" />
                  Redemption Visit! Submitting this bill unlocks Rs. {currentClaimable.toFixed(2)} to deduct right away (no new cashback added on this bill).
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={actionLoading}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#00875A] hover:bg-[#00704a] px-4 text-xs font-extrabold text-white shadow-md shadow-[#00875A]/20 transition cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <CheckCircle2 className="size-4" />
            {actionLoading
              ? 'Processing...'
              : upcomingVisitInfo.isRedemptionVisit
              ? `Unlock Rs. ${currentClaimable.toFixed(2)} Reward for Redemption`
              : 'Add Cashback & Record Visit'}
            <ChevronRight className="size-4" />
          </button>
        </form>

        <button
          type="button"
          onClick={startScanner}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 text-xs font-bold text-[#00875A] transition hover:bg-emerald-100/80 cursor-pointer shadow-xs active:scale-98"
        >
          <QrCode className="size-4 text-[#00875A]" /> Open live QR camera scanner
        </button>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs sm:p-7 flex flex-col justify-between">
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Today&apos;s Overview</h2>
              <p className="mt-1 text-xs text-slate-500">Real-time stats for your store.</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-[#00875A]">
              <Users className="size-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <Users className="mb-3 size-4 text-[#00875A]" />
              <p className="font-mono text-3xl font-black text-slate-900">{customersList.length}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Customers</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <WalletCards className="mb-3 size-4 text-[#00875A]" />
              <p className="font-mono text-2xl font-black text-slate-900">Rs. {totalClaimableSum.toFixed(2)}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Cashback Claimable</p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <button
            onClick={onOpenProfile}
            className="text-xs font-extrabold text-[#00875A] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
          >
            <Settings2 className="size-3.5" /> Manage Cashback Rules in Profile
          </button>
        </div>
      </div>
    </section>
  )
}