'use client'

import { FormEvent } from 'react'
import { Upload, CalendarDays, Trash2 } from 'lucide-react'

interface Offer {
  id: string
  title: string
  description: string
  image_url: string
  expires_at: string
  created_at: string
}

interface StoreOffersSectionProps {
  offers: Offer[]
  offerTitle: string
  setOfferTitle: (val: string) => void
  offerDesc: string
  setOfferDesc: (val: string) => void
  offerExpiry: string
  setOfferExpiry: (val: string) => void
  offerImage: File | null
  setOfferImage: (file: File | null) => void
  offerUploading: boolean
  offerStatusMsg: { type: 'success' | 'error'; text: string } | null
  handleAddOffer: (e: FormEvent) => void
  setOfferToDelete: (id: string | null) => void
}

export default function StoreOffersSection({
  offers,
  offerTitle,
  setOfferTitle,
  offerDesc,
  setOfferDesc,
  offerExpiry,
  setOfferExpiry,
  offerImage,
  setOfferImage,
  offerUploading,
  offerStatusMsg,
  handleAddOffer,
  setOfferToDelete
}: StoreOffersSectionProps) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Post a store offer</h2>
            <p className="mt-1 text-xs text-slate-500">Share a new reason to visit.</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-2.5 text-[#00875A]">
            <Upload className="size-5" />
          </div>
        </div>

        {offerStatusMsg && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${offerStatusMsg.type === 'success' ? 'bg-emerald-50 text-[#00875A] border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {offerStatusMsg.text}
          </div>
        )}

        <form onSubmit={handleAddOffer} className="grid gap-4">
          <label className="grid gap-2 text-xs font-semibold text-slate-700">
            Offer title
            <input
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white"
              placeholder="e.g. Weekend Sale 20%"
              required
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold text-slate-700">
            Description / Conditions
            <input
              value={offerDesc}
              onChange={(e) => setOfferDesc(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white"
              placeholder="Optional details"
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold text-slate-700 w-full min-w-0">
            Expiry date & time
            <div className="relative w-full min-w-0">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 z-10" />
              <input
                type="datetime-local"
                value={offerExpiry}
                onChange={(e) => setOfferExpiry(e.target.value)}
                className="h-11 w-full max-w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white transition"
                required
              />
            </div>
          </label>

          <label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-3 text-xs text-slate-600 hover:border-[#00875A] hover:bg-emerald-50">
            <Upload className="size-4 text-[#00875A]" />
            {offerImage ? offerImage.name : 'Upload poster image'}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setOfferImage(e.target.files?.[0] || null)}
              className="sr-only"
              required
            />
          </label>

          <button
            type="submit"
            disabled={offerUploading}
            className="mt-2 h-11 w-full rounded-xl bg-[#00875A] hover:bg-[#00704a] text-xs font-extrabold text-white shadow-md shadow-[#00875A]/20 transition cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {offerUploading ? 'Uploading...' : 'Publish offer to customers'}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-extrabold text-slate-900">Active offers ({offers.length})</h2>
          <p className="mt-1 text-xs text-slate-500">Offers currently visible to customers.</p>
        </div>

        <div className="space-y-3">
          {offers.length > 0 ? (
            offers.map((offer) => (
              <div key={offer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={offer.image_url} alt={offer.title} className="w-12 h-12 object-cover rounded-xl border border-slate-200" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{offer.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      Expires: {new Date(offer.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#00875A]">
                    Active
                  </span>
                  <button
                    onClick={() => setOfferToDelete(offer.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No active offers available.</p>
          )}
        </div>
      </div>
    </section>
  )
}