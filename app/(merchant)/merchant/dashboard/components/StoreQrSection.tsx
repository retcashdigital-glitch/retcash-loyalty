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

// Load crisp Vector /logo.svg for zero-pixelation rendering at any print size
function loadVectorBrandLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null)
      return
    }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo.svg'
  })
}

// Draw center badge using real /logo.svg (with crisp vector fallback)
function drawCenterBrandEmblem(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  badgeSize: number,
  logoImg: HTMLImageElement | null
) {
  const half = badgeSize / 2
  const x = centerX - half
  const y = centerY - half

  ctx.save()
  // Crisp white rounded clearance shield
  ctx.fillStyle = '#FFFFFF'
  drawRoundRect(ctx, x - 6, y - 6, badgeSize + 12, badgeSize + 12, badgeSize * 0.28)
  ctx.fill()

  // Subtle light border so the emblem blends smoothly with QR dots
  ctx.strokeStyle = '#E2E8F0'
  ctx.lineWidth = Math.max(1.5, badgeSize * 0.02)
  drawRoundRect(ctx, x - 2, y - 2, badgeSize + 4, badgeSize + 4, badgeSize * 0.25)
  ctx.stroke()

  if (logoImg) {
    const pad = Math.round(badgeSize * 0.14)
    ctx.drawImage(
      logoImg,
      x + pad,
      y + pad,
      badgeSize - pad * 2,
      badgeSize - pad * 2
    )
  } else {
    // Fallback crisp vector R badge
    ctx.fillStyle = '#00875A'
    drawRoundRect(ctx, x, y, badgeSize, badgeSize, badgeSize * 0.24)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = `900 ${Math.round(badgeSize * 0.6)}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('R', centerX, centerY + badgeSize * 0.03)
  }
  ctx.restore()
}

// Render Instagram/WhatsApp style modern rounded QR with /logo.svg
function renderStyledModernQr(
  canvas: HTMLCanvasElement,
  url: string,
  pixelSize: number,
  logoImg: HTMLImageElement | null
) {
  const qrData = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const count = qrData.modules.size
  const data = qrData.modules.data

  canvas.width = pixelSize
  canvas.height = pixelSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, pixelSize, pixelSize)

  const marginModules = 2
  const totalModules = count + marginModules * 2
  const cell = pixelSize / totalModules

  const isFinderZone = (r: number, c: number) => {
    if (r < 7 && c < 7) return true
    if (r < 7 && c >= count - 7) return true
    if (r >= count - 7 && c < 7) return true
    return false
  }

  const centerIdx = count / 2
  const clearRadius = count * 0.165
  const isCenterLogoZone = (r: number, c: number) => {
    return (
      Math.abs(r + 0.5 - centerIdx) < clearRadius &&
      Math.abs(c + 0.5 - centerIdx) < clearRadius
    )
  }

  // Smooth rounded data dots
  ctx.fillStyle = '#065F46'
  const dotRadius = cell * 0.42
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (isFinderZone(r, c) || isCenterLogoZone(r, c)) continue
      if (data[r * count + c]) {
        const cx = (c + marginModules + 0.5) * cell
        const cy = (r + marginModules + 0.5) * cell
        ctx.beginPath()
        ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Modern rounded corner finder eyes
  const drawFinderEye = (startRow: number, startCol: number) => {
    const x = (startCol + marginModules) * cell
    const y = (startRow + marginModules) * cell
    const outerSize = 7 * cell

    ctx.fillStyle = '#065F46'
    drawRoundRect(ctx, x, y, outerSize, outerSize, cell * 1.8)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    drawRoundRect(
      ctx,
      x + cell,
      y + cell,
      outerSize - cell * 2,
      outerSize - cell * 2,
      cell * 1.15
    )
    ctx.fill()

    ctx.fillStyle = '#00875A'
    drawRoundRect(
      ctx,
      x + cell * 2,
      y + cell * 2,
      outerSize - cell * 4,
      outerSize - cell * 4,
      cell * 0.85
    )
    ctx.fill()
  }

  drawFinderEye(0, 0)
  drawFinderEye(0, count - 7)
  drawFinderEye(count - 7, 0)

  // Center RETCASH Vector Logo
  const badgeSize = Math.round(pixelSize * 0.23)
  drawCenterBrandEmblem(ctx, pixelSize / 2, pixelSize / 2, badgeSize, logoImg)
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

  // Render crisp 2x Retina preview QR with /logo.svg
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !storeQrUrl) return

    let isCancelled = false
    loadVectorBrandLogo().then((logoImg) => {
      if (!isCancelled) {
        renderStyledModernQr(canvas, storeQrUrl, 440, logoImg)
      }
    })

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

  // Build ultra-sharp high-res print standee canvas (1200 x 1620)
  const buildBrandedStandeeCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const exportCanvas = document.createElement('canvas')
    const W = 1200
    const H = 1620
    exportCanvas.width = W
    exportCanvas.height = H
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return null

    const logoImg = await loadVectorBrandLogo()

    // 1. Clean Crisp White Standee Background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, W - 4, H - 4)

    // 2. Top Mint Pill Badge
    const pillW = 500
    const pillH = 62
    const pillX = (W - pillW) / 2
    const pillY = 85

    ctx.fillStyle = '#E6F4EA'
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 31)
    ctx.fill()

    ctx.fillStyle = '#00875A'
    ctx.font = '800 26px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('OFFICIAL REWARD PARTNER', W / 2, pillY + pillH / 2 + 1)

    // 3. Store Name + Small Gold Gift Box
    const displayStore =
      storeName.length > 22 ? `${storeName.slice(0, 21)}…` : storeName
    ctx.fillStyle = '#0F172A'
    ctx.font = '900 84px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const textMetrics = ctx.measureText(displayStore)
    const storeTextY = 248
    ctx.fillText(displayStore, W / 2 - 18, storeTextY)

    const giftX = W / 2 + textMetrics.width / 2 + 4
    const giftY = storeTextY - 76
    ctx.fillStyle = '#F59E0B'
    drawRoundRect(ctx, giftX, giftY + 10, 36, 28, 6)
    ctx.fill()
    ctx.fillStyle = '#FBBF24'
    drawRoundRect(ctx, giftX - 3, giftY + 4, 42, 9, 4)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(giftX + 16, giftY + 4, 5, 34)

    // 4. Elevated Rounded White QR Card Container
    const cardSize = 620
    const cardX = (W - cardSize) / 2
    const cardY = 310

    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 16
    ctx.fillStyle = '#FFFFFF'
    drawRoundRect(ctx, cardX, cardY, cardSize, cardSize, 54)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 3
    drawRoundRect(ctx, cardX, cardY, cardSize, cardSize, 54)
    ctx.stroke()

    // Render Ultra-Sharp 550x550 Modern Rounded QR with /logo.svg
    const qrSize = 550
    const offscreenQr = document.createElement('canvas')
    renderStyledModernQr(offscreenQr, storeQrUrl, qrSize, logoImg)

    const qrX = cardX + (cardSize - qrSize) / 2
    const qrY = cardY + (cardSize - qrSize) / 2
    ctx.drawImage(offscreenQr, qrX, qrY, qrSize, qrSize)

    // 5. Emerald Cashback Banner Pill below QR
    const offerW = 900
    const offerH = 88
    const offerX = (W - offerW) / 2
    const offerY = 985

    ctx.fillStyle = '#00875A'
    drawRoundRect(ctx, offerX, offerY, offerW, offerH, 44)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 36px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const offerHeadline =
      targetVisits && targetVisits > 1
        ? `${cashbackPercent}% CASHBACK • REDEEM ON VISIT #${targetVisits}`
        : `${cashbackPercent}% CASHBACK ON EVERY BILL`
    ctx.fillText(offerHeadline, W / 2, offerY + offerH / 2 + 1)

    // 6. "How It Works" Section
    ctx.fillStyle = '#0F172A'
    ctx.font = '700 42px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('How It Works', W / 2, 1165)

    const colCenters = [265, 600, 935]
    const iconTopY = 1215

    // Step 1 Icon
    ctx.strokeStyle = '#065F46'
    ctx.lineWidth = 5
    const s1X = colCenters[0] - 36
    drawRoundRect(ctx, s1X, iconTopY, 72, 72, 14)
    ctx.stroke()
    ctx.fillStyle = '#065F46'
    ctx.fillRect(s1X + 14, iconTopY + 14, 18, 18)
    ctx.fillRect(s1X + 40, iconTopY + 14, 18, 18)
    ctx.fillRect(s1X + 14, iconTopY + 40, 18, 18)
    ctx.fillRect(s1X + 40, iconTopY + 40, 8, 8)
    ctx.fillRect(s1X + 50, iconTopY + 50, 8, 8)

    // Step 2 Icon
    const s2X = colCenters[1] - 26
    drawRoundRect(ctx, s2X, iconTopY - 2, 52, 76, 10)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(s2X + 18, iconTopY + 9)
    ctx.lineTo(s2X + 34, iconTopY + 9)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(colCenters[1], iconTopY + 62, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // Step 3 Icon
    ctx.beginPath()
    ctx.arc(colCenters[2] + 5, iconTopY + 20, 21, 0, Math.PI * 2)
    ctx.stroke()
    ctx.font = '800 24px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', colCenters[2] + 5, iconTopY + 21)

    ctx.beginPath()
    ctx.moveTo(colCenters[2] - 34, iconTopY + 54)
    ctx.lineTo(colCenters[2] - 10, iconTopY + 54)
    ctx.lineTo(colCenters[2] + 28, iconTopY + 54)
    ctx.quadraticCurveTo(colCenters[2] + 38, iconTopY + 54, colCenters[2] + 30, iconTopY + 65)
    ctx.lineTo(colCenters[2] - 5, iconTopY + 72)
    ctx.lineTo(colCenters[2] - 34, iconTopY + 68)
    ctx.closePath()
    ctx.stroke()

    // Step Labels
    ctx.fillStyle = '#0F172A'
    ctx.font = '600 31px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('1. Scan QR', colCenters[0], 1350)
    ctx.fillText('2. Enter Mobile', colCenters[1], 1350)
    ctx.fillText('3. Get Cashback', colCenters[2], 1350)

    // 7. Bottom Footer Divider & Vector RETCASH Branding Strip
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(72, 1435)
    ctx.lineTo(W - 72, 1435)
    ctx.stroke()

    if (logoImg) {
      ctx.drawImage(logoImg, 76, 1496, 56, 56)
    } else {
      drawCenterBrandEmblem(ctx, 106, 1525, 52, null)
    }

    ctx.fillStyle = '#0F172A'
    ctx.font = '900 42px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('RETCASH', 148, 1527)

    ctx.fillStyle = '#334155'
    ctx.font = '600 31px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('No App Needed • 10 Secs', W - 74, 1527)

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

      if (isIOS) {
        setIosFallbackImageUrl(exportCanvas.toDataURL('image/png'))
        return
      }

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

        {/* Crisp Modern Rounded QR with Vector /logo.svg */}
        <div className="mx-auto inline-flex items-center justify-center rounded-2xl border border-slate-100 bg-white p-2.5 shadow-md shadow-slate-200/60">
          <canvas ref={previewCanvasRef} className="size-[196px] block" />
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
            <img src="/logo.svg" alt="RETCASH" className="h-4 w-4 object-contain" />
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