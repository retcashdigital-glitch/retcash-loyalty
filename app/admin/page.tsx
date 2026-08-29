'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
    const router = useRouter()
    const [merchant, setMerchant] = useState<any>(null)
    const [phone, setPhone] = useState('')
    const [billAmount, setBillAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const [recentCustomers, setRecentCustomers] = useState<any[]>([])
    const [filteredPhones, setFilteredPhones] = useState<string[]>([])
    const [previewData, setPreviewData] = useState<{ visitCount: number; cashback: number; totalBalance: number; isVisitIncremented: boolean } | null>(null)

    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [selectedLimitType, setSelectedLimitType] = useState('daily_1')
    const [savingSettings, setSavingSettings] = useState(false)

    const [storeStats, setStoreStats] = useState({ totalCustomers: 0, totalRevenue: 0, totalCashbackGiven: 0 })

    useEffect(() => {
        const storedMerchant = localStorage.getItem('retcash_merchant')
        if (!storedMerchant) {
            router.push('/merchant/login')
        } else {
            const parsedMerchant = JSON.parse(storedMerchant)
            setMerchant(parsedMerchant)
            setSelectedLimitType(parsedMerchant.visit_limit_type || 'daily_1')
            fetchRecentCustomers(parsedMerchant.id)
        }
    }, [router])

    const fetchRecentCustomers = async (storeId: string) => {
        try {
            const { data, error } = await supabase
                .from('cashback_claims')
                .select('customer_phone, visit_count, claimable_amount, status, bill_amount, cashback_amount, updated_at, created_at')
                .eq('store_id', storeId)

            if (!error && data) {
                setRecentCustomers(data)
                const totalCust = data.length
                let totalRev = 0
                let totalCB = 0

                data.forEach(item => {
                    totalRev += Number(item.bill_amount || 0)
                    totalCB += Number(item.cashback_amount || 0)
                })

                setStoreStats({
                    totalCustomers: totalCust,
                    totalRevenue: totalRev,
                    totalCashbackGiven: totalCB
                })
            }
        } catch (err) {
            console.error('Error fetching customers:', err)
        }
    }

    const handlePhoneChange = (val: string) => {
        setPhone(val)
        const cleanVal = val.replace(/[^0-9]/g, '')

        if (cleanVal.length > 0) {
            const matches = Array.from(
                new Set(
                    recentCustomers
                        .map(c => c.customer_phone)
                        .filter(p => {
                            const dbNum = p.replace(/[^0-9]/g, '')
                            const dbWithoutCountry = dbNum.startsWith('94') ? dbNum.slice(2) : dbNum
                            const dbWithZero = '0' + dbWithoutCountry

                            return (
                                dbNum.includes(cleanVal) ||
                                dbWithoutCountry.includes(cleanVal) ||
                                dbWithZero.includes(cleanVal)
                            )
                        })
                )
            ).slice(0, 5)

            setFilteredPhones(matches)
        } else {
            setFilteredPhones([])
        }

        calculateLivePreview(val, billAmount)
    }

    const handleBillChange = (val: string) => {
        setBillAmount(val)
        calculateLivePreview(phone, val)
    }

    // Dynamic Cooldown & Daily Limit Helper
    const checkVisitEligibility = (existingRecord: any) => {
        if (!existingRecord) return true

        const limitType = merchant.visit_limit_type || 'daily_1'
        const lastClaimTime = new Date(existingRecord.updated_at || existingRecord.created_at).getTime()
        const currentTime = new Date().getTime()

        if (limitType === 'unlimited') {
            return true // எப்போதும் Visit Count அதிகரிக்கும்
        } else if (limitType === 'daily_1') {
            const lastClaimDate = new Date(lastClaimTime).toDateString()
            const currentDate = new Date(currentTime).toDateString()
            if (lastClaimDate === currentDate) {
                return false
            }
        } else if (limitType === 'cooldown_2h') {
            const diffInHours = (currentTime - lastClaimTime) / (1000 * 60 * 60)
            if (diffInHours < 2) {
                return false
            }
        } else if (limitType === 'cooldown_12h') {
            const diffInHours = (currentTime - lastClaimTime) / (1000 * 60 * 60)
            if (diffInHours < 12) {
                return false
            }
        }

        return true
    }

    const calculateLivePreview = (currentPhone: string, currentBill: string) => {
        const bill = Number(currentBill)
        if (!merchant || !currentPhone || isNaN(bill) || bill <= 0) {
            setPreviewData(null)
            return
        }

        let cleanPhone = currentPhone.replace(/[^0-9]/g, '')
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '94' + cleanPhone.slice(1)
        } else if (!cleanPhone.startsWith('94') && cleanPhone.length === 9) {
            cleanPhone = '94' + cleanPhone
        }

        const cashbackRate = (merchant.default_cashback_percent || 10) / 100
        const currentCashback = Number((bill * cashbackRate).toFixed(2))

        const existing = recentCustomers.find(c => {
            const dbNum = (c.customer_phone || '').replace(/[^0-9]/g, '')
            return dbNum === cleanPhone || dbNum.endsWith(cleanPhone)
        })

        let nextVisit = 1
        let nextBalance = currentCashback
        let isVisitIncremented = true

        if (existing) {
            const oldVisits = Number(existing.visit_count || 0)
            const oldBalance = Number(existing.claimable_amount || 0)

            const isEligible = checkVisitEligibility(existing)

            if (existing.status === 'COMPLETED' || oldVisits >= 6) {
                nextVisit = 1
                nextBalance = currentCashback
                isVisitIncremented = true
            } else {
                if (isEligible) {
                    nextVisit = oldVisits + 1
                    isVisitIncremented = true
                } else {
                    nextVisit = oldVisits
                    isVisitIncremented = false
                }
                nextBalance = oldBalance + currentCashback
            }
        }

        setPreviewData({
            visitCount: nextVisit,
            cashback: currentCashback,
            totalBalance: nextBalance,
            isVisitIncremented
        })
    }

    const handleSaveSettings = async () => {
        if (!merchant || !merchant.id) return
        setSavingSettings(true)

        try {
            const { error } = await supabase
                .from('stores')
                .update({ visit_limit_type: selectedLimitType })
                .eq('id', merchant.id)

            if (error) throw error

            const updatedMerchant = { ...merchant, visit_limit_type: selectedLimitType }
            localStorage.setItem('retcash_merchant', JSON.stringify(updatedMerchant))
            setMerchant(updatedMerchant)

            setMessage('Store Rules Updated Successfully!')
            setShowSettingsModal(false)
        } catch (err: any) {
            console.error(err)
            setMessage(`Settings Error: ${err.message || 'Failed to update rules'}`)
        } finally {
            setSavingSettings(false)
        }
    }

    const handleCreateBill = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        if (!merchant || !merchant.id) {
            setMessage('Error: Merchant login details not found!')
            setLoading(false)
            return
        }

        const bill = Number(billAmount)
        const minBill = Number(merchant.min_bill_amount || 0)

        if (bill < minBill) {
            setMessage(`Warning: Minimum bill amount for cashback is Rs.${minBill}`)
            setLoading(false)
            return
        }

        try {
            const cashbackRate = (merchant.default_cashback_percent || 10) / 100
            const currentCashback = Number((bill * cashbackRate).toFixed(2))

            let cleanPhone = phone.replace(/[^0-9]/g, '')
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '94' + cleanPhone.slice(1)
            } else if (!cleanPhone.startsWith('94') && cleanPhone.length === 9) {
                cleanPhone = '94' + cleanPhone
            }

            const { data: existingClaims } = await supabase
                .from('cashback_claims')
                .select('*')
                .eq('customer_phone', cleanPhone)
                .eq('store_id', merchant.id)

            let finalBalance = currentCashback
            let finalVisitCount = 1
            let claimId = ''
            let isVisitAdded = true

            if (existingClaims && existingClaims.length > 0) {
                const existingClaim = existingClaims[0]
                const oldVisits = Number(existingClaim.visit_count || 0)
                const oldBalance = Number(existingClaim.claimable_amount || 0)

                const isEligible = checkVisitEligibility(existingClaim)

                if (existingClaim.status === 'COMPLETED' || oldVisits >= 6) {
                    finalVisitCount = 1
                    finalBalance = currentCashback
                    isVisitAdded = true
                } else {
                    if (isEligible) {
                        finalVisitCount = oldVisits + 1
                        isVisitAdded = true
                    } else {
                        finalVisitCount = oldVisits
                        isVisitAdded = false
                    }
                    finalBalance = oldBalance + currentCashback
                }

                const { data: updated, error: updateErr } = await supabase
                    .from('cashback_claims')
                    .update({
                        bill_amount: bill,
                        cashback_amount: currentCashback,
                        claimable_amount: finalBalance,
                        visit_count: finalVisitCount,
                        status: 'PENDING',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingClaim.id)
                    .select()
                    .single()

                if (updateErr) throw updateErr
                claimId = updated.id
            } else {
                finalVisitCount = 1
                finalBalance = currentCashback
                isVisitAdded = true

                const { data: inserted, error: insertErr } = await supabase
                    .from('cashback_claims')
                    .insert([{
                        customer_phone: cleanPhone,
                        store_id: merchant.id,
                        bill_amount: bill,
                        cashback_amount: currentCashback,
                        claimable_amount: finalBalance,
                        visit_count: 1,
                        status: 'PENDING'
                    }])
                    .select()
                    .single()

                if (insertErr) throw insertErr
                claimId = inserted.id
            }

            await supabase
                .from('customer_store_balances')
                .upsert([
                    {
                        customer_phone: cleanPhone,
                        store_id: merchant.id,
                        balance_amount: finalBalance
                    }
                ], { onConflict: 'customer_phone,store_id' })

            await supabase
                .from('store_transactions')
                .insert([
                    {
                        customer_phone: cleanPhone,
                        store_id: merchant.id,
                        bill_amount: bill,
                        cashback_amount: currentCashback
                    }
                ])

            const claimUrl = `${window.location.origin}/card/${claimId}`
            const whatsappText = `🎉 *${merchant.store_name}* Rewards!\n\nYour visit has been recorded successfully. 📍\n\n*Visit Count:* ${finalVisitCount} / 6\n\n${finalVisitCount >= 6
                ? "🔥 *Congratulations! Your 6th visit reward is ready to redeem at the counter!*"
                : "✨ Keep visiting to unlock your exclusive cashback rewards."
                }\n\n👉 *Tap below to view your digital card, live balance & cashback details:*\n${claimUrl}`

            const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappText)}`
            window.open(waUrl, '_blank')

            const statusNote = isVisitAdded ? '' : ' (Note: Visit limit reached for today/cooldown. Cashback added, Visit count unchanged.)'
            setMessage(`Successfully Recorded! (Visit: ${finalVisitCount}/6 | Balance: Rs.${finalBalance.toFixed(2)})${statusNote}`)

            setPhone('')
            setBillAmount('')
            setFilteredPhones([])
            setPreviewData(null)
            fetchRecentCustomers(merchant.id)
        } catch (err: any) {
            console.error(err)
            setMessage(`Error: ${err.message || 'Failed to save transaction'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('retcash_merchant')
        router.push('/merchant/login')
    }

    if (!merchant) {
        return (
            <div className="min-h-screen bg-[#141619] text-white flex items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#141619] text-gray-200 flex flex-col items-center justify-center p-6 font-sans relative">
            <div className="bg-[#1c1f24] border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#FF6B00]"></div>

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <span className="text-[10px] text-[#FF6B00] uppercase font-bold tracking-wider">LOGGED IN AS</span>
                        <h1 className="text-xl font-bold tracking-wide text-white">{merchant.store_name}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="text-[11px] text-gray-300 hover:text-white bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                            ⚙️ Rules
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-[11px] text-gray-400 hover:text-red-400 border border-gray-800 px-3 py-1 rounded-lg transition cursor-pointer"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/scan')}
                        className="py-3 px-2 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <span className="text-sm">📷</span>
                        <span>Scan QR</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowAnalyticsModal(true)}
                        className="py-3 px-2 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <span className="text-sm">📊</span>
                        <span>View Analytics</span>
                    </button>
                </div>

                <div className="border-t border-gray-800 my-5"></div>

                <form onSubmit={handleCreateBill} className="space-y-5">
                    <div className="relative">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Customer Phone Number</label>
                        <input
                            type="text"
                            placeholder="Type 2-3 digits (e.g. 76 or 076)..."
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            className="w-full p-3.5 bg-[#141619] border border-gray-800 rounded-xl focus:border-[#FF6B00] text-white outline-none transition duration-200"
                            required
                        />

                        {filteredPhones.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-[#161B26] border border-gray-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
                                {filteredPhones.map((p, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setPhone(p)
                                            setFilteredPhones([])
                                            calculateLivePreview(p, billAmount)
                                        }}
                                        className="p-3 text-xs text-gray-200 hover:bg-[#FF6B00]/20 hover:text-[#FF6B00] cursor-pointer border-b border-gray-800 last:border-none transition font-mono flex justify-between items-center"
                                    >
                                        <span>+{p}</span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Select</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Bill Amount (Rs.)</label>
                        <input
                            type="number"
                            placeholder="1000"
                            value={billAmount}
                            onChange={(e) => handleBillChange(e.target.value)}
                            className="w-full p-3.5 bg-[#141619] border border-gray-800 rounded-xl focus:border-[#FF6B00] text-white outline-none transition duration-200"
                            required
                        />
                    </div>

                    {previewData && (
                        <div className="p-3.5 bg-[#161B26] border border-[#FF6B00]/30 rounded-xl space-y-1.5 text-xs">
                            <div className="text-[10px] text-[#FF6B00] font-bold uppercase tracking-wider mb-1">Live Preview / Summary:</div>
                            <div className="flex justify-between text-gray-300">
                                <span>Current Visit Count:</span>
                                <span className="font-bold text-white">
                                    {previewData.visitCount} / 6
                                    {!previewData.isVisitIncremented && (
                                        <span className="ml-2 text-[10px] text-amber-400 font-normal">(Limit Reached)</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>Cashback Earned:</span>
                                <span className="font-bold text-emerald-400">Rs. {previewData.cashback.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-300 border-t border-gray-800 pt-1 mt-1">
                                <span>Total Store Balance:</span>
                                <span className="font-bold text-[#FF6B00]">Rs. {previewData.totalBalance.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#FF6B00] hover:bg-[#e05e00] transition disabled:opacity-50 mt-2 cursor-pointer"
                    >
                        {loading ? 'Processing...' : 'Submit & Send WhatsApp'}
                    </button>
                </form>

                {message && (
                    <p className="mt-4 text-center text-xs font-medium text-[#FF6B00]">{message}</p>
                )}
            </div>

            {/* STORE RULES / SETTINGS MODAL */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1c1f24] border border-gray-800 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#141619]">
                            <div>
                                <h2 className="text-base font-bold text-white">Store Visit Rules</h2>
                                <p className="text-[11px] text-gray-400">Configure Cooldown & Daily Limits</p>
                            </div>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Visit Count Policy</label>
                                <select
                                    value={selectedLimitType}
                                    onChange={(e) => setSelectedLimitType(e.target.value)}
                                    className="w-full p-3 bg-[#141619] border border-gray-800 rounded-xl text-white outline-none focus:border-[#FF6B00] text-xs"
                                >
                                    <option value="daily_1">1 Visit per Day (Default)</option>
                                    <option value="cooldown_2h">2 Hours Cooldown</option>
                                    <option value="cooldown_12h">12 Hours Cooldown</option>
                                    <option value="unlimited">Unlimited (Testing / Fast Track)</option>
                                </select>
                            </div>

                            <p className="text-[11px] text-gray-400 leading-relaxed bg-[#141619] p-3 rounded-xl border border-gray-800/80">
                                💡 <strong className="text-gray-300">Note:</strong> Cashback will always be calculated and added to the customer balance on every bill. This setting only controls whether the <strong>Visit Count (1-6)</strong> should increase immediately or wait.
                            </p>
                        </div>

                        <div className="p-4 border-t border-gray-800 bg-[#141619] flex justify-end gap-2">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gray-800 hover:bg-gray-700 text-white transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={savingSettings}
                                className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#FF6B00] hover:bg-[#e05e00] text-white transition cursor-pointer"
                            >
                                {savingSettings ? 'Saving...' : 'Save Rules'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANALYTICS MODAL */}
            {showAnalyticsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1c1f24] border border-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#141619]">
                            <div>
                                <h2 className="text-base font-bold text-white">Store Analytics & Customers</h2>
                                <p className="text-[11px] text-gray-400">{merchant.store_name} Performance Summary</p>
                            </div>
                            <button
                                onClick={() => setShowAnalyticsModal(false)}
                                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-[#141619] border border-gray-800 p-3.5 rounded-xl text-center">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Customers</div>
                                    <div className="text-lg font-bold text-white">{storeStats.totalCustomers}</div>
                                </div>
                                <div className="bg-[#141619] border border-gray-800 p-3.5 rounded-xl text-center">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Total Revenue</div>
                                    <div className="text-sm font-bold text-emerald-400">Rs.{storeStats.totalRevenue.toLocaleString()}</div>
                                </div>
                                <div className="bg-[#141619] border border-gray-800 p-3.5 rounded-xl text-center">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cashback Given</div>
                                    <div className="text-sm font-bold text-[#FF6B00]">Rs.{storeStats.totalCashbackGiven.toLocaleString()}</div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Recent Customers Record</h3>
                                {recentCustomers.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center py-6 bg-[#141619] rounded-xl border border-gray-800/50">No customer records found yet.</p>
                                ) : (
                                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                                        {recentCustomers.map((cust, i) => (
                                            <div key={i} className="bg-[#141619] border border-gray-800/80 p-3.5 rounded-xl flex justify-between items-center text-xs">
                                                <div>
                                                    <div className="font-mono font-bold text-white">+{cust.customer_phone}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">Visits: <span className="text-[#FF6B00] font-bold">{cust.visit_count}/6</span> | Status: <span className="text-emerald-400">{cust.status}</span></div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-emerald-400">Rs. {Number(cust.bill_amount || 0).toLocaleString()}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">Balance: Rs. {Number(cust.claimable_amount || 0).toFixed(2)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-800 bg-[#141619] flex justify-end">
                            <button
                                onClick={() => setShowAnalyticsModal(false)}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gray-800 hover:bg-gray-700 text-white transition cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}