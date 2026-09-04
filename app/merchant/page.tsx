'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  LogOut,
  MessageCircle,
  Phone,
  QrCode,
  Search,
  Settings2,
  Upload,
  Users,
  WalletCards,
  X,
  Trash2,
  CheckCircle2
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface MerchantSession {
  id: string
  store_name: string
  default_cashback_percent?: number
  target_visits?: number
}

interface CashbackClaim {
  id: string
  customer_phone: string
  claimable_amount: number
  visit_count: number
  status: string
}

interface Offer {
  id: string
  title: string
  description: string
  image_url: string
  expires_at: string
  created_at: string
}

type Tab = 'billing' | 'offers' | 'customers'

export default function GlobalEntryPoint() {
  const router = useRouter()
  
  // Auth state for non-logged in state
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Merchant session & core action states
  const [merchantSession, setMerchantSession] = useState<MerchantSession | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<Tab>('billing')

  // Target Visits settings state
  const [targetVisitsInput, setTargetVisitsInput] = useState('6')
  const [settingLoading, setSettingLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)

  // QR Scanner State
  const [scannedClaimData, setScannedClaimData] = useState<CashbackClaim | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  // OFFERS MANAGEMENT STATE
  const [offers, setOffers] = useState<Offer[]>([])
  const [offerTitle, setOfferTitle] = useState('')
  const [offerDesc, setOfferDesc] = useState('')
  const [offerExpiry, setOfferExpiry] = useState('')
  const [offerImage, setOfferImage] = useState<File | null>(null)
  const [offerUploading, setOfferUploading] = useState(false)
  const [offerStatusMsg, setOfferStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // DELETE CONFIRMATION MODAL STATE
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null)

  // Customers list state
  const [customersList, setCustomersList] = useState<CashbackClaim[]>([])
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')

  useEffect(() => {
    const savedMerchant = localStorage.getItem('retcash_merchant')
    if (savedMerchant) {
      try {
        const parsed: MerchantSession = JSON.parse(savedMerchant)
        setMerchantSession(parsed)
        setTargetVisitsInput(String(Math.min(parsed.target_visits || 6, 10)))
        fetchStoreOffers(parsed.id)
        fetchStoreCustomers(parsed.id)
      } catch (e) {
        console.error(e)
      }
    }

    return () => {
      stopScannerInstance()
    }
  }, [])

  const fetchStoreOffers = async (storeId: string) => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('store_offers')
        .select('*')
        .eq('store_id', storeId)
        .gte('expires_at', now)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOffers(data)
      }
    } catch (err) {
      console.error('Error fetching offers:', err)
    }
  }

  const fetchStoreCustomers = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('cashback_claims')
        .select('*')
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setCustomersList(data)
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
    }
  }

  const stopScannerInstance = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop()
        }
      } catch (err) {
        console.error('Failed to stop scanner:', err)
      }
    }
  }

  const formatPhoneNumber = (inputPhone: string) => {
    let cleaned = inputPhone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    if (!cleaned.startsWith('94')) {
      cleaned = '94' + cleaned
    }
    return cleaned
  }

  const handleCheckUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone || phone.replace(/\D/g, '').length < 8) {
      setError('Please enter a valid mobile number')
      return
    }

    try {
      setLoading(true)
      setError('')

      const cleanPhone = formatPhoneNumber(phone)

      const { data: storeData } = await supabase
        .from('stores')
        .select('id, phone_number')
        .eq('phone_number', cleanPhone)
        .maybeSingle()

      if (storeData) {
        router.push(`/merchant/login?phone=${cleanPhone}`)
        return
      }

      router.push(`/merchant/register?phone=${cleanPhone}`)

    } catch (err: unknown) {
      console.error(err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTargetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      setTargetVisitsInput('')
      return
    }
    let num = parseInt(val, 10)
    if (!isNaN(num)) {
      if (num > 10) num = 10
      setTargetVisitsInput(String(num))
    }
  }

  const handleUpdateTargetVisits = async (e: React.FormEvent) => {
    e.preventDefault()
    let newTarget = parseInt(targetVisitsInput, 10)

    if (isNaN(newTarget) || newTarget < 3) {
      alert('Target visits must be at least 3.')
      return
    }

    newTarget = Math.min(newTarget, 10)
    setTargetVisitsInput(String(newTarget))

    if (!merchantSession?.id) return

    setSettingLoading(true)
    try {
      const { error } = await supabase
        .from('stores')
        .update({ target_visits: newTarget })
        .eq('id', merchantSession.id)

      if (error) throw error

      const updatedSession = { ...merchantSession, target_visits: newTarget }
      setMerchantSession(updatedSession)
      localStorage.setItem('retcash_merchant', JSON.stringify(updatedSession))

      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : JSON.stringify(err)
      alert('Failed to update target visits: ' + message)
    } finally {
      setSettingLoading(false)
    }
  }

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    setOfferStatusMsg(null)

    if (!offerTitle || !offerImage || !offerExpiry || !merchantSession?.id) {
      setOfferStatusMsg({ type: 'error', text: 'Please fill title, expiry date, and select an image.' })
      return
    }

    setOfferUploading(true)
    try {
      const fileExt = offerImage.name.split('.').pop()
      const fileName = `${merchantSession.id}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('offer-posters')
        .upload(filePath, offerImage)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('offer-posters')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      const { error: dbError } = await supabase
        .from('store_offers')
        .insert({
          store_id: merchantSession.id,
          title: offerTitle,
          description: offerDesc,
          image_url: publicUrl,
          expires_at: new Date(offerExpiry).toISOString(),
          is_active: true
        })

      if (dbError) throw dbError

      setOfferStatusMsg({ type: 'success', text: '🎉 Offer posted successfully!' })
      setOfferTitle('')
      setOfferDesc('')
      setOfferExpiry('')
      setOfferImage(null)
      fetchStoreOffers(merchantSession.id)

    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Database or Network Error'
      setOfferStatusMsg({ type: 'error', text: 'Failed: ' + message })
    } finally {
      setOfferUploading(false)
    }
  }

  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return

    try {
      const { error } = await supabase.from('store_offers').delete().eq('id', offerToDelete)
      if (error) throw error
      setOffers(offers.filter(o => o.id !== offerToDelete))
      setOfferToDelete(null)
    } catch (err) {
      console.error(err)
      alert('Failed to delete offer.')
      setOfferToDelete(null)
    }
  }

  const startScanner = async () => {
    setIsScanning(true)
    setScannedClaimData(null)

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            await stopScannerInstance()
            processScannedResult(decodedText)
          },
          () => {}
        )
      } catch (err) {
        console.error('Camera start error:', err)
        alert('Failed to start camera or permission denied.')
        setIsScanning(false)
      }
    }, 100)
  }

  const processScannedResult = async (inputVal: string) => {
    if (!inputVal || !merchantSession?.id) return

    try {
      setActionLoading(true)
      let claimId = inputVal.trim()
      if (claimId.includes('/card/')) {
        const parts = claimId.split('/card/')
        claimId = parts[parts.length - 1].split('?')[0]
      }

      const { data, error } = await supabase
        .from('cashback_claims')
        .select('*')
        .eq('id', claimId)
        .eq('store_id', merchantSession.id)
        .maybeSingle()

      if (error || !data) {
        alert('Invalid QR Code or does not belong to this store.')
        setScannedClaimData(null)
        return
      }

      setScannedClaimData(data)
    } catch (err) {
      console.error(err)
      alert('Error verifying QR code.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRedeemScannedReward = async () => {
    if (!scannedClaimData) return

    if (!confirm(`Have you handed over the reward to customer (Phone: ${scannedClaimData.customer_phone})? The reward balance of Rs. ${scannedClaimData.claimable_amount} will be reset to zero.`)) {
      return
    }

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('cashback_claims')
        .update({
          claimable_amount: 0,
          status: 'REDEEMED',
        })
        .eq('id', scannedClaimData.id)

      if (error) throw error

      alert('🎉 Reward successfully redeemed! Balance cleared.')
      setScannedClaimData(null)
      setIsScanning(false)
      fetchStoreCustomers(merchantSession!.id)
    } catch (err) {
      console.error(err)
      alert('Failed to process redemption.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateCashback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerPhone || !billAmount) return

    setActionLoading(true)
    try {
      const cashbackPercentage = merchantSession?.default_cashback_percent || 5
      const targetVisits = Math.min(merchantSession?.target_visits || 6, 10)

      const billNum = parseFloat(billAmount)
      const cashbackAmount = Math.round(((billNum * cashbackPercentage) / 100) * 100) / 100

      const cleanCustPhone = formatPhoneNumber(customerPhone)
      const storeId = merchantSession?.id

      if (!storeId) {
        alert('Merchant session not found. Please log in again.')
        setActionLoading(false)
        return
      }

      const { data: existingClaims } = await supabase
        .from('cashback_claims')
        .select('id, visit_count, claimable_amount, status')
        .eq('store_id', storeId)
        .eq('customer_phone', cleanCustPhone)
        .neq('status', 'REDEEMED')
        .maybeSingle()

      let newVisitCount = 1
      let totalClaimable = cashbackAmount
      let claimId: string | undefined = undefined

      if (existingClaims) {
        const currentVisits = existingClaims.visit_count || 1
        newVisitCount = currentVisits >= targetVisits ? targetVisits : currentVisits + 1
        totalClaimable = Math.round((Number(existingClaims.claimable_amount || 0) + cashbackAmount) * 100) / 100
        claimId = existingClaims.id
      }

      interface Payload {
        id?: string
        store_id: string
        customer_phone: string
        bill_amount: number
        cashback_amount: number
        claimable_amount: number
        visit_count: number
        status: string
      }

      const payload: Payload = {
        store_id: storeId,
        customer_phone: cleanCustPhone,
        bill_amount: billNum,
        cashback_amount: cashbackAmount,
        claimable_amount: totalClaimable,
        visit_count: newVisitCount,
        status: newVisitCount >= targetVisits ? 'READY' : 'PENDING',
      }

      if (claimId) {
        payload.id = claimId
      }

      const { data: upsertedData, error: upsertError } = await supabase
        .from('cashback_claims')
        .upsert(payload, { onConflict: 'store_id, customer_phone' })
        .select('id')
        .single()

      if (upsertError) throw upsertError
      if (upsertedData && upsertedData.id) {
        claimId = upsertedData.id
      }

      const baseUrl = window.location.origin
      const cardLink = `${baseUrl}/card/${claimId}`
      const storeName = merchantSession?.store_name || 'RETCASH Partner'

      const message = `🎉 *Retcash Rewards - ${storeName}*\n\n` +
        `உங்களின் வருகை வெற்றிகரமாகப் பதிவு செய்யப்பட்டுள்ளது! 📍\n\n` +
        `🛍️ பில் தொகை: *Rs. ${billNum}*\n` +
        `💰 பெற்ற காஷ்பேக் (${cashbackPercentage}%): *Rs. ${cashbackAmount}*\n` +
        `⭐ வருகை எண்ணிக்கை (Visits): *${newVisitCount} / ${targetVisits}*\n\n` +
        `🎁 தற்போதைய மொத்த காஷ்பேக் இருப்பு (Balance): *Rs. ${totalClaimable}*\n\n` +
        `✨ தொடர்ந்து வருகை தந்து உங்களின் பிரத்யேக வெகுமதிகளைப் பெறுங்கள்!\n\n` +
        `👉 உங்களின் டிஜிட்டல் கார்டு, நேரலை இருப்பு (Live Balance) மற்றும் காஷ்பேக் விவரங்களைக் காண கீழே உள்ள லிங்கை அழுத்தவும்:\n${cardLink}`

      const whatsappUrl = `https://wa.me/${cleanCustPhone}?text=${encodeURIComponent(message)}`

      setCustomerPhone('')
      setBillAmount('')
      setActionLoading(false)
      fetchStoreCustomers(storeId)

      const opened = window.open(whatsappUrl, '_blank')
      if (!opened) {
        window.location.href = whatsappUrl
      }

    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : JSON.stringify(err)
      alert('Error processing cashback: ' + message)
      setActionLoading(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
    { id: 'billing', label: 'Quick Billing & Scanner', icon: MessageCircle },
    { id: 'offers', label: 'Store Offers', icon: Upload },
    { id: 'customers', label: 'Customers', icon: Users },
  ]

  // LOGGED IN DASHBOARD VIEW (Dark Slate + Warm Orange Theme)
  if (merchantSession) {
    const targetVisits = Math.min(merchantSession?.target_visits || 6, 10)
    const filteredCustomers = customersList.filter(c => c.customer_phone.includes(customerSearchQuery))
    const totalClaimableSum = customersList.reduce((acc, curr) => acc + Number(curr.claimable_amount || 0), 0)

    return (
      <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans selection:bg-[#EA580C] selection:text-white">
        
        {/* DELETE CONFIRMATION MODAL */}
        {offerToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold border border-red-500/20">
                <Trash2 className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">Delete Offer</h3>
                <p className="text-xs text-[#94A3B8]">Are you sure you want to delete this offer permanently?</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setOfferToDelete(null)}
                  className="flex-1 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteOffer}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <header className="border-b border-[#334155]/80 bg-[#1E293B]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-5 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]">
                <WalletCards className="size-5" />
              </div>
              <div>
                <p className="font-mono text-[13px] font-semibold text-[#F8FAFC]">{merchantSession.store_name}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Store dashboard
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem('retcash_merchant')
                  setMerchantSession(null)
                }}
                className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition cursor-pointer"
                type="button"
              >
                <LogOut className="size-3.5" /> Logout
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
          
          {/* TITLE & HEADER BANNER */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#EA580C]">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#F8FAFC] sm:text-4xl">Keep your customers coming back.</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#94A3B8]">Reward every visit instantly and keep your regulars in the loop.</p>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <nav aria-label="Merchant dashboard sections" className="mb-6 border-b border-[#334155]">
            <div className="grid grid-cols-3 gap-1" role="tablist">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  id={`${id}-tab`}
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 border-b-2 px-1 py-2 text-center text-[10px] font-semibold leading-tight transition cursor-pointer sm:min-h-12 sm:flex-row sm:gap-2 sm:px-5 sm:py-3 sm:text-xs ${
                    activeTab === id 
                      ? 'border-[#EA580C] text-[#EA580C]' 
                      : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                  type="button"
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* TAB 1: QUICK BILLING & SCANNER */}
          {activeTab === 'billing' && (
            <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
              {/* CASHBACK TRANSACTION FORM */}
              <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5 shadow-xl sm:p-7">
                <div className="mb-7 flex items-start justify-between">
                  <div>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#EA580C]/15 text-[#EA580C]">
                      <MessageCircle className="size-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">New cashback transaction</h2>
                    <p className="mt-1 text-xs text-[#94A3B8]">Add a visit and notify your customer on WhatsApp.</p>
                  </div>
                  <span className="rounded-full border border-[#EA580C]/30 bg-[#EA580C]/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#EA580C]">
                    Live
                  </span>
                </div>

                <form onSubmit={handleGenerateCashback} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-xs font-medium text-[#94A3B8]">
                      Customer WhatsApp number
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="h-12 w-full rounded-xl border border-[#334155] bg-[#0F172A] pl-10 pr-3 text-sm text-[#F8FAFC] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20 font-mono transition"
                          placeholder="077 123 4567"
                          required
                        />
                      </div>
                    </label>

                    <label className="grid gap-2 text-xs font-medium text-[#94A3B8]">
                      Bill amount <span className="font-normal text-[#94A3B8]/80">LKR / Rs.</span>
                      <input
                        type="number"
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        className="h-12 w-full rounded-xl border border-[#334155] bg-[#0F172A] px-3 text-sm text-[#F8FAFC] outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20 font-mono transition"
                        placeholder="0.00"
                        inputMode="decimal"
                        required
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] hover:bg-[#d64e05] px-4 text-xs font-bold text-white shadow-[0_4px_20px_rgba(234,88,12,0.3)] transition cursor-pointer"
                  >
                    <MessageCircle className="size-4" />
                    {actionLoading ? 'Processing...' : 'Add cashback & send WhatsApp'}
                    <ChevronRight className="size-4" />
                  </button>
                </form>

                <button
                  type="button"
                  onClick={startScanner}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#334155] bg-[#0F172A] text-xs font-medium text-[#F8FAFC] transition hover:border-[#EA580C]/50 hover:bg-[#1E293B] cursor-pointer"
                >
                  <QrCode className="size-4 text-[#EA580C]" /> Open live QR camera scanner
                </button>
              </div>

              {/* QUICK STATS & TARGET VISITS */}
              <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5 sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">Today's quick stats</h2>
                    <p className="mt-1 text-xs text-[#94A3B8]">Your store at a glance.</p>
                  </div>
                  <div className="rounded-lg bg-[#0F172A] p-2 text-[#94A3B8]">
                    <Settings2 className="size-4" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#334155] bg-[#0F172A]/70 p-4">
                    <Users className="mb-5 size-4 text-[#EA580C]" />
                    <p className="font-mono text-3xl font-semibold text-[#F8FAFC]">{customersList.length}</p>
                    <p className="mt-1 text-[11px] text-[#94A3B8]">Total visits</p>
                  </div>
                  <div className="rounded-xl border border-[#334155] bg-[#0F172A]/70 p-4">
                    <WalletCards className="mb-5 size-4 text-emerald-400" />
                    <p className="font-mono text-2xl font-semibold text-[#F8FAFC]">Rs. {totalClaimableSum}</p>
                    <p className="mt-1 text-[11px] text-[#94A3B8]">Total cashback claimable</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#334155] pt-5">
                  <form onSubmit={handleUpdateTargetVisits}>
                    <div className="mb-3 flex items-center justify-between">
                      <label htmlFor="target" className="text-xs font-medium text-[#F8FAFC]">Target visits</label>
                      <span className="font-mono text-[11px] text-[#94A3B8]">per customer</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="target"
                        type="number"
                        min="3"
                        max="10"
                        value={targetVisitsInput}
                        onChange={handleTargetInputChange}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-[#334155] bg-[#0F172A] px-3 text-sm outline-none focus:border-[#EA580C] font-mono text-[#F8FAFC]"
                        required
                      />
                      <button
                        type="submit"
                        disabled={settingLoading}
                        className="rounded-lg border border-[#EA580C] bg-[#EA580C]/10 text-[#EA580C] hover:bg-[#EA580C] hover:text-white px-3 text-xs font-semibold transition cursor-pointer"
                      >
                        {settingLoading ? '...' : 'Update'}
                      </button>
                    </div>
                    {successMsg && (
                      <p className="text-[11px] text-emerald-400 font-semibold mt-2">✓ Target visits updated!</p>
                    )}
                  </form>
                </div>
              </div>
            </section>
          )}

          {/* TAB 2: STORE OFFERS */}
          {activeTab === 'offers' && (
            <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5 sm:p-7">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">Post a store offer</h2>
                    <p className="mt-1 text-xs text-[#94A3B8]">Share a new reason to visit.</p>
                  </div>
                  <div className="rounded-lg bg-[#EA580C]/10 p-2 text-[#EA580C]">
                    <Upload className="size-4" />
                  </div>
                </div>

                {offerStatusMsg && (
                  <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${offerStatusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                    {offerStatusMsg.text}
                  </div>
                )}

                <form onSubmit={handleAddOffer} className="grid gap-4">
                  <label className="grid gap-2 text-xs font-medium text-[#94A3B8]">
                    Offer title
                    <input
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      className="h-11 rounded-lg border border-[#334155] bg-[#0F172A] px-3 text-sm text-[#F8FAFC] outline-none focus:border-[#EA580C]"
                      placeholder="e.g. Weekend Sale 20%"
                      required
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-medium text-[#94A3B8]">
                    Description / Conditions
                    <input
                      value={offerDesc}
                      onChange={(e) => setOfferDesc(e.target.value)}
                      className="h-11 rounded-lg border border-[#334155] bg-[#0F172A] px-3 text-sm text-[#F8FAFC] outline-none focus:border-[#EA580C]"
                      placeholder="Optional details"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-medium text-[#94A3B8]">
                    Expiry date & time
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="datetime-local"
                        value={offerExpiry}
                        onChange={(e) => setOfferExpiry(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#334155] bg-[#0F172A] pl-10 pr-3 text-sm text-[#F8FAFC] outline-none focus:border-[#EA580C]"
                        required
                      />
                    </div>
                  </label>

                  <label className="flex h-12 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#334155] bg-[#0F172A] px-3 text-xs text-[#94A3B8] hover:border-[#EA580C]">
                    <Upload className="size-4 text-[#EA580C]" />
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
                    className="mt-2 h-11 w-full rounded-lg bg-[#EA580C] hover:bg-[#d64e05] text-xs font-bold text-white shadow-lg transition cursor-pointer"
                  >
                    {offerUploading ? 'Uploading...' : 'Publish offer to customers'}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5 sm:p-7">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-[#F8FAFC]">Active offers ({offers.length})</h2>
                  <p className="mt-1 text-xs text-[#94A3B8]">Offers currently visible to customers.</p>
                </div>

                <div className="space-y-3">
                  {offers.length > 0 ? (
                    offers.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#334155] bg-[#0F172A]/70 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={offer.image_url} alt={offer.title} className="w-12 h-12 object-cover rounded-lg border border-[#334155]" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#F8FAFC] truncate">{offer.title}</p>
                            <p className="mt-0.5 text-xs text-[#94A3B8] truncate">
                              Expires: {new Date(offer.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase text-emerald-400">
                            Active
                          </span>
                          <button
                            onClick={() => setOfferToDelete(offer.id)}
                            className="p-1.5 text-[#94A3B8] hover:text-red-400 transition cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#94A3B8] text-center py-6">No active offers available.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: CUSTOMERS DIRECTORY */}
          {activeTab === 'customers' && (
            <section className="max-w-3xl">
              <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5 sm:p-7">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">Customers directory</h2>
                    <p className="mt-1 text-xs text-[#94A3B8]">Your most recent customer activity.</p>
                  </div>
                  <span className="rounded-full bg-[#0F172A] border border-[#334155] px-2.5 py-1 font-mono text-[10px] text-[#94A3B8]">
                    {filteredCustomers.length} customers
                  </span>
                </div>

                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-lg border border-[#334155] bg-[#0F172A] pl-10 pr-3 text-sm text-[#F8FAFC] outline-none focus:border-[#EA580C] font-mono"
                    placeholder="Search customer by phone number..."
                  />
                </div>

                <div className="space-y-3">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((cust) => (
                      <div key={cust.id} className="flex flex-col justify-between gap-4 rounded-xl border border-[#334155] bg-[#0F172A]/70 p-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-mono text-sm font-semibold text-[#F8FAFC]">{cust.customer_phone}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
                            <span>Visits: <strong className="font-medium text-[#F8FAFC]">{cust.visit_count} / {targetVisits}</strong></span>
                            <span>Cashback: <strong className="font-medium text-[#F8FAFC]">Rs. {cust.claimable_amount}</strong></span>
                          </div>
                        </div>
                        <span className={`flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider sm:self-auto ${
                          cust.status === 'REDEEMED' ? 'border-[#334155] bg-[#1E293B] text-[#94A3B8]' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        }`}>
                          <span className={`size-1.5 rounded-full ${cust.status === 'REDEEMED' ? 'bg-[#94A3B8]' : 'bg-amber-400'}`} />
                          {cust.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#94A3B8] text-center py-6">No matching customers found.</p>
                  )}
                </div>
              </div>
            </section>
          )}

        </main>

        {/* LIVE CAMERA QR SCANNER MODAL */}
        {isScanning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-5" role="dialog" aria-modal="true">
            <div className="w-full max-w-sm rounded-2xl border border-[#334155] bg-[#1E293B] p-6 text-center shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm text-[#F8FAFC]">Live QR Scanner</h2>
                <button
                  onClick={async () => {
                    await stopScannerInstance()
                    setIsScanning(false)
                  }}
                  className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#0F172A] hover:text-[#F8FAFC] cursor-pointer"
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div id="reader" className="w-full overflow-hidden rounded-xl border border-[#334155] bg-[#0F172A]"></div>

              {scannedClaimData ? (
                <div className="p-3 bg-[#0F172A] rounded-xl border border-emerald-500/30 text-xs space-y-2 text-left">
                  <div className="flex justify-between text-[11px] text-emerald-400 font-bold">
                    <span><CheckCircle2 className="inline size-3.5 mr-1" /> QR Verified</span>
                    <span>{scannedClaimData.visit_count} / {targetVisits} Visits</span>
                  </div>
                  <p className="text-[#94A3B8]">Phone: <span className="font-mono text-[#F8FAFC]">{scannedClaimData.customer_phone}</span></p>
                  <p className="text-[#94A3B8]">Reward Balance: <span className="font-bold text-[#EA580C]">Rs. {scannedClaimData.claimable_amount}</span></p>

                  {Number(scannedClaimData.claimable_amount) > 0 ? (
                    <button
                      onClick={handleRedeemScannedReward}
                      disabled={actionLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs mt-2 transition cursor-pointer shadow-lg"
                    >
                      {actionLoading ? 'Processing...' : '🎁 Redeem Reward & Clear Cashback'}
                    </button>
                  ) : (
                    <p className="text-[#94A3B8] text-[11px] italic">Reward balance is 0 for this customer.</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#94A3B8]">Point your camera at the customer's Retcash QR code.</p>
              )}
            </div>
          </div>
        )}

      </div>
    )
  }

  // NON-LOGGED IN STATE (Store Mobile Login Entry View)
  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans selection:bg-[#EA580C]">
      <div className="w-full max-w-sm bg-[#1E293B] border border-[#334155] rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EA580C] text-white mx-auto shadow-[0_0_24px_rgba(234,88,12,0.4)]">
            <WalletCards className="size-6" />
          </div>
          <h1 className="text-2xl font-black text-[#EA580C] tracking-wider uppercase">RETCASH</h1>
          <p className="text-xs text-[#94A3B8]">Enter your store mobile number to continue</p>
        </div>

        <form onSubmit={handleCheckUser} className="space-y-4">
          <div>
            <label className="text-[10px] text-[#94A3B8] font-semibold block uppercase mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567"
              className="w-full bg-[#0F172A] border border-[#334155] focus:border-[#EA580C] rounded-xl px-3 py-3 text-sm text-[#F8FAFC] outline-none font-mono transition"
              required
            />
          </div>

          {error && <p className="text-[11px] text-red-400 font-medium text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#EA580C] hover:bg-[#d64e05] text-white font-bold py-3 rounded-xl text-sm transition shadow-lg active:scale-95 flex items-center justify-center cursor-pointer"
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'CONTINUE →'}
          </button>
        </form>
      </div>
    </div>
  )
}