'use client'

import { FormEvent, ChangeEvent, useState } from 'react'
import { Store, X, Percent, Upload, MapPin, Star, Tag, Loader2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

// ─── 100% Clear & Refined Single-Purpose Categories ───────────────────────────
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
  handleUpdateTargetVisits,
  logoUploading: externalLogoUploading,
  handleUpdateLogo: externalHandleUpdateLogo
}: StoreSettingsModalProps) {

  // Dynamic States for Additional Fields
  const [logoUrl, setLogoUrl] = useState<string>(merchantSession.logo_url || '')
  const [locationUrl, setLocationUrl] = useState<string>(merchantSession.location_url || '')
  const [reviewUrl, setReviewUrl] = useState<string>(merchantSession.review_url || '')
  const [category, setCategory] = useState<string>(merchantSession.category || 'others')

  // Internal Loading and Success States for Logo (Fallback)
  const [internalLogoUploading, setInternalLogoUploading] = useState<boolean>(false)
  const [logoSuccess, setLogoSuccess] = useState<boolean>(false)

  const [detailsLoading, setDetailsLoading] = useState<boolean>(false)
  const [detailsSuccess, setDetailsSuccess] = useState<boolean>(false)

  const isLogoUploading = externalLogoUploading ?? internalLogoUploading

  // Handle Logo Upload Event
  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. If Parent component provided `handleUpdateLogo`, use it
    if (externalHandleUpdateLogo) {
      externalHandleUpdateLogo(file)
      return
    }

    // 2. Otherwise run internal logic
    try {
      setInternalLogoUploading(true)
      setLogoSuccess(false)

      const fileExt = file.name.split('.').pop() || 'png'
      const filePath = `store_${merchantSession.id}.${fileExt}`

      // Upsert to Storage
      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('store-logos')
        .getPublicUrl(filePath)

      const newPublicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

      // Update DB
      const { error: dbError } = await supabase
        .from('stores')
        .update({ logo_url: newPublicUrl })
        .eq('id', merchantSession.id)

      if (dbError) throw dbError

      setLogoUrl(newPublicUrl)
      merchantSession.logo_url = newPublicUrl
      setLogoSuccess(true)
      setTimeout(() => setLogoSuccess(false), 3000)
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message || err}`)
    } finally {
      setInternalLogoUploading(false)
    }
  }

  // Handle Category, Location, and Review URL Updates
  const handleUpdateStoreDetails = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setDetailsLoading(true)
      setDetailsSuccess(false)

      const { error } = await supabase
        .from('stores')
        .update({
          category: category,
          location_url: locationUrl || null,
          review_url: reviewUrl || null
        })
        .eq('id', merchantSession.id)

      if (error) throw error

      merchantSession.category = category
      merchantSession.location_url = locationUrl
      merchantSession.review_url = reviewUrl

      setDetailsSuccess(true)
      setTimeout(() => setDetailsSuccess(false), 3000)
    } catch (err: any) {
      alert(`Update failed: ${err.message || err}`)
    } finally {
      setDetailsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
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

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Account Details Box */}
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

          {/* SECTION 1: Change Logo (Supabase Storage Integration) */}
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

          {/* SECTION 2: Existing Cashback Rules & Configuration */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store Rules & Configuration</h4>
            
            {/* Form A: Cashback Percent */}
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

            {/* Form B: Target Visits */}
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

          {/* SECTION 3: Store Category, Google Review & Location Links */}
          <form onSubmit={handleUpdateStoreDetails} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store Information & Links</h4>

            {/* Store Category Select */}
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

            {/* Google Location Link */}
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

            {/* Google Review Link */}
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

        </div>

        {/* Modal Footer */}
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