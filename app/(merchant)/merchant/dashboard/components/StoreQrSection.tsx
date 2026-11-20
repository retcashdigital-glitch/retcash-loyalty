'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Download, Copy, Check, ExternalLink, Share2, X } from 'lucide-react'

interface StoreQrSectionProps {
  storeId: string
  storeName: string
  cashbackPercent?: number
  targetVisits?: number
}

export default function StoreQrSection({
  storeId,
  storeName,
  cashbackPercent = 5,
  targetVisits = 6,
}: StoreQrSectionProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [isGeneratingCard, setIsGeneratingCard] = useState(false)
  const [iosFallbackImageUrl, setIosFallbackImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const storeQrUrl = useMemo(() => {
    const base = origin || 'https://www.retcashapp.com'
    return `${base}/customer/login?store=${encodeURIComponent(storeId)}`
  }, [origin, storeId])

  // Render 100% scannable ISO-compliant QR with proper 4-module quiet zone
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !storeQrUrl) return

    QRCode.toCanvas(
      canvas,
      storeQrUrl,
      {
        width: 220,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      },
      (err) => {
        if (err) console.error('QR render error:', err)
      }
    )
  }, [storeQrUrl])

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(storeQrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Ignore clipboard fallback
    }
  }

  // Build high-res branded print standee canvas (900 x 1200)
  const buildBrandedStandeeCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const exportCanvas = document.createElement('canvas')
    const W = 900
    const H = 1200
    exportCanvas.width = W
    exportCanvas.height = H
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return null

    // Background
    ctx.fillStyle = '#F8FAFC'
    ctx.fillRect(0, 0, W, H)

    // Top RETCASH + Orange Accent Banner
    const grad = ctx.createLinearGradient(0, 0, W, 250)
    grad.addColorStop(0, '#00875A')
    grad.addColorStop(1, '#059669')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, 240)

    // Orange Brand Strip
    ctx.fillStyle = '#F97316'
    ctx.fillRect(0, 232, W, 14)

    // Master RETCASH Title
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 54px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('RETCASH', W / 2, 108)

    ctx.fillStyle = '#D1FAE5'
    ctx.font = '700 22px sans-serif'
    ctx.fillText('DIGITAL LOYALTY & CASHBACK REWARDS', W / 2, 155)

    // Store Name Card Box
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(70, 290, W - 140, 720, 36)
    ctx.fill()
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 3
    ctx.stroke()

    // Partner Store Badge
    ctx.fillStyle = '#FFF7ED'
    ctx.beginPath()
    ctx.roundRect(W / 2 - 170, 325, 340, 42, 21)
    ctx.fill()

    ctx.fillStyle = '#EA580C'
    ctx.font = '800 18px sans-serif'
    ctx.fillText('OFFICIAL PARTNER STORE', W / 2, 352)

    // Store Name
    ctx.fillStyle = '#0F172A'
    ctx.font = '900 44px sans-serif'
    const displayStore =
      storeName.length > 24 ? `${storeName.slice(0, 23)}…` : storeName
    ctx.fillText(displayStore, W / 2, 425)

    // QR Frame
    const qrBoxSize = 440
    const qrX = (W - qrBoxSize) / 2
    const qrY = 460

    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(qrX - 16, qrY - 16, qrBoxSize + 32, qrBoxSize + 32, 28)
    ctx.fill()
    ctx.strokeStyle = '#F97316'
    ctx.lineWidth = 5
    ctx.stroke()

    // Render crisp ISO QR onto offscreen canvas and draw onto standee
    const offscreenQr = document.createElement('canvas')
    await QRCode.toCanvas(offscreenQr, storeQrUrl, {
      width: qrBoxSize,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
    ctx.drawImage(offscreenQr, qrX, qrY, qrBoxSize, qrBoxSize)

    // Scan Call to Action
    ctx.fillStyle = '#00875A'
    ctx.font = '900 30px sans-serif'
    ctx.fillText('SCAN TO OPEN YOUR WALLET', W / 2, 965)

    // Bottom Offer Highlight Pill
    ctx.fillStyle = '#F97316'
    ctx.beginPath()
    ctx.roundRect(110, 1045, W - 220, 84, 42)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 26px sans-serif'
    ctx.fillText(
      `Earn ${cashbackPercent}% Cashback • Redeem on Visit #${targetVisits}`,
      W / 2,
      1096
    )

    return exportCanvas
  }

  // Universal Download / Save Handler (iOS Safari + Android + Desktop)
  const handleDownloadBrandedQr = async () => {
    if (isGeneratingCard) return
    setIsGeneratingCard(true)

    try {
      const exportCanvas = await buildBrandedStandeeCanvas()
      if (!exportCanvas) return

      const safeFileName = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const fileName = `${safeFileName || 'store'}-retcash-qr.png`

      const blob = await new Promise<Blob | null>((resolve) =>
        exportCanvas.toBlob((b) => resolve(b), 'image/png')
      )

      if (!blob) {
        setIosFallbackImageUrl(exportCanvas.toDataURL('image/png'))
        return
      }

      const isIOS =
        typeof navigator !== 'undefined' &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

      // 1. On iOS, prefer native Share Sheet (allows "Save Image" directly to Photos)
      if (isIOS && typeof navigator !== 'undefined' && navigator.share) {
        const file = new File([blob], fileName, { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${storeName} - RETCASH QR`,
            })
            return
          } catch (shareErr: any) {
            // If user cancelled share sheet, don't force popup; otherwise show fallback image
            if (shareErr?.name === 'AbortError') return
          }
        }
      }

      // 2. If iOS without Web Share file support, open Save-to-Photos preview card
      if (isIOS) {
        setIosFallbackImageUrl(exportCanvas.toDataURL('image/png'))
        return
      }

      // 3. Standard Blob download for Android & Desktop browsers
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
    } finally {
      setIsGeneratingCard(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-orange-50/80 via-white to-emerald-50/60 border border-orange-200/80 rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
            <QrCode className="size-4 text-[#F97316] shrink-0" /> Customer Counter QR Code
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Print and place at your counter. Customers scan to open their wallet.
          </p>
        </div>
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#EA580C] whitespace-nowrap shrink-0">
          Auto-Generated
        </span>
      </div>

      {/* Live Branded Preview Card */}
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs">
        <span className="text-[10px] font-black tracking-widest text-[#00875A] uppercase">
          RETCASH
        </span>
        <p className="text-xs font-extrabold text-slate-900 mt-0.5 mb-3">
          {storeName}
        </p>

        <div className="rounded-2xl border-2 border-[#F97316] bg-white p-2 shadow-xs">
          <canvas ref={previewCanvasRef} className="size-[200px] block" />
        </div>

        <p className="mt-2.5 text-[11px] font-bold text-slate-700">
          Scan to Earn {cashbackPercent}% Cashback
        </p>
        <p className="text-[10px] text-slate-400 font-mono truncate max-w-full mt-1">
          {storeQrUrl}
        </p>
      </div>

      {/* iOS Fallback Image Preview (Long-press to Save to Photos) */}
      {iosFallbackImageUrl && (
        <div className="rounded-2xl border-2 border-[#00875A] bg-emerald-50/70 p-3 space-y-2.5 text-center">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#00875A] flex items-center gap-1">
              <Share2 className="size-3.5" /> Press & hold image → Save to Photos
            </span>
            <button
              type="button"
              onClick={() => setIosFallbackImageUrl(null)}
              className="rounded-lg p-1 text-slate-500 hover:bg-white cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
          <img
            src={iosFallbackImageUrl}
            alt={`${storeName} RETCASH QR Card`}
            className="mx-auto max-h-72 w-auto rounded-xl border border-slate-200 shadow-sm"
          />
        </div>
      )}

      {/* Download & Copy Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDownloadBrandedQr}
          disabled={isGeneratingCard}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white py-2.5 px-3 text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-60"
        >
          <Download className="size-3.5 shrink-0" />
          {isGeneratingCard ? 'Preparing...' : 'Download Card'}
        </button>

        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 py-2.5 px-3 text-xs font-bold transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-[#00875A] shrink-0" /> Copied!
            </>
          ) : (
            <>
              <Copy className="size-3.5 shrink-0" /> Copy QR Link
            </>
          )}
        </button>
      </div>

      <a
        href={storeQrUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#00875A] hover:underline"
      >
        Preview customer scan screen <ExternalLink className="size-3" />
      </a>
    </div>
  )
}