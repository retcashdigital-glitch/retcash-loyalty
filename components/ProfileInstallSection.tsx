'use client'

import React, { useState, useEffect } from 'react'
import { Smartphone, Share, PlusSquare, Download, MoreVertical } from 'lucide-react'

export default function ProfileInstallSection() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const [isInStandalone, setIsInStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    const iosCheck = /iphone|ipad|ipod/.test(ua)
    const androidCheck = /android/.test(ua)

    // ஏற்கனவே ஹோம் ஸ்கிரீனில் ஆப் இன்ஸ்டால் செய்யப்பட்டு திறக்கப்பட்டுள்ளதா எனச் சரிபார்த்தல்
    const standaloneCheck =
      ('standalone' in window && (window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches

    setIsInStandalone(standaloneCheck)

    if (iosCheck) {
      setPlatform('ios')
    } else if (androidCheck) {
      setPlatform('android')
    }

    // ஆண்ட்ராய்டு Chrome-ன் நேரடி 1-கிளிக் இன்ஸ்டால் நிகழ்வைப் பிடித்தல்
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInStandalone(true)
    }
  }

  // ஏற்கனவே இன்ஸ்டால் செய்யப்பட்டிருந்தாலோ அல்லது டெஸ்க்டாப் கம்ப்யூட்டராக இருந்தாலோ காட்ட வேண்டாம்
  if (isInStandalone || platform === 'other') {
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
            Add to your phone Home Screen for quick access
          </p>
        </div>
      </div>

      {/* 1. ஆண்ட்ராய்டு பயனர்களுக்கான பகுதி */}
      {platform === 'android' && (
        <>
          {deferredPrompt ? (
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="w-full bg-[#00875A] hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Install App Now (1-Tap)</span>
            </button>
          ) : (
            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="bg-white font-extrabold w-6 h-6 rounded-lg flex items-center justify-center text-[#00875A] border border-slate-200 text-[11px] flex-shrink-0">
                  1
                </span>
                <p className="flex items-center gap-1 flex-wrap text-[11px] font-medium">
                  Tap the{' '}
                  <span className="font-bold inline-flex items-center gap-0.5 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-800">
                    <MoreVertical className="w-3 h-3 text-slate-700" /> Menu
                  </span>{' '}
                  icon at the top right of Chrome.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="bg-white font-extrabold w-6 h-6 rounded-lg flex items-center justify-center text-[#00875A] border border-slate-200 text-[11px] flex-shrink-0">
                  2
                </span>
                <p className="flex items-center gap-1 flex-wrap text-[11px] font-medium">
                  Select{' '}
                  <span className="font-bold inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-800">
                    <PlusSquare className="w-3 h-3 text-[#00875A]" /> Add to Home screen
                  </span>{' '}
                  or <span className="font-bold text-slate-800">Install app</span>.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. ஐபோன் (iOS) பயனர்களுக்கான பகுதி */}
      {platform === 'ios' && (
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
      )}
    </div>
  )
}