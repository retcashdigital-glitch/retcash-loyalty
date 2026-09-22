'use client'

import { useState } from 'react'
import { Lock, Clock, MessageCircle, RotateCcw, WalletCards, Check, FileCheck, Image as ImageIcon, Upload } from 'lucide-react'

interface Props {
  isTrialExpired: boolean
  isPendingVerification: boolean
  merchantSession: any
  adminPhone: string
  selectedPlan: 'MONTHLY' | 'YEARLY'
  setSelectedPlan: (plan: 'MONTHLY' | 'YEARLY') => void
  receiptFile: File | null
  setReceiptFile: (file: File | null) => void
  transactionRef: string
  setTransactionRef: (ref: string) => void
  isSubmittingPayment: boolean
  uploadedReceiptUrl: string | null
  isCancellingPayment: boolean
  handlePaymentSubmission: (e: React.FormEvent) => void
  handleCancelPaymentRequest: () => void
  handleLogout: () => void
}

export default function SubscriptionLockModal({
  isTrialExpired,
  isPendingVerification,
  merchantSession,
  adminPhone,
  selectedPlan,
  setSelectedPlan,
  receiptFile,
  setReceiptFile,
  transactionRef,
  setTransactionRef,
  isSubmittingPayment,
  uploadedReceiptUrl,
  isCancellingPayment,
  handlePaymentSubmission,
  handleCancelPaymentRequest,
  handleLogout
}: Props) {
  if (!isTrialExpired) return null

  const planDetails = selectedPlan === 'YEARLY' 
    ? { title: 'Annual Pass', price: 'Rs. 7,900 / Year' } 
    : { title: 'Monthly Pass', price: 'Rs. 990 / Month' }

  const renewalMessage = encodeURIComponent(
    `Hello RETCASH Support,\n\n` +
    `I have uploaded my payment receipt for subscription renewal:\n\n` +
    `🏪 *Store Name:* ${merchantSession.store_name}\n` +
    `🆔 *Store ID:* ${merchantSession.id}\n` +
    `💳 *Selected Plan:* ${planDetails.title} (${planDetails.price})\n` +
    `🔢 *Ref No:* ${transactionRef || 'N/A'}\n` +
    (uploadedReceiptUrl ? `\n🧾 *Receipt Photo:* ${uploadedReceiptUrl}\n` : '') +
    `\nPlease verify and activate my account.`
  )

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-6 my-auto animate-in fade-in zoom-in-95">
        
        {isPendingVerification ? (
          <div className="space-y-6 py-2">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-sm animate-pulse">
              <Clock className="size-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black tracking-wider text-amber-700 uppercase bg-amber-100/60 px-3 py-1 rounded-full border border-amber-200">
                Verification Pending
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Payment Under Review
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your payment receipt for <strong className="text-slate-800">{merchantSession.store_name}</strong> has been received. Our team is verifying the deposit.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Store ID:</span>
                <span className="font-mono font-bold text-slate-800">{merchantSession.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Selected Plan:</span>
                <span className="font-bold text-[#00875A]">{planDetails.title} ({planDetails.price})</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/${adminPhone}?text=${renewalMessage}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#00875A] hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <MessageCircle size={18} />
                <span>Send Reminder via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleCancelPaymentRequest}
                disabled={isCancellingPayment}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-2xl text-xs transition border border-slate-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={14} />
                <span>{isCancellingPayment ? 'Cancelling...' : 'Cancel Request & Re-upload Receipt'}</span>
              </button>

              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition py-1 cursor-pointer block mx-auto"
              >
                Sign out of merchant account
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePaymentSubmission} className="space-y-6 text-left">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                <Lock className="size-8" />
              </div>
              <span className="text-[11px] font-black tracking-wider text-red-600 uppercase bg-red-50 px-3 py-1 rounded-full border border-red-100 inline-block">
                Action Required
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Subscription Expired
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your subscription for <strong className="text-slate-800">{merchantSession.store_name}</strong> has ended. Select a plan and upload your payment slip below.
              </p>
            </div>

            {/* 1. PLAN SELECTION */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">1. Choose Your Plan:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('MONTHLY')}
                  className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer ${
                    selectedPlan === 'MONTHLY'
                      ? 'border-[#00875A] bg-emerald-50/50 text-slate-900 shadow-sm ring-1 ring-[#00875A]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {selectedPlan === 'MONTHLY' && (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-[#00875A] text-white rounded-full flex items-center justify-center text-[10px]">
                      <Check size={10} />
                    </span>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Pass</p>
                  <p className="text-base font-black text-slate-900 mt-1">Rs. 990</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('YEARLY')}
                  className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer ${
                    selectedPlan === 'YEARLY'
                      ? 'border-[#00875A] bg-emerald-50/50 text-slate-900 shadow-sm ring-1 ring-[#00875A]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Annual Pass</p>
                  <p className="text-base font-black text-[#00875A] mt-1">Rs. 7,900</p>
                </button>
              </div>
            </div>

            {/* 2. FILE UPLOAD */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">2. Upload Payment Proof:</label>
              <div className="border-2 border-dashed border-slate-300 hover:border-[#00875A] rounded-2xl p-4 text-center transition cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  {receiptFile ? (
                    <>
                      <FileCheck className="size-8 text-[#00875A]" />
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{receiptFile.name}</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="size-8 text-slate-400" />
                      <p className="text-xs font-bold text-slate-700">Tap to upload receipt photo</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmittingPayment || !receiptFile}
              className="w-full bg-[#00875A] hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmittingPayment ? 'Submitting...' : 'Submit Receipt for Approval'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}