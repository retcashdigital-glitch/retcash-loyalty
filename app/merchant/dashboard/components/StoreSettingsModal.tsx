'use client'

import { FormEvent, ChangeEvent } from 'react'
import { Store, X, Percent } from 'lucide-react'

interface MerchantSession {
  id: string
  store_name: string
  phone_number?: string
  default_cashback_percent?: number
  target_visits?: number
}

interface StoreSettingsModalProps {
  merchantSession: MerchantSession
  onClose: () => void
  cashbackPercentInput: string
  setCashbackPercentInput: (val: string) => void
  cashbackSettingLoading: boolean
  cashbackSuccessMsg: boolean
  handleUpdateCashbackPercent: (e: FormEvent) => void
  targetVisitsInput: string
  handleTargetInputChange: (e: ChangeEvent<HTMLInputElement>) => void
  settingLoading: boolean
  successMsg: boolean
  handleUpdateTargetVisits: (e: FormEvent) => void
}

export default function StoreSettingsModal({
  merchantSession,
  onClose,
  cashbackPercentInput,
  setCashbackPercentInput,
  cashbackSettingLoading,
  cashbackSuccessMsg,
  handleUpdateCashbackPercent,
  targetVisitsInput,
  handleTargetInputChange,
  settingLoading,
  successMsg,
  handleUpdateTargetVisits
}: StoreSettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-[#00875A] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white border border-white/30 backdrop-blur-xs overflow-hidden">
              <img
                src="/logo.png"
                alt="Logo"
                className="size-7 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <Store className="size-5 hidden" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{merchantSession.store_name}</h3>
              <p className="text-[11px] text-emerald-100">Store Profile & Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-[#00875A] uppercase tracking-wider">Account Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Store Name:</span>
                <span className="font-semibold text-slate-900">{merchantSession.store_name}</span>
              </div>
              {merchantSession.phone_number && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Registered Phone:</span>
                  <span className="font-mono font-semibold text-slate-900">+{merchantSession.phone_number}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store Rules & Configuration</h4>
            
            <form onSubmit={handleUpdateCashbackPercent} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <label htmlFor="cashbackPercentModal" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Percent className="size-3.5 text-[#00875A]" /> Default Cashback %
                </label>
                <span className="font-mono text-[10px] text-slate-400">per transaction</span>
              </div>
              <div className="flex gap-2">
                <input
                  id="cashbackPercentModal"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={cashbackPercentInput}
                  onChange={(e) => setCashbackPercentInput(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#00875A] focus:bg-white font-mono text-slate-900"
                  placeholder="5"
                  required
                />
                <button
                  type="submit"
                  disabled={cashbackSettingLoading}
                  className="rounded-lg border border-[#00875A] bg-emerald-50 text-[#00875A] hover:bg-[#00875A] hover:text-white px-4 text-xs font-bold transition cursor-pointer"
                >
                  {cashbackSettingLoading ? '...' : 'Update'}
                </button>
              </div>
              {cashbackSuccessMsg && (
                <p className="text-[11px] text-[#00875A] font-bold mt-1">✓ Default Cashback updated!</p>
              )}
            </form>

            <form onSubmit={handleUpdateTargetVisits} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <label htmlFor="targetModal" className="text-xs font-semibold text-slate-700">Target Visits</label>
                <span className="font-mono text-[10px] text-slate-400">per customer</span>
              </div>
              <div className="flex gap-2">
                <input
                  id="targetModal"
                  type="number"
                  min="3"
                  max="10"
                  value={targetVisitsInput}
                  onChange={handleTargetInputChange}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#00875A] focus:bg-white font-mono text-slate-900"
                  required
                />
                <button
                  type="submit"
                  disabled={settingLoading}
                  className="rounded-lg border border-[#00875A] bg-emerald-50 text-[#00875A] hover:bg-[#00875A] hover:text-white px-4 text-xs font-bold transition cursor-pointer"
                >
                  {settingLoading ? '...' : 'Update'}
                </button>
              </div>
              {successMsg && (
                <p className="text-[11px] text-[#00875A] font-bold mt-1">✓ Target visits updated!</p>
              )}
            </form>
          </div>

        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="bg-[#00875A] hover:bg-[#00704a] text-white font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}