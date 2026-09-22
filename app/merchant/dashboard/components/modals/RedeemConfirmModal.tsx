'use client'

import { CheckCircle2, Receipt } from 'lucide-react'

interface Props {
  showModal: boolean
  scannedClaimData: any
  actionLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function RedeemConfirmModal({
  showModal,
  scannedClaimData,
  actionLoading,
  onClose,
  onConfirm,
}: Props) {
  if (!showModal || !scannedClaimData) return null

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 relative z-10">
        <div className="w-12 h-12 bg-emerald-50 text-[#00875A] rounded-full flex items-center justify-center mx-auto text-xl font-bold border border-emerald-200">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Confirm Reward Redemption</h3>
          <p className="text-xs text-slate-500">
            Customer: <span className="font-mono font-bold text-slate-800">{scannedClaimData.customer_phone}</span>
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-left">
          <div className="flex justify-between items-center text-xs text-slate-600 pb-1 border-b border-slate-200 font-semibold">
            <span className="flex items-center gap-1"><Receipt className="size-3.5 text-[#00875A]" /> RECEIPT SUMMARY</span>
            <span className="bg-emerald-100 text-[#00875A] text-[10px] px-2 py-0.5 rounded-full font-bold">REDEEMING</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Original Bill Amount</span>
            <span className="font-bold text-slate-900 font-mono">Rs. {Number(scannedClaimData.bill_amount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-red-600 font-medium">
            <span>Cashback Discount</span>
            <span className="font-bold font-mono">- Rs. {Number(scannedClaimData.claimable_amount || 0).toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-800 uppercase">Collect From Customer</span>
            <span className="text-base font-black text-[#00875A] font-mono">
              Rs. {Math.max(0, Number(scannedClaimData.bill_amount || 0) - Number(scannedClaimData.claimable_amount || 0)).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-1 relative z-20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={actionLoading}
            className="flex-1 bg-[#00875A] hover:bg-[#00704a] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
          >
            {actionLoading ? 'Processing...' : 'Confirm & Reset'}
          </button>
        </div>
      </div>
    </div>
  )
}