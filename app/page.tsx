'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function GlobalEntryPoint() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '')

    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Please enter a valid mobile number')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Check if store/merchant exists with this phone number
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, phone_number')
        .eq('phone_number', cleanPhone)
        .maybeSingle()

      if (storeData) {
        // Registered Merchant -> Redirect to Merchant Login
        router.push(`/merchant/login?phone=${cleanPhone}`)
        return
      }

      // New Merchant or Customer -> Redirect to Register
      router.push(`/merchant/register?phone=${cleanPhone}`)

    } catch (err: any) {
      console.error('Error verifying user:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-[#FF6B00]">
      <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6">

        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-[#FF6B00] tracking-wider uppercase">
            RETCASH
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            Enter your mobile number to continue
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleCheckUser} className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider mb-1.5">
              Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567"
              className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition duration-200 font-mono"
              required
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
              <p className="text-xs text-red-400 font-medium text-center">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-3.5 rounded-xl text-sm transition duration-200 shadow-lg shadow-[#FF6B00]/20 active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              'CONTINUE →'
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="pt-2 text-center border-t border-gray-800/60">
          <p className="text-[11px] text-gray-500">
            Secure Customer & Merchant Loyalty Portal
          </p>
        </div>

      </div>
    </div>
  )
}