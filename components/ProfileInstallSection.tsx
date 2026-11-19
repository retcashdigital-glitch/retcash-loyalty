'use client'

import React, { useState, useEffect } from 'react'
import { Smartphone, Share, PlusSquare } from 'lucide-react'

export default function ProfileInstallSection() {
  const [isIos, setIsIos] = useState(false)
  const [isInStandalone, setIsInStandalone] = useState(false)

  useEffect(() => {
    const iosCheck = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    const standaloneCheck = 'standalone' in window && (window.navigator as any).standalone

    setIsIos(iosCheck)
    setIsInStandalone(standaloneCheck)
  }, [])

  // ஐபோன் இல்லாமலோ அல்லது ஏற்கனவே ஹோம் ஸ்கிரீனில் இன்ஸ்டால் செய்யப்பட்டிருந்தாலோ இது தெரியாது
  if (!isIos || isInStandalone) {
    return null
  }

  return (
    <div className="bg-white rounded-3xl p-5 space-y-3.5 shadow-xs border border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#00875A] flex-shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-extrabold text-[#0F172A] text-xs">Install Retcash App</h4>
          <p className="text-[11px] text-slate-500 font-medium">
            Add to your iPhone Home Screen for quick access
          </p>
        </div>
      </div>

      <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="bg-white font-extrabold w-6 h-6 rounded-lg flex items-center justify-center text-[#00875A] border border-slate-200 text-[11px] flex-shrink-0">
            1
          </span>
          <p className="flex items-center gap-1 flex-wrap text-[11px] font-medium">
            Tap the{' '}
            <span className="font-bold inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-800">
              <Share className="w-3 h-3 text-blue-600" /> Share
            </span>{' '}
            button in Safari below.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="bg-white font-extrabold w-6 h-6 rounded-lg flex items-center justify-center text-[#00875A] border border-slate-200 text-[11px] flex-shrink-0">
            2
          </span>
          <p className="flex items-center gap-1 flex-wrap text-[11px] font-medium">
            Select{' '}
            <span className="font-bold inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-800">
              <PlusSquare className="w-3 h-3 text-slate-700" /> Add to Home Screen
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  )
}