'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Share2,
  X,
  Smartphone,
  HandCoins,
  Gift,
} from 'lucide-react'

interface StoreQrSectionProps {
  storeId: string
  storeName: string
  cashbackPercent?: number
  targetVisits?: number
}

// Helper to draw rounded rectangle path safely on any browser canvas
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// Helper to load /logo.png safely with fallback so export never fails
function loadBrandLogoImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null)
      return
    }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo.png'
  })
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

  // Render 100% scannable High-ECC QR with centered RETCASH logo in live preview
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !storeQrUrl) return

    let isCancelled = false

    const renderPreviewQr = async () => {
      try {
        await QRCode.toCanvas(canvas, storeQrUrl, {
          width: 220,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#065F46',
            light: '#FFFFFF',
          },
        })

        if (isCancelled) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const logoImg = await loadBrandLogoImage()
        if (isCancelled) return

        // Draw crisp white rounded center badge for RETCASH logo
        const size = canvas.width
        const badgeSize = Math.round(size * 0.24)
        const bx = (size - badgeSize) / 2
        const by = (size - badgeSize) / 2

        ctx.fillStyle = '#FFFFFF'
        drawRoundRect(ctx, bx, by, badgeSize, badgeSize, 10)
        ctx.fill()

        const pad = 6
        if (logoImg) {
          ctx.drawImage(logoImg, bx + pad, by + pad, badgeSize - pad * 2, badgeSize - pad * 2)
        } else {
          ctx.fillStyle = '#00875A'
          ctx.font = '900 24px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('R', size / 2, size / 2 + 1)
        }
      } catch (err) {
        console.error('QR render error:', err)
      }
    }

    renderPreviewQr()
    return () => {
      isCancelled = true
    }
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

  // Build high-res branded counter standee canvas (900 x 1220) matching the approved design
  const buildBrandedStandeeCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const exportCanvas = document.createElement('canvas')
    const W = 900
    const H = 1220
    exportCanvas.width = W
    exportCanvas.height = H
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return null

    const logoImg = await loadBrandLogoImage()

    // 1. Clean Crisp White Standee Background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    // Subtle top & bottom border frame for clean print cutting
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, W - 4, H - 4)

    // 2. Top Mint Pill Badge: OFFICIAL REWARD PARTNER
    const pillW = 390
    const pillH = 48
    const pillX = (W - pillW) / 2
    const pillY = 64

    ctx.fillStyle = '#E6F4EA'
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 24)
    ctx.fill()

    ctx.fillStyle = '#00875A'
    ctx.font = '800 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('OFFICIAL REWARD PARTNER', W / 2, pillY + pillH / 2 + 1)

    // 3. Store Name + Small Gift Accent
    const displayStore =
      storeName.length > 22 ? `${storeName.slice(0, 21)}…` : storeName
    ctx.fillStyle = '#0F172A'
    ctx.font = '900 64px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const textMetrics = ctx.measureText(displayStore)
    const storeTextY = 188
    ctx.fillText(displayStore, W / 2 - 14, storeTextY)

    // Small Gold Gift Box Icon next to Store Name
    const giftX = W / 2 + textMetrics.width / 2 + 2
    const giftY = storeTextY - 58
    ctx.fillStyle = '#F59E0B'
    drawRoundRect(ctx, giftX, giftY + 8, 28, 22, 4)
    ctx.fill()
    ctx.fillStyle = '#FBBF24'
    drawRoundRect(ctx, giftX - 2, giftY + 3, 32, 7, 3)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(giftX + 12, giftY + 3, 4, 27)

    // 4. Elevated Rounded White QR Card Container
    const cardSize = 460
    const cardX = (W - cardSize) / 2
    const cardY = 235

    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)'
    ctx.shadowBlur = 32
    ctx.shadowOffsetY = 12
    ctx.fillStyle = '#FFFFFF'
    drawRoundRect(ctx, cardX, cardY, cardSize, cardSize, 42)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 2.5
    drawRoundRect(ctx, cardX, cardY, cardSize, cardSize, 42)
    ctx.stroke()

    // Render High-ECC Emerald QR onto offscreen canvas
    const qrSize = 390
    const qrX = cardX + (cardSize - qrSize) / 2
    const qrY = cardY + (cardSize - qrSize) / 2

    const offscreenQr = document.createElement('canvas')
    await QRCode.toCanvas(offscreenQr, storeQrUrl, {
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#065F46',
        light: '#FFFFFF',
      },
    })
    ctx.drawImage(offscreenQr, qrX, qrY, qrSize, qrSize)

    // Center White Badge + RETCASH Logo inside QR
    const centerBox = 94
    const cbx = (W - centerBox) / 2
    const cby = cardY + (cardSize - centerBox) / 2

    ctx.fillStyle = '#FFFFFF'
    drawRoundRect(ctx, cbx, cby, centerBox, centerBox, 18)
    ctx.fill()

    if (logoImg) {
      const logoPad = 14
      ctx.drawImage(
        logoImg,
        cbx + logoPad,
        cby + logoPad,
        centerBox - logoPad * 2,
        centerBox - logoPad * 2
      )
    } else {
      ctx.fillStyle = '#00875A'
      ctx.font = '900 48px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('R', W / 2, cby + centerBox / 2 + 2)
    }

    // 5. Emerald Cashback Banner Pill below QR
    const offerW = 680
    const offerH = 68
    const offerX = (W - offerW) / 2
    const offerY = 740

    ctx.fillStyle = '#00875A'
    drawRoundRect(ctx, offerX, offerY, offerW, offerH, 34)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const offerHeadline =
      targetVisits && targetVisits > 1
        ? `${cashbackPercent}% CASHBACK • REDEEM ON VISIT #${targetVisits}`
        : `${cashbackPercent}% CASHBACK ON EVERY BILL`
    ctx.fillText(offerHeadline, W / 2, offerY + offerH / 2 + 1)

    // 6. "How It Works" Section
    ctx.fillStyle = '#0F172A'
    ctx.font = '700 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('How It Works', W / 2, 875)

    const colCenters = [200, 450, 700]
    const iconTopY = 915

    // Step 1 Icon: Mini QR Scanner Frame
    ctx.strokeStyle = '#065F46'
    ctx.lineWidth = 4
    const s1X = colCenters[0] - 28
    drawRoundRect(ctx, s1X, iconTopY, 56, 56, 10)
    ctx.stroke()
    ctx.fillStyle = '#065F46'
    ctx.fillRect(s1X + 10, iconTopY + 10, 14, 14)
    ctx.fillRect(s1X + 32, iconTopY + 10, 14, 14)
    ctx.fillRect(s1X + 10, iconTopY + 32, 14, 14)
    ctx.fillRect(s1X + 32, iconTopY + 32, 6, 6)
    ctx.fillRect(s1X + 40, iconTopY + 40, 6, 6)

    // Step 2 Icon: Smartphone Outline
    const s2X = colCenters[1] - 20
    drawRoundRect(ctx, s2X, iconTopY - 2, 40, 60, 8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(s2X + 14, iconTopY + 6)
    ctx.lineTo(s2X + 26, iconTopY + 6)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(colCenters[1], iconTopY + 49, 2.5, 0, Math.PI * 2)
    ctx.fill()

    // Step 3 Icon: Coin + Hand
    ctx.beginPath()
    ctx.arc(colCenters[2] + 4, iconTopY + 16, 16, 0, Math.PI * 2)
    ctx.stroke()
    ctx.font = '800 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', colCenters[2] + 4, iconTopY + 17)

    // Hand gesture beneath coin
    ctx.beginPath()
    ctx.moveTo(colCenters[2] - 26, iconTopY + 42)
    ctx.lineTo(colCenters[2] - 8, iconTopY + 42)
    ctx.lineTo(colCenters[2] + 22, iconTopY + 42)
    ctx.quadraticCurveTo(colCenters[2] + 30, iconTopY + 42, colCenters[2] + 24, iconTopY + 50)
    ctx.lineTo(colCenters[2] - 4, iconTopY + 55)
    ctx.lineTo(colCenters[2] - 26, iconTopY + 52)
    ctx.closePath()
    ctx.stroke()

    // Step Labels
    ctx.fillStyle = '#0F172A'
    ctx.font = '600 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('1. Scan QR', colCenters[0], 1020)
    ctx.fillText('2. Enter Mobile', colCenters[1], 1020)
    ctx.fillText('3. Get Cashback', colCenters[2], 1020)

    // 7. Bottom Footer Divider & RETCASH Branding Strip
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(54, 1085)
    ctx.lineTo(W - 54, 1085)
    ctx.stroke()

    if (logoImg) {
      ctx.drawImage(logoImg, 56, 1122, 46, 46)
    } else {
      ctx.fillStyle = '#00875A'
      ctx.font = '900 40px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('R', 58, 1158)
    }

    ctx.fillStyle = '#0F172A'
    ctx.font = '900 32px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('RETCASH', 114, 1156)

    ctx.fillStyle = '#334155'
    ctx.font = '600 24px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('No App Needed • 10 Secs', W - 56, 1154)

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
            <QrCode className="size-4 text-[#F97316] shrink-0" /> Customer Counter QR Standee
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Download & print this branded standee for your billing counter.
          </p>
        </div>
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#EA580C] whitespace-nowrap shrink-0">
          Print Ready
        </span>
      </div>

      {/* Live Branded Counter Standee Preview */}
      <div className="rounded-2xl border border-slate-200/90 bg-white px-4 pt-5 pb-3.5 text-center shadow-sm">
        <span className="inline-block rounded-full bg-[#E6F4EA] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#00875A]">
          OFFICIAL REWARD PARTNER
        </span>

        <div className="mt-2 mb-3.5 flex items-center justify-center gap-1.5">
          <h3 className="text-xl font-black tracking-tight text-slate-900 truncate max-w-[230px]">
            {storeName}
          </h3>
          <Gift className="size-4 text-amber-500 shrink-0 -mt-2" />
        </div>

        {/* Crisp Emerald QR with Center RETCASH Logo */}
        <div className="mx-auto inline-flex items-center justify-center rounded-2xl border border-slate-100 bg-white p-2.5 shadow-md shadow-slate-200/60">
          <canvas ref={previewCanvasRef} className="size-[190px] block" />
        </div>

        {/* Cashback Highlight Pill */}
        <div className="mt-4">
          <span className="inline-block rounded-full bg-[#00875A] px-4 py-1.5 text-[11px] font-extrabold tracking-wide text-white shadow-xs">
            {targetVisits && targetVisits > 1
              ? `${cashbackPercent}% CASHBACK • VISIT #${targetVisits} REWARD`
              : `${cashbackPercent}% CASHBACK ON EVERY BILL`}
          </span>
        </div>

        {/* How It Works 3-Step Visual Guide */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs font-extrabold text-slate-800 mb-2.5">How It Works</p>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#065F46]">
                <QrCode className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">1. Scan QR</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#065F46]">
                <Smartphone className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">2. Enter Mobile</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#065F46]">
                <HandCoins className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">3. Get Cashback</span>
            </div>
          </div>
        </div>

        {/* Bottom Co-Branding Strip */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="RETCASH" className="h-4 w-4 object-contain" />
            <span className="font-black tracking-wide text-slate-900">RETCASH</span>
          </div>
          <span className="font-semibold text-slate-500">No App Needed • 10 Secs</span>
        </div>
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
          {isGeneratingCard ? 'Preparing...' : 'Download Standee'}
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