'use client'

import React, { useState, useEffect } from 'react'
import { Smartphone, Share, PlusSquare, X } from 'lucide-react'

export default function IosInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const isIos =
      /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

    const isInStandaloneMode =
      Boolean((window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches

    if (isIos && !isInStandaloneMode) {
      const dismissed = localStorage.getItem('ios_prompt_dismissed')
      if (!dismissed) {
        setShowBanner(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('ios_prompt_dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-[398px] mx-auto z-50 bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 text-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#00875A] flex-shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-extrabold text-[#0F172A] text-xs">Install App on iPhone</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Tap{' '}
            <span className="inline-flex items-center gap-0.5 font-bold text-slate-800">
              <Share className="w-3 h-3 text-blue-600" /> Share
            </span>{' '}
            below and select{' '}
            <span className="inline-flex items-center gap-0.5 font-bold text-slate-800">
              <PlusSquare className="w-3 h-3 text-slate-700" /> Add to Home Screen
            </span>
            . (Also available anytime in your Profile).
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}