'use client'

import { FormEvent, ChangeEvent, useState, useEffect, useRef } from 'react'
import { Store, X, Percent, Upload, MapPin, Star, Tag, Loader2, Check } from 'lucide-react'
import ProfileInstallSection from '@/components/ProfileInstallSection'
import StoreQrSection from './StoreQrSection'

interface MerchantSession {
  id: string
  store_name: string
  phone_number?: string
  default_cashback_percent?: number
  target_visits?: number
  logo_url?: string
  location_url?: string
  review_url?: string
  category?: string
}

interface StoreSettingsModalProps {
  merchantSession: MerchantSession
  onClose: () => void
  focusQrSection?: boolean
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
  logoUploading?: boolean
  handleUpdateLogo?: (file: File) => void
}

const CATEGORIES = [
  'Food',
  'Groceries',
  'Fashion',
  'Electronics',
  'Beauty',
  'Services',
  'Fitness',
  'Gaming',
  'Healthcare',
  'Education',
  'Automobile',
  'Retail',
  'others'
]

const VISIT_PRESETS = [
  { visits: 1, label: '1 Visit (Instant)' },
  { visits: 3, label: '3 Visits' },
  { visits: 5, label: '5 Visits' },
  { visits: 6, label: '6 Visits' },
]

export default function StoreSettingsModal({
  merchantSession,
  onClose,
  focusQrSection = false,
  cashbackPercentInput,
  setCashbackPercentInput,
  cashbackSettingLoading,
  cashbackSuccessMsg,
  handleUpdateCashbackPercent,
  targetVisitsInput,
  handleTargetInputChange,
  settingLoading,
  successMsg,
  handleUpdateTargetVisits,
  logoUploading: externalLogoUploading,
  handleUpdateLogo: externalHandleUpdateLogo
}: StoreSettingsModalProps) {
  const qrBlockRef = useRef<HTMLDivElement | null>(null)

  const [logoUrl, setLogoUrl] = useState<string>(merchantSession.logo_url || '')
  const [locationUrl, setLocationUrl] = useState<string>(merchantSession.location_url || '')
  const [reviewUrl, setReviewUrl] = useState<string>(merchantSession.review_url || '')
  const [category, setCategory] = useState<string>(merchantSession.category || 'others')

  const [internalLogoUploading, setInternalLogoUploading] = useState<boolean>(false)
  const [logoSuccess, setLogoSuccess] = useState<boolean>(false)

  const [detailsLoading, setDetailsLoading] = useState<boolean>(false)
  const [detailsSuccess, setDetailsSuccess] = useState<boolean>(false)

  const isLogoUploading = externalLogoUploading ?? internalLogoUploading
  const parsedTarget = parseInt(targetVisitsInput, 10) || 1

  useEffect(() => {
    if (focusQrSection && qrBlockRef.current) {
      qrBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusQrSection])

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (externalHandleUpdateLogo) {
      externalHandleUpdateLogo(file)
      return
    }

    try {
      setInternalLogoUploading(true)
      setLogoSuccess(false)

      const formData = new FormData()
      formData.append('action', 'update_logo')
      formData.append('storeId', merchantSession.id)
      formData.append('file', file)

      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Logo upload failed')

      const newPublicUrl = data.logoUrl
      setLogoUrl(newPublicUrl)
      merchantSession.logo_url = newPublicUrl

      const savedMerchant = localStorage.getItem('retcash_merchant')
      if (savedMerchant) {
        const parsed = JSON.parse(savedMerchant)
        localStorage.setItem('retcash_merchant', JSON.stringify({ ...parsed, logo_url: newPublicUrl }))
      }

      setLogoSuccess(true)
      setTimeout(() => setLogoSuccess(false), 3000)
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message || err}`)
    } finally {
      setInternalLogoUploading(false)
    }
  }

  const handleUpdateStoreDetails = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setDetailsLoading(true)
      setDetailsSuccess(false)

      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_store_details',
          storeId: merchantSession.id,
          category,
          locationUrl: locationUrl || null,
          reviewUrl: reviewUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')

      merchantSession.category = category
      merchantSession.location_url = locationUrl
      merchantSession.review_url = reviewUrl

      const savedMerchant = localStorage.getItem('retcash_merchant')
      if (savedMerchant) {
        const parsed = JSON.parse(savedMerchant)
        localStorage.setItem(
          'retcash_merchant',
          JSON.stringify({
            ...parsed,
            category,
            location_url: locationUrl,
            review_url: reviewUrl,
          })
        )
      }

      setDetailsSuccess(true)
      setTimeout(() => setDetailsSuccess(false), 3000)
    } catch (err: any) {
      alert(`Update failed: ${err.message || err}`)
    } finally {
      setDetailsLoading(false)
    }
  }

  const applyPresetVisits = (visits: number) => {
    const syntheticEvent = {
      target: { value: String(visits) },
    } as ChangeEvent<HTMLInputElement>
    handleTargetInputChange(syntheticEvent)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-[#00875A] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white border border-white/30 backdrop-blur-xs overflow-hidden shrink-0">
              {merchantSession.logo_url || logoUrl ? (
                <img
                  src={merchantSession.logo_url || logoUrl}
                  alt="Logo"
                  className="size-full object-cover"
                />
              ) : (
                <Store className="size-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{merchantSession.store_name}</h3>
              <p className="text-[11px] text-emerald-100">Store QR, Profile & Settings</p>
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
          
          <div ref={qrBlockRef}>
            <StoreQrSection
              storeId={merchantSession.id}
              storeName={merchantSession.store_name}
              cashbackPercent={merchantSession.default_cashback_percent ?? 5}
              targetVisits={merchantSession.target_visits ?? 6}
            />
          </div>

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

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Upload className="size-3.5 text-[#00875A]" /> Store Logo
            </h4>
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {merchantSession.logo_url || logoUrl ? (
                  <img src={merchantSession.logo_url || logoUrl} alt="Store Logo" className="size-full object-cover" />
                ) : (
                  <Store className="size-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00875A] bg-emerald-50 text-[#00875A] hover:bg-[#00875A] hover:text-white text-xs font-bold transition cursor-pointer">
                  {isLogoUploading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    'Change Logo'
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={isLogoUploading}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400">Replaces existing logo automatically in Supabase Storage</p>
              </div>
            </div>
            {logoSuccess && (
              <p className="text-[11px] text-[#00875A] font-bold flex items-center gap-1">
                <Check className="size-3" /> Logo updated successfully!
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store Rules & Configuration</h4>
            
            <form onSubmit={handleUpdateCashbackPercent} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <label htmlFor="cashbackPercentModal" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Percent className="size-3.5 text-[#00875A]" /> Default Cashback %
                </label>
                <span className="font-mono text-[10px] text-slate-400">per earning bill</span>
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

            <form onSubmit={handleUpdateTargetVisits} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label htmlFor="targetModal" className="text-xs font-semibold text-slate-700">Target Visits (1 – 10)</label>
                <span className="font-mono text-[10px] text-slate-400">redeem milestone</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {VISIT_PRESETS.map((preset) => {
                  const isActive = parsedTarget === preset.visits
                  return (
                    <button
                      key={preset.visits}
                      type="button"
                      onClick={() => applyPresetVisits(preset.visits)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border transition cursor-pointer ${
                        isActive
                          ? 'bg-[#00875A] text-white border-[#00875A]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#00875A]/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <input
                  id="targetModal"
                  type="number"
                  min="1"
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

              <p className="text-[10px] leading-relaxed text-slate-500">
                {parsedTarget <= 1
                  ? '⚡ Instant Mode: Customers earn cashback on Visit #1 and can redeem it right away.'
                  : `🎯 Loyalty Mode: Customers collect cashback on Visits 1–${parsedTarget - 1}, then unlock & redeem on Visit #${parsedTarget}.`}
              </p>

              {successMsg && (
                <p className="text-[11px] text-[#00875A] font-bold mt-1">✓ Target visits updated!</p>
              )}
            </form>
          </div>

          <form onSubmit={handleUpdateStoreDetails} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store Information & Links</h4>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="size-3.5 text-[#00875A]" /> Store Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-[#00875A] focus:bg-white text-slate-900 font-medium"
              >
                {!CATEGORIES.includes(category) && category !== '' && (
                  <option value={category}>{category}</option>
                )}
                
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-[#00875A]" /> Google Maps Location Link
              </label>
              <input
                type="url"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-[#00875A] focus:bg-white font-mono text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Star className="size-3.5 text-[#00875A]" /> Google Review Link
              </label>
              <input
                type="url"
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                placeholder="https://g.page/r/..."
                className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-[#00875A] focus:bg-white font-mono text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={detailsLoading}
              className="w-full py-2.5 rounded-lg border border-[#00875A] bg-emerald-50 text-[#00875A] hover:bg-[#00875A] hover:text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
            >
              {detailsLoading ? <Loader2 className="size-4 animate-spin" /> : 'Save Store Info'}
            </button>

            {detailsSuccess && (
              <p className="text-[11px] text-[#00875A] font-bold mt-1 text-center">
                ✓ Store information & links updated!
              </p>
            )}
          </form>

          <ProfileInstallSection />

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