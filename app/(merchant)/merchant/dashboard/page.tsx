'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Zap, Upload, Users, CheckCircle2, X, Trash2 } from 'lucide-react'

import { useSubscriptionWatcher } from './hooks/useSubscriptionWatcher'
import SubscriptionWarningBanner from './components/SubscriptionWarningBanner'
import SubscriptionLockModal from './components/modals/SubscriptionLockModal'
import RedeemConfirmModal from './components/modals/RedeemConfirmModal'

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
  location_url?: string
  review_url?: string
  category?: string
  trial_ends_at?: string
  subscription_status?: string
  plan_type?: string
}

export interface CashbackClaim {
  id: string
  customer_phone: string
  claimable_amount: number
  visit_count: number
  status: string
  customer_id?: string
  bill_amount?: number
  cashback_amount?: number
  store_id?: string
  updated_at?: string
}

interface Offer {
  id: string
  title: string
  description: string
  image_url: string
  expires_at: string
  created_at: string
}

const ADMIN_WHATSAPP_NUMBER = '94750957336'

export default function MerchantDashboardPage() {
  const [merchantSession, setMerchantSession] = useState<MerchantSession | null>(null)
  const [isVerifyingSession, setIsVerifyingSession] = useState(true)
  const [customerPhone, setCustomerPhone] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const { isTrialExpired, daysRemainingInTrial } = useSubscriptionWatcher(merchantSession)

  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY'>('YEARLY')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [transactionRef, setTransactionRef] = useState('')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [isPendingVerification, setIsPendingVerification] = useState(false)
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null)
  const [isCancellingPayment, setIsCancellingPayment] = useState(false)

  const [existingCustomerClaim, setExistingCustomerClaim] = useState<CashbackClaim | null>(null)
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false)
  const [lastAddedClaim, setLastAddedClaim] = useState<CashbackClaim | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('billing')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [focusQrInProfile, setFocusQrInProfile] = useState(false)

  const [targetVisitsInput, setTargetVisitsInput] = useState('6')
  const [settingLoading, setSettingLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)

  const [cashbackPercentInput, setCashbackPercentInput] = useState('5')
  const [cashbackSettingLoading, setCashbackSettingLoading] = useState(false)
  const [cashbackSuccessMsg, setCashbackSuccessMsg] = useState(false)

  const [logoUploading, setLogoUploading] = useState(false)

  const [scannedClaimData, setScannedClaimData] = useState<CashbackClaim | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<'REDEEM' | 'PHONE'>('REDEEM')
  const [showRedeemConfirmModal, setShowRedeemConfirmModal] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [offers, setOffers] = useState<Offer[]>([])
  const [offerTitle, setOfferTitle] = useState('')
  const [offerDesc, setOfferDesc] = useState('')
  const [offerExpiry, setOfferExpiry] = useState('')
  const [offerImage, setOfferImage] = useState<File | null>(null)
  const [offerUploading, setOfferUploading] = useState(false)
  const [offerStatusMsg, setOfferStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [offerToDelete, setOfferToDelete] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [customersList, setCustomersList] = useState<CashbackClaim[]>([])
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 4000)
  }

  useEffect(() => {
    async function verifyMerchantSession() {
      setIsVerifyingSession(true)
      const savedMerchant = localStorage.getItem('retcash_merchant')

      if (savedMerchant) {
        try {
          const parsed: MerchantSession = JSON.parse(savedMerchant)
          if (!parsed?.id) throw new Error('Invalid session payload')

          const res = await fetch('/api/merchant/portal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_session', storeId: parsed.id }),
          })

          if (!res.ok) {
            localStorage.removeItem('retcash_merchant')
            window.location.href = '/merchant/login'
            return
          }

          const { store: realStore, pendingPayment, offers: initialOffers, customers: initialCustomers } = await res.json()

          if (!realStore) {
            localStorage.removeItem('retcash_merchant')
            window.location.href = '/merchant/login'
          } else {
            const verifiedSession: MerchantSession = {
              id: realStore.id,
              store_name: realStore.store_name,
              phone_number: realStore.phone_number,
              default_cashback_percent: realStore.default_cashback_percent ?? 5,
              target_visits: realStore.target_visits ?? 6,
              logo_url: realStore.logo_url ?? '',
              location_url: realStore.location_url ?? '',
              review_url: realStore.review_url ?? '',
              category: realStore.category ?? 'others',
              trial_ends_at: realStore.trial_ends_at,
              subscription_status: realStore.subscription_status ?? 'trialing',
              plan_type: realStore.plan_type ?? 'monthly',
            }

            setMerchantSession(verifiedSession)
            localStorage.setItem('retcash_merchant', JSON.stringify(verifiedSession))

            if (pendingPayment) {
              setIsPendingVerification(true)
              if (pendingPayment.receipt_url) setUploadedReceiptUrl(pendingPayment.receipt_url)
            } else {
              setIsPendingVerification(false)
            }

            setTargetVisitsInput(String(Math.min(verifiedSession.target_visits || 6, 10)))
            setCashbackPercentInput(String(verifiedSession.default_cashback_percent ?? 5))
            setOffers(initialOffers || [])
            setCustomersList(initialCustomers || [])
          }
        } catch {
          localStorage.removeItem('retcash_merchant')
          window.location.href = '/merchant/login'
        }
      } else {
        window.location.href = '/merchant/login'
      }
      setIsVerifyingSession(false)
    }

    verifyMerchantSession()
    return () => { stopScannerInstance() }
  }, [])

  // Secure background sync (replaces direct client-side Supabase realtime channel)
  useEffect(() => {
    if (!merchantSession?.id) return
    const currentStoreId = merchantSession.id

    const syncDashboardState = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await fetch('/api/merchant/portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify_session', storeId: currentStoreId }),
        })

        if (res.status === 401) {
          localStorage.removeItem('retcash_merchant')
          window.location.href = '/merchant/login'
          return
        }

        if (!res.ok) return
        const { store: realStore, pendingPayment, offers: latestOffers, customers: latestCustomers } = await res.json()

        if (realStore) {
          const syncedSession: MerchantSession = {
            id: realStore.id,
            store_name: realStore.store_name,
            phone_number: realStore.phone_number,
            default_cashback_percent: realStore.default_cashback_percent ?? 5,
            target_visits: realStore.target_visits ?? 6,
            logo_url: realStore.logo_url ?? '',
            location_url: realStore.location_url ?? '',
            review_url: realStore.review_url ?? '',
            category: realStore.category ?? 'others',
            trial_ends_at: realStore.trial_ends_at,
            subscription_status: realStore.subscription_status ?? 'trialing',
            plan_type: realStore.plan_type ?? 'monthly',
          }
          setMerchantSession(syncedSession)
          localStorage.setItem('retcash_merchant', JSON.stringify(syncedSession))

          if (!isProfileOpen) {
            setTargetVisitsInput(String(Math.min(syncedSession.target_visits || 6, 10)))
            setCashbackPercentInput(String(syncedSession.default_cashback_percent ?? 5))
          }
        }

        if (pendingPayment) {
          setIsPendingVerification(true)
          if (pendingPayment.receipt_url) setUploadedReceiptUrl(pendingPayment.receipt_url)
        } else {
          setIsPendingVerification(false)
        }

        if (Array.isArray(latestOffers)) setOffers(latestOffers)
        if (Array.isArray(latestCustomers)) setCustomersList(latestCustomers)
      } catch {
        // Ignore transient background network errors
      }
    }

    const intervalId = setInterval(syncDashboardState, 15000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDashboardState()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [merchantSession?.id, isProfileOpen])

  const handleCancelPaymentRequest = async () => {
    if (!merchantSession?.id) return
    setIsCancellingPayment(true)
    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_payment', storeId: merchantSession.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel request')

      setIsPendingVerification(false)
      setUploadedReceiptUrl(null)
      setReceiptFile(null)
      setTransactionRef('')
      showToast('success', 'Previous request cancelled. You can upload a new receipt.')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel request')
    } finally {
      setIsCancellingPayment(false)
    }
  }

  const handlePaymentSubmission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiptFile || !merchantSession?.id) {
      showToast('error', 'Please attach your payment receipt photo.')
      return
    }

    setIsSubmittingPayment(true)
    try {
      const amount = selectedPlan === 'YEARLY' ? 7900 : 990
      const planTitle = selectedPlan === 'YEARLY' ? 'Annual Pass (Rs. 7,900/yr)' : 'Monthly Pass (Rs. 990/mo)'
      const planType = selectedPlan.toLowerCase()

      const formData = new FormData()
      formData.append('action', 'submit_payment')
      formData.append('storeId', merchantSession.id)
      formData.append('planType', planType)
      formData.append('amount', String(amount))
      formData.append('transactionRef', transactionRef || '')
      formData.append('file', receiptFile)

      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error submitting receipt')

      const receiptPublicUrl = data.receiptUrl
      setUploadedReceiptUrl(receiptPublicUrl)
      setIsPendingVerification(true)
      showToast('success', 'Receipt uploaded! Opening WhatsApp...')

      const storeName = merchantSession.store_name || 'Merchant Store'
      const storePhone = merchantSession.phone_number || 'N/A'

      const whatsappMessage = encodeURIComponent(
        `🚨 *NEW RENEWAL PAYMENT SUBMITTED*\n\n` +
        `🏪 *Store Name:* ${storeName}\n` +
        `🆔 *Store ID:* ${merchantSession.id}\n` +
        `📞 *Phone:* ${storePhone}\n` +
        `💳 *Selected Plan:* ${planTitle}\n` +
        `🔢 *Transaction Ref:* ${transactionRef || 'N/A'}\n\n` +
        `🧾 *Payment Receipt Image:*\n${receiptPublicUrl}\n\n` +
        `Please verify the payment receipt and activate my subscription.`
      )

      const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${whatsappMessage}`

      setTimeout(() => {
        const opened = window.open(whatsappUrl, '_blank')
        if (!opened) {
          window.location.href = whatsappUrl
        }
      }, 800)
    } catch (err: any) {
      showToast('error', err.message || 'Error submitting receipt')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

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
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_customer',
          storeId: merchantSession.id,
          phoneNum,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setExistingCustomerClaim(data.claim || null)
      }
    } catch (err) {
      console.error('Error fetching customer balance:', err)
    } finally {
      setIsCheckingCustomer(false)
    }
  }

  const fetchStoreOffers = async (storeId: string) => {
    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch_offers', storeId }),
      })
      if (res.ok) {
        const data = await res.json()
        setOffers(data.offers || [])
      }
    } catch (err) {
      console.error('Error fetching offers:', err)
    }
  }

  const fetchStoreCustomers = async (storeId: string) => {
    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch_customers', storeId }),
      })
      if (res.ok) {
        const data = await res.json()
        setCustomersList(data.customers || [])
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
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1)
    if (!cleaned.startsWith('94')) cleaned = '94' + cleaned
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

    if (isNaN(newTarget) || newTarget < 1) {
      showToast('error', 'Target visits must be at least 1.')
      return
    }

    newTarget = Math.min(newTarget, 10)
    setTargetVisitsInput(String(newTarget))

    if (!merchantSession?.id) return

    setSettingLoading(true)
    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_target_visits',
          storeId: merchantSession.id,
          targetVisits: newTarget,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')

      const updatedSession = { ...merchantSession, target_visits: newTarget }
      setMerchantSession(updatedSession)
      localStorage.setItem('retcash_merchant', JSON.stringify(updatedSession))

      setSuccessMsg(true)
      showToast('success', 'Target visits updated successfully!')
      setTimeout(() => setSuccessMsg(false), 3000)
    } catch (err: any) {
      showToast('error', 'Failed to update target visits: ' + err.message)
    } finally {
      setSettingLoading(false)
    }
  }

  const handleUpdateCashbackPercent = async (e: React.FormEvent) => {
    e.preventDefault()
    const newPercent = parseFloat(cashbackPercentInput)

    if (isNaN(newPercent) || newPercent <= 0 || newPercent > 100) {
      showToast('error', 'Please enter a valid percentage between 1 and 100.')
      return
    }

    if (!merchantSession?.id) return

    setCashbackSettingLoading(true)
    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_cashback_percent',
          storeId: merchantSession.id,
          cashbackPercent: newPercent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')

      const updatedSession = { ...merchantSession, default_cashback_percent: newPercent }
      setMerchantSession(updatedSession)
      localStorage.setItem('retcash_merchant', JSON.stringify(updatedSession))

      setCashbackSuccessMsg(true)
      showToast('success', 'Cashback percentage updated!')
      setTimeout(() => setCashbackSuccessMsg(false), 3000)
    } catch (err: any) {
      showToast('error', 'Failed to update cashback percentage: ' + err.message)
    } finally {
      setCashbackSettingLoading(false)
    }
  }

  const handleUpdateLogo = async (file: File) => {
    if (!file || !merchantSession?.id) return

    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('action', 'update_logo')
      formData.append('storeId', merchantSession.id)
      formData.append('file', file)

      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update logo')

      const updatedSession = { ...merchantSession, logo_url: data.logoUrl }
      setMerchantSession(updatedSession)
      localStorage.setItem('retcash_merchant', JSON.stringify(updatedSession))

      showToast('success', '🎉 Store logo updated successfully!')
    } catch (err: any) {
      showToast('error', 'Failed to update logo: ' + err.message)
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
      const formData = new FormData()
      formData.append('action', 'add_offer')
      formData.append('storeId', merchantSession.id)
      formData.append('title', offerTitle)
      formData.append('description', offerDesc)
      formData.append('expiresAt', offerExpiry)
      formData.append('file', offerImage)

      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add offer')

      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'OFFER',
          storeId: merchantSession.id,
          storeName: merchantSession.store_name,
          offerTitle: offerTitle,
        }),
      }).catch((pushErr) => console.error('Offer push notification error:', pushErr))

      setOfferStatusMsg({ type: 'success', text: '🎉 Offer posted successfully!' })
      showToast('success', 'Offer posted successfully!')
      setOfferTitle('')
      setOfferDesc('')
      setOfferExpiry('')
      setOfferImage(null)
      fetchStoreOffers(merchantSession.id)
    } catch (err: any) {
      setOfferStatusMsg({ type: 'error', text: 'Failed: ' + err.message })
    } finally {
      setOfferUploading(false)
    }
  }

  const confirmDeleteOffer = async () => {
    if (!offerToDelete || !merchantSession?.id) return

    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_offer',
          storeId: merchantSession.id,
          offerId: offerToDelete,
        }),
      })
      if (!res.ok) throw new Error('Delete failed')

      setOffers(offers.filter(o => o.id !== offerToDelete))
      setOfferToDelete(null)
      showToast('success', 'Offer deleted successfully.')
    } catch {
      showToast('error', 'Failed to delete offer.')
      setOfferToDelete(null)
    }
  }

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
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await stopScannerInstance()
            processScannedResult(decodedText)
          },
          () => {}
        )
      } catch {
        showToast('error', 'Failed to start camera or permission denied.')
        setIsScanning(false)
      }
    }, 100)
  }

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
          { fps: 10, qrbox: { width: 250, height: 250 } },
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
      } catch {
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

      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan_claim',
          storeId: merchantSession.id,
          claimId,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.claim) {
        showToast('error', 'Invalid QR Code or does not belong to this store.')
        setScannedClaimData(null)
        return
      }

      setScannedClaimData(data.claim)
    } catch {
      showToast('error', 'Error verifying QR code.')
    } finally {
      setActionLoading(false)
    }
  }

  const executeRedeemReward = async () => {
    if (!scannedClaimData || !merchantSession?.id || actionLoading) return

    setActionLoading(true)
    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem_reward',
          storeId: merchantSession.id,
          claimId: scannedClaimData.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process redemption.')

      setShowRedeemConfirmModal(false)
      setScannedClaimData(null)
      setIsScanning(false)
      setLastAddedClaim(null)
      showToast('success', '🎉 Reward successfully redeemed! New cycle ready.')

      fetchStoreCustomers(merchantSession.id)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to process redemption.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateCashback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerPhone || !billAmount || actionLoading) return

    if (isTrialExpired || (daysRemainingInTrial !== null && daysRemainingInTrial <= 0)) {
      showToast('error', 'Subscription expired. Please renew your account.')
      return
    }

    const initialBillNum = parseFloat(billAmount)
    if (isNaN(initialBillNum) || initialBillNum <= 0) {
      showToast('error', 'Please enter a valid bill amount.')
      return
    }

    if (!merchantSession?.id) {
      showToast('error', 'Merchant session not found. Please log in again.')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_cashback',
          storeId: merchantSession.id,
          customerPhone,
          billAmount: initialBillNum,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error processing cashback')

      const {
        upsertedData,
        cashbackAmount,
        totalClaimable,
        newVisitCount,
        targetVisits: resolvedTarget,
        cleanCustPhone,
      } = data

      setLastAddedClaim(upsertedData)
      setCustomerPhone('')
      setBillAmount('')
      setExistingCustomerClaim(null)
      fetchStoreCustomers(merchantSession.id)

      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CASHBACK',
          phone: cleanCustPhone,
          storeId: merchantSession.id,
          storeName: merchantSession?.store_name || 'RETCASH',
          amount: cashbackAmount > 0 ? cashbackAmount : totalClaimable,
          visits: newVisitCount,
          targetVisits: resolvedTarget,
        }),
      }).catch((pushErr) => console.error('Cashback push notification error:', pushErr))

      if (cashbackAmount > 0) {
        showToast(
          'success',
          `✅ Added Rs. ${cashbackAmount.toFixed(2)} cashback (${newVisitCount}/${resolvedTarget} visits) for ${cleanCustPhone}`
        )
      } else {
        showToast(
          'success',
          `🎉 Visit #${newVisitCount}/${resolvedTarget} reached! Rs. ${totalClaimable.toFixed(2)} unlocked for ${cleanCustPhone}`
        )
      }
    } catch (err: any) {
      showToast('error', 'Error processing cashback: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleVoidCashback = async (claim: CashbackClaim) => {
    if (!merchantSession?.id || !claim?.id || actionLoading) return

    setActionLoading(true)
    try {
      const res = await fetch('/api/merchant/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'void_cashback',
          storeId: merchantSession.id,
          claimId: claim.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not undo transaction.')

      if (lastAddedClaim?.id === claim.id) {
        setLastAddedClaim(null)
      }

      await fetchStoreCustomers(merchantSession.id)
      showToast('success', `↩️ Voided Rs. ${Number(data.voidCashbackAmt).toFixed(2)} cashback for ${data.customerPhone}`)
    } catch (err: any) {
      showToast('error', err.message || 'Could not undo transaction.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMerchantResetPin = async (phone: string) => {
    if (!phone || actionLoading) return

    setActionLoading(true)
    try {
      const res = await fetch('/api/customer/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merchant-reset-pin',
          phone,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset customer PIN.')
      }

      showToast('success', `🔑 PIN cleared for ${phone}. Customer can set a new 4-digit PIN on next login.`)
    } catch (err: any) {
      showToast('error', err.message || 'Could not reset PIN.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/merchant/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
    } catch {
      // Proceed even if offline
    }
    localStorage.removeItem('retcash_merchant')
    setMerchantSession(null)
    window.location.href = '/merchant/login'
  }

  const tabs: { id: Tab; label: string; icon: typeof Zap }[] = [
    { id: 'billing', label: 'Quick Billing & Scanner', icon: Zap },
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

  const isFullyExpired = isTrialExpired || (daysRemainingInTrial !== null && daysRemainingInTrial <= 0)

  if (isFullyExpired) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <SubscriptionLockModal
          isTrialExpired={true}
          isPendingVerification={isPendingVerification}
          merchantSession={merchantSession}
          adminPhone={ADMIN_WHATSAPP_NUMBER}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          receiptFile={receiptFile}
          setReceiptFile={setReceiptFile}
          transactionRef={transactionRef}
          setTransactionRef={setTransactionRef}
          isSubmittingPayment={isSubmittingPayment}
          uploadedReceiptUrl={uploadedReceiptUrl}
          isCancellingPayment={isCancellingPayment}
          handlePaymentSubmission={handlePaymentSubmission}
          handleCancelPaymentRequest={handleCancelPaymentRequest}
          handleLogout={handleLogout}
        />
      </div>
    )
  }

  const targetVisits = Math.min(Math.max(merchantSession?.target_visits || 6, 1), 10)
  const filteredCustomers = customersList.filter(c => c.customer_phone.includes(customerSearchQuery))
  const totalClaimableSum = customersList.reduce((acc, curr) => acc + Number(curr.claimable_amount || 0), 0)
  const currentClaimable = existingCustomerClaim ? Number(existingCustomerClaim.claimable_amount || 0) : 0

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-[#00875A] selection:text-white relative">

      <RedeemConfirmModal
        showModal={showRedeemConfirmModal}
        scannedClaimData={scannedClaimData}
        actionLoading={actionLoading}
        onClose={() => setShowRedeemConfirmModal(false)}
        onConfirm={executeRedeemReward}
      />

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
              <button onClick={() => setOfferToDelete(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDeleteOffer} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isProfileOpen && (
        <StoreSettingsModal
          merchantSession={merchantSession}
          onClose={() => {
            setIsProfileOpen(false)
            setFocusQrInProfile(false)
          }}
          focusQrSection={focusQrInProfile}
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
        onOpenProfile={() => {
          setFocusQrInProfile(false)
          setIsProfileOpen(true)
        }}
        onOpenStoreQr={() => {
          setFocusQrInProfile(true)
          setIsProfileOpen(true)
        }}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
        <SubscriptionWarningBanner
          isTrialExpired={isTrialExpired}
          daysRemainingInTrial={daysRemainingInTrial}
          storeName={merchantSession.store_name}
          adminPhone={ADMIN_WHATSAPP_NUMBER}
        />

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
            onOpenProfile={() => {
              setFocusQrInProfile(false)
              setIsProfileOpen(true)
            }}
            merchantStoreId={merchantSession?.id}
            lastAddedClaim={lastAddedClaim}
            targetVisits={targetVisits}
            onVoidLastClaim={handleVoidCashback}
            onDismissLastClaim={() => setLastAddedClaim(null)}
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
            onVoidCashback={handleVoidCashback}
            onResetCustomerPin={handleMerchantResetPin}
            actionLoading={actionLoading}
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
              <p className="text-xs text-slate-500">Point your camera at the customer&apos;s QR code to read their phone number.</p>
            ) : scannedClaimData ? (
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs space-y-3 text-left">
                <div className="flex justify-between text-[11px] text-[#00875A] font-extrabold">
                  <span><CheckCircle2 className="inline size-3.5 mr-1" /> QR Verified</span>
                  <span>{scannedClaimData.visit_count} / {targetVisits} Visits</span>
                </div>

                <div className="bg-[#FFFFFF] rounded-xl p-3 border border-slate-200 space-y-1.5 shadow-xs">
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
                    className="w-full bg-[#00875A] hover:bg-[#00704a] text-white font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-[#00875A]/20 flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
                  >
                    🎁 Redeem Reward & Clear Cashback
                  </button>
                ) : (
                  <p className="text-slate-400 text-[11px] italic text-center">Reward balance is 0 for this customer.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Point your camera at the customer&apos;s Retcash QR code.</p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}