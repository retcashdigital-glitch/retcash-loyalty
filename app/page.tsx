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
      setError('தயவுசெய்து சரியான மொபைல் எண்ணை உள்ளிடவும்')
      return
    }

    try {
      setLoading(true)
      setError('')

      // டேட்டாபேஸில் இந்த கடைக்காரரின் போன் நம்பர் உள்ளதா எனச் சோதித்தல்
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, phone_number')
        .eq('phone_number', cleanPhone)
        .maybeSingle()

      if (storeData) {
        // கணக்கு உள்ள கடைக்காரர் -> லாகின் பக்கத்திற்கு அனுப்பு
        router.push(`/merchant/login?phone=${cleanPhone}`)
        return
      }

      // புதிய கடைக்காரர் -> ரெஜிஸ்டர் பக்கத்திற்கு அனுப்பு
      router.push(`/merchant/register?phone=${cleanPhone}`)

    } catch (err: any) {
      console.error(err)
      setError('ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-[#FF6B00]">
      <div className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-[#FF6B00] tracking-wider">RETCASH</h1>
          <p className="text-xs text-gray-400">உங்களது மொபைல் எண்ணை உள்ளிட்டுத் தொடரவும்</p>
        </div>

        <form onSubmit={handleCheckUser} className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-400 font-semibold block uppercase mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0771234567"
              className="w-full bg-[#0B0E14] border border-gray-800 focus:border-[#FF6B00] rounded-xl px-3 py-3 text-sm text-white outline-none transition font-mono"
              required
            />
          </div>

          {error && <p className="text-[11px] text-red-500 font-medium text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-3 rounded-xl text-sm transition shadow-lg active:scale-95 flex items-center justify-center cursor-pointer"
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : 'CONTINUE →'}
          </button>
        </form>
      </div>
    </div>
  )
}