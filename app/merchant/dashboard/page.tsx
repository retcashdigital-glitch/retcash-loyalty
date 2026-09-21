'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { MessageCircle, Upload, Users, CheckCircle2, X, Trash2, Receipt } from 'lucide-react'

// Sub-components Import
import DashboardHeader from './components/DashboardHeader'
import NavigationTabs, { Tab } from './components/NavigationTabs'
import QuickBillingSection from './components/QuickBillingSection'
import StoreOffersSection from './components/StoreOffersSection'
import CustomersSection from './components/CustomersSection'
import StoreSettingsModal from './components/StoreSettingsModal'

interface MerchantSession {
  id: string
  store_name: string
  phone_number?: string
  default_cashback_percent?: number
  target_visits?: number
  logo_url?: string
}

interface CashbackClaim {
  id: string
  customer_phone: string
  claimable_amount: number
  visit_count: number
  status: string
  customer_id?: string
  bill_amount?: number
  cashback_amount?: number
  store_id?: string
}

interface Offer {
  id: string
  title: string
  description: string
  image_url: string
  expires_at: string
  created_at: string
}

export default function MerchantDashboardPage() {
  // Merchant session & core action states
  const [merchantSession, setMerchantSession] = useState<MerchantSession | null>(null)
  const [isVerifyingSession, setIsVerifyingSession] = useState(true)
  const [customerPhone, setCustomerPhone] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // CUSTOMER BALANCE CHECK STATE (READ-ONLY)
  const [existingCustomerClaim, setExistingCustomerClaim] = useState<CashbackClaim | null>(null)
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false)

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<Tab>('billing')

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Target Visits settings state
  const [targetVisitsInput, setTargetVisitsInput] = useState('6')
  const [settingLoading, setSettingLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)

  // Cashback Percent settings state
  const [cashbackPercentInput, setCashbackPercentInput] = useState('5')
  const [cashbackSettingLoading, setCashbackSettingLoading] = useState(false)
  const [cashbackSuccessMsg, setCashbackSuccessMsg] = useState(false)

  // Logo Settings state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  // QR Scanner State
  const [scannedClaimData, setScannedClaimData] = useState<CashbackClaim | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<'REDEEM' | 'PHONE'>('REDEEM')
  const [showRedeemConfirmModal, setShowRedeemConfirmModal] = useState(false)
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

  // CUSTOM TOAST NOTIFICATION STATE
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Customers list state
  const [customersList, setCustomersList] = useState<CashbackClaim[]>([])
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text })
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // SESSION VERIFICATION & LOAD STORE DATA
  useEffect(() => {
    async function verifyMerchantSession() {
      setIsVerifyingSession(true)
      const savedMerchant = localStorage.getItem('retcash_merchant')
      
      if (savedMerchant) {
        try {
          const parsed: MerchantSession = JSON.parse(savedMerchant)

          if (!parsed?.id) {
            throw new Error('Invalid session payload')
          }
          
          const { data: realStore, error: storeErr } = await supabase
            .from('stores')
            .select('id, store_name, phone_number, default_cashback_percent, target_visits, logo_url')
            .eq('id', parsed.id)
            .maybeSingle()

          if (storeErr || !realStore) {
            console.warn('Unauthorized or invalid local session detected.')
            localStorage.removeItem('retcash_merchant')
            window.location.href = '/merchant/login'
          } else {
            const verifiedSession: MerchantSession = {
              id: realStore.id,
              store_name: realStore.store_name,
              phone_number: realStore.phone_number,
              default_cashback_percent: realStore.default_cashback_percent ?? 5,
              target_visits: realStore.target_visits ?? 6,
              logo_url: realStore.logo_url ?? ''
            }
            setMerchantSession(verifiedSession)
            localStorage.setItem('retcash_merchant', JSON.stringify(verifiedSession))
            setTargetVisitsInput(String(Math.min(verifiedSession.target_visits || 6, 10)))
            setCashbackPercentInput(String(verifiedSession.default_cashback_percent ?? 5))
            fetchStoreOffers(verifiedSession.id)
            fetchStoreCustomers(verifiedSession.id)
          }
        } catch (e) {
          console.error('Session Parsing Error', e)
          localStorage.removeItem('retcash_merchant')
          window.location.href = '/merchant/login'
        }
      } else {
        window.location.href = '/merchant/login'
      }
      setIsVerifyingSession(false)
    }

    verifyMerchantSession()

    return () => {
      stopScannerInstance()
    }
  }, [])

  // CHECK CUSTOMER CASHBACK ON PHONE CHANGE (READ-ONLY)
  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '')
    if (cleanPhone.length >= 8 && merchantSession?.id) {
      const formatted = formatPhoneNumber(customerPhone)
      checkCustomerExistingClaim(formatted)
    } else {
      setExistingCustomerClaim(null)
    }
  }, [customerPhone, merchantSession?.id])

  const checkCustomerExistingClaim = async (phoneNum: string) => {
    if (!merchantSession?.id) return
    setIsCheckingCustomer(true)
    try {
      const { data } = await supabase
        .from('cashback_claims')
        .select('*')
        .eq('store_id', merchantSession.id)
        .eq('customer_phone', phoneNum)
        .maybeSingle()

      setExistingCustomerClaim(data || null)
    } catch (err) {
      console.error('Error fetching customer balance:', err)
    } finally {
      setIsCheckingCustomer(false)
    }
  }

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
      showToast('error', 'Target visits must be at least 3.')
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
      showToast('success', 'Target visits updated successfully!')
      setTimeout(() => setSuccessMsg(false), 3000)
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : JSON.stringify(err)
      showToast('error', 'Failed to update target visits: ' + message)
    } finally {
      setSettingLoading(false)
    }
  }

  const handleUpdateCashbackPercent = async (e: React.FormEvent) => {
    e.preventDefault()
    let newPercent = parseFloat(cashbackPercentInput)

    if (isNaN(newPercent) || newPercent <= 0 || newPercent > 100) {
      showToast('error', 'Please enter a valid percentage between 1 and 100.')
      return
    }

    if (!merchantSession?.id) return

    setCashbackSettingLoading(true)
    try {
      const { error } = await supabase
        .from('stores')
        .update({ default_cashback_percent: newPercent })
        .eq('id', merchantSession.id)

      if (error) throw error

      const updatedSession = { ...merchantSession, default_cashback_percent: newPercent }
      setMerchantSession(updatedSession)
      localStorage.setItem('retcash_merchant', JSON.stringify(updatedSession))

      setCashbackSuccessMsg(true)
      showToast('success', 'Cashback percentage updated!')
      setTimeout(() => setCashbackSuccessMsg(false), 3000)
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : JSON.stringify(err)
      showToast('error', 'Failed to update cashback percentage: ' + message)
    } finally {
      setCashbackSettingLoading(false)
    }
  }

  const handleUpdateLogo = async (file: File) => {
    if (!file || !merchantSession?.id) return

    setLogoUploading(true)
    try {
      const fileExt = file.name.split('.').pop() || 'png'
      const filePath = `store_${merchantSession.id}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('store-logos')
        .getPublicUrl(filePath)

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: dbError } = await supabase
        .from('stores')
        .update({ logo_url: publicUrl })
        .eq('id', merchantSession.id)

      if (dbError) throw dbError

      const updatedSession = { ...merchantSession, logo_url: publicUrl }
      setMerchantSession(updatedSession)
      localStorage.setItem('retcash_merchant', JSON.stringify(updatedSession))

      showToast('success', '🎉 Store logo updated successfully!')
      setLogoFile(null)
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Logo upload failed'
      showToast('error', 'Failed to update logo: ' + message)
    } finally {
      setLogoUploading(false)
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
      showToast('success', 'Offer posted successfully!')
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
      showToast('success', 'Offer deleted successfully.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Failed to delete offer.')
      setOfferToDelete(null)
    }
  }

  // 1. Redeem QR Scanner
  const startScanner = async () => {
    setScanMode('REDEEM')
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
        showToast('error', 'Failed to start camera or permission denied.')
        setIsScanning(false)
      }
    }, 100)
  }

  // 2. Phone Input QR Scanner
  const startPhoneScanner = async () => {
    setScanMode('PHONE')
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
            setIsScanning(false)

            const digitsOnly = decodedText.replace(/\D/g, '')

            if (digitsOnly.length >= 9) {
              const last9 = digitsOnly.slice(-9)
              const formattedLocal = `0${last9}`
              setCustomerPhone(formattedLocal)
              showToast('success', `Customer phone detected: ${formattedLocal}`)
            } else {
              showToast('error', 'Could not extract valid phone number from QR.')
            }
          },
          () => {}
        )
      } catch (err) {
        console.error('Phone Camera start error:', err)
        showToast('error', 'Failed to start camera or permission denied.')
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
        showToast('error', 'Invalid QR Code or does not belong to this store.')
        setScannedClaimData(null)
        return
      }

      setScannedClaimData(data)
    } catch (err) {
      console.error(err)
      showToast('error', 'Error verifying QR code.')
    } finally {
      setActionLoading(false)
    }
  }

  // REDEMPTION EXECUTION VIA QR SCAN
  const executeRedeemReward = async () => {
    if (!scannedClaimData || actionLoading) return

    setActionLoading(true)
    try {
      const redeemedAmt = Number(scannedClaimData.claimable_amount || 0)
      const lastBillAmt = Number(scannedClaimData.bill_amount || 0)

      // நெட் செலுத்திய தொகையைக் கணக்கிடுதல் (பில் தொகை - தள்ளுபடி தொகை)
      const calculatedNetPaid = Math.max(0, Math.round((lastBillAmt - redeemedAmt) * 100) / 100)

      // 1. Direct Supabase Update on the active claim record
      const { error: updateErr } = await supabase
        .from('cashback_claims')
        .update({
          claimable_amount: 0,
          status: 'REDEEMED',
          updated_at: new Date().toISOString()
        })
        .eq('id', scannedClaimData.id)

      if (updateErr) {
        throw new Error('Redemption DB Update Failed: ' + updateErr.message)
      }

      // 2. Transaction Audit History Log Entry
      await supabase
        .from('cashback_history')
        .insert({
          claim_id: scannedClaimData.id,
          store_id: scannedClaimData.store_id || merchantSession?.id,
          customer_phone: scannedClaimData.customer_phone,
          visit_count: scannedClaimData.visit_count,
          bill_amount: lastBillAmt,
          cashback_percentage: 0,
          cashback_amount: redeemedAmt,
          net_paid_amount: calculatedNetPaid,
          transaction_type: 'REDEEMED',
          status: 'REDEEMED'
        })

      setShowRedeemConfirmModal(false)
      setScannedClaimData(null)
      setIsScanning(false)
      showToast('success', '🎉 Reward successfully redeemed! Balance cleared.')
      
      if (merchantSession?.id) {
        fetchStoreCustomers(merchantSession.id)
      }

    } catch (err: any) {
      console.error('Redeem Error:', err)
      showToast('error', err.message || 'Failed to process redemption.')
    } finally {
      setActionLoading(false)
    }
  }

  // CLEAN BILLING GENERATION & CASHBACK ADDITION
  const handleGenerateCashback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerPhone || !billAmount || actionLoading) return

    setActionLoading(true)
    try {
      const cashbackPercentage = merchantSession?.default_cashback_percent || 5
      const targetVisits = Math.min(merchantSession?.target_visits || 6, 10)

      const initialBillNum = parseFloat(billAmount)
      const cleanCustPhone = formatPhoneNumber(customerPhone)
      const storeId = merchantSession?.id

      if (!storeId) {
        showToast('error', 'Merchant session not found. Please log in again.')
        setActionLoading(false)
        return
      }

      // 1. Retrieve or Insert customer
      let customerUuid: string | null = existingCustomerClaim?.customer_id || null

      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, store_id')
        .eq('phone_number', cleanCustPhone)
        .maybeSingle()

      if (existingCust) {
        customerUuid = existingCust.id
        if (!existingCust.store_id) {
          await supabase
            .from('customers')
            .update({ store_id: storeId })
            .eq('id', existingCust.id)
        }
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ phone_number: cleanCustPhone, store_id: storeId })
          .select('id')
          .single()

        if (!custErr && newCust) {
          customerUuid = newCust.id
        }
      }

      const existingAmount = existingCustomerClaim ? Number(existingCustomerClaim.claimable_amount || 0) : 0
      const cashbackAmount = Math.round(((initialBillNum * cashbackPercentage) / 100) * 100) / 100

      let newVisitCount = 1
      let totalClaimable = cashbackAmount

      if (existingCustomerClaim) {
        const currentVisits = existingCustomerClaim.visit_count || 0
        newVisitCount = currentVisits >= targetVisits ? 1 : currentVisits + 1
        totalClaimable = Math.round((existingAmount + cashbackAmount) * 100) / 100
      }

      const claimStatus = newVisitCount >= targetVisits ? 'READY' : 'PENDING'

      // 2. UPSERT ACTIVE RECORD IN CASHBACK_CLAIMS
      const { data: upsertedData, error: upsertError } = await supabase
        .from('cashback_claims')
        .upsert({
          store_id: storeId,
          customer_id: customerUuid,
          customer_phone: cleanCustPhone,
          claimable_amount: totalClaimable,
          visit_count: newVisitCount,
          status: claimStatus,
          bill_amount: initialBillNum,
          cashback_amount: cashbackAmount,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'customer_phone, store_id'
        })
        .select('id')
        .single()

      if (upsertError) {
        console.error('Upsert Error:', upsertError)
        throw new Error('Cashback claim update failed: ' + upsertError.message)
      }

      const claimId = upsertedData?.id

      // 3. LOG TO CASHBACK_HISTORY
      try {
        const { error: historyError } = await supabase
          .from('cashback_history')
          .insert({
            claim_id: claimId,
            store_id: storeId,
            customer_phone: cleanCustPhone,
            visit_count: newVisitCount,
            bill_amount: initialBillNum,
            cashback_percentage: cashbackPercentage,
            cashback_amount: cashbackAmount,
            net_paid_amount: initialBillNum,
            transaction_type: 'BILL_ADDED',
            status: claimStatus
          })

        if (historyError) {
          console.error('History logging error detail:', historyError)
        }
      } catch (hErr: unknown) {
        console.error('History exception:', hErr)
      }

      const baseUrl = window.location.origin
      const cardLink = `${baseUrl}/card/${claimId}`
      const storeName = merchantSession?.store_name || 'RETCASH Partner'

      const message = `🎉 *Retcash Rewards - ${storeName}*\n\n` +
        `உங்களின் வருகை வெற்றிகரமாகப் பதிவு செய்யப்பட்டுள்ளது! 📍\n\n` +
        `🛍️ மொத்த பில் தொகை: *Rs. ${initialBillNum}*\n` +
        `💰 பெற்ற புதிய காஷ்பேக் (${cashbackPercentage}%): *Rs. ${cashbackAmount}*\n` +
        `⭐ வருகை எண்ணிக்கை (Visits): *${newVisitCount} / ${targetVisits}*\n\n` +
        `🎁 தற்போதைய மொத்த காஷ்பேக் இருப்பு (Balance): *Rs. ${totalClaimable}*\n\n` +
        `✨ தொடர்ந்து வருகை தந்து உங்களின் பிரத்யேக வெகுமதிகளைப் பெறுங்கள்!\n\n` +
        `👉 உங்களின் டிஜிட்டல் கார்டு, நேரலை இருப்பு (Live Balance) மற்றும் காஷ்பேக் விவரங்களைக் காண கீழே உள்ள லிங்கை அழுத்தவும்:\n${cardLink}`

      const whatsappUrl = `https://wa.me/${cleanCustPhone}?text=${encodeURIComponent(message)}`

      setCustomerPhone('')
      setBillAmount('')
      setExistingCustomerClaim(null)
      fetchStoreCustomers(storeId)

      const opened = window.open(whatsappUrl, '_blank')
      if (!opened) {
        window.location.href = whatsappUrl
      }

    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : JSON.stringify(err)
      showToast('error', 'Error processing cashback: ' + message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('retcash_merchant')
    setMerchantSession(null)
    window.location.href = '/merchant/login'
  }

  const tabs: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
    { id: 'billing', label: 'Quick Billing & Scanner', icon: MessageCircle },
    { id: 'offers', label: 'Store Offers', icon: Upload },
    { id: 'customers', label: 'Customers', icon: Users },
  ]

  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-emerald-100 border-t-[#00875A] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!merchantSession) return null

  const targetVisits = Math.min(merchantSession?.target_visits || 6, 10)
  const filteredCustomers = customersList.filter(c => c.customer_phone.includes(customerSearchQuery))
  const totalClaimableSum = customersList.reduce((acc, curr) => acc + Number(curr.claimable_amount || 0), 0)

  const currentClaimable = existingCustomerClaim ? Number(existingCustomerClaim.claimable_amount || 0) : 0

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-[#00875A] selection:text-white">
      
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[70] animate-in fade-in slide-in-from-top-3 duration-200">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold text-white ${
            toastMessage.type === 'success' ? 'bg-[#00875A]' : 'bg-red-600'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {offerToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold border border-red-100">
              <Trash2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Delete Offer</h3>
              <p className="text-xs text-slate-500">Are you sure you want to delete this offer permanently?</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOfferToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteOffer}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 NEW RECEIPT BREAKDOWN CONFIRMATION MODAL 🌟 */}
      {showRedeemConfirmModal && scannedClaimData && (
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

            {/* RECEIPT CARD FOR MERCHANT */}
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
                onClick={() => setShowRedeemConfirmModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRedeemReward}
                disabled={actionLoading}
                className="flex-1 bg-[#00875A] hover:bg-[#00704a] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50 pointer-events-auto"
              >
                {actionLoading ? 'Processing...' : 'Confirm & Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProfileOpen && (
        <StoreSettingsModal
          merchantSession={merchantSession}
          onClose={() => setIsProfileOpen(false)}
          cashbackPercentInput={cashbackPercentInput}
          setCashbackPercentInput={setCashbackPercentInput}
          cashbackSettingLoading={cashbackSettingLoading}
          cashbackSuccessMsg={cashbackSuccessMsg}
          handleUpdateCashbackPercent={handleUpdateCashbackPercent}
          targetVisitsInput={targetVisitsInput}
          handleTargetInputChange={handleTargetInputChange}
          settingLoading={settingLoading}
          successMsg={successMsg}
          handleUpdateTargetVisits={handleUpdateTargetVisits}
          logoUploading={logoUploading}
          handleUpdateLogo={handleUpdateLogo}
        />
      )}

      <DashboardHeader
        merchantSession={merchantSession}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
        
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#00875A]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-900 sm:text-4xl">Keep your customers coming back.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Reward every visit instantly and keep your regulars in the loop.</p>
          </div>
        </div>

        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={(t) => setActiveTab(t)}
        />

        {activeTab === 'billing' && (
          <QuickBillingSection
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            billAmount={billAmount}
            setBillAmount={setBillAmount}
            actionLoading={actionLoading}
            isCheckingCustomer={isCheckingCustomer}
            existingCustomerClaim={existingCustomerClaim}
            currentClaimable={currentClaimable}
            customersList={customersList}
            totalClaimableSum={totalClaimableSum}
            handleGenerateCashback={handleGenerateCashback}
            startScanner={startScanner}
            startPhoneScanner={startPhoneScanner}
            onOpenProfile={() => setIsProfileOpen(true)}
            merchantStoreId={merchantSession?.id}
          />
        )}

        {activeTab === 'offers' && (
          <StoreOffersSection
            offers={offers}
            offerTitle={offerTitle}
            setOfferTitle={setOfferTitle}
            offerDesc={offerDesc}
            setOfferDesc={setOfferDesc}
            offerExpiry={offerExpiry}
            setOfferExpiry={setOfferExpiry}
            offerImage={offerImage}
            setOfferImage={setOfferImage}
            offerUploading={offerUploading}
            offerStatusMsg={offerStatusMsg}
            handleAddOffer={handleAddOffer}
            setOfferToDelete={setOfferToDelete}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersSection
            filteredCustomers={filteredCustomers}
            customerSearchQuery={customerSearchQuery}
            setCustomerSearchQuery={setCustomerSearchQuery}
            targetVisits={targetVisits}
          />
        )}

      </main>

      {isScanning && !showRedeemConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-sm text-slate-900">
                {scanMode === 'PHONE' ? 'Scan Customer Phone QR' : 'Live QR Scanner'}
              </h2>
              <button
                onClick={async () => {
                  await stopScannerInstance()
                  setIsScanning(false)
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div id="reader" className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900"></div>

            {scanMode === 'PHONE' ? (
              <p className="text-xs text-slate-500">Point your camera at the customer's QR code to read their phone number.</p>
            ) : scannedClaimData ? (
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs space-y-3 text-left">
                <div className="flex justify-between text-[11px] text-[#00875A] font-extrabold">
                  <span><CheckCircle2 className="inline size-3.5 mr-1" /> QR Verified</span>
                  <span>{scannedClaimData.visit_count} / {targetVisits} Visits</span>
                </div>

                {/* 🌟 SCANNED RECEIPT PREVIEW CARD 🌟 */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-1.5 shadow-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Phone:</span>
                    <span className="font-mono text-slate-900 font-bold">{scannedClaimData.customer_phone}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Original Bill:</span>
                    <span className="font-mono font-semibold text-slate-900">Rs. {Number(scannedClaimData.bill_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Discount Balance:</span>
                    <span className="font-mono font-bold">- Rs. {Number(scannedClaimData.claimable_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 flex justify-between font-extrabold text-slate-900">
                    <span>Collect From Customer:</span>
                    <span className="text-[#00875A] font-mono font-black">
                      Rs. {Math.max(0, Number(scannedClaimData.bill_amount || 0) - Number(scannedClaimData.claimable_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {Number(scannedClaimData.claimable_amount) > 0 ? (
                  <button
                    onClick={() => setShowRedeemConfirmModal(true)}
                    disabled={actionLoading}
                    className="w-full bg-[#00875A] hover:bg-[#00704a] text-white font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-[#00875A]/20 flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98 pointer-events-auto"
                  >
                    🎁 Redeem Reward & Clear Cashback
                  </button>
                ) : (
                  <p className="text-slate-400 text-[11px] italic text-center">Reward balance is 0 for this customer.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Point your camera at the customer's Retcash QR code.</p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}