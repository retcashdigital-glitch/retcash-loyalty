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
  Banknote,
  Sparkles,
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

// Draw center badge using real /logo.svg (with crisp emerald vector fallback)
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
  ctx.fillStyle = '#FFFFFF'
  drawRoundRect(ctx, x - 6, y - 6, badgeSize + 12, badgeSize + 12, badgeSize * 0.28)
  ctx.fill()

  ctx.strokeStyle = '#D1FAE5'
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
    ctx.fillStyle = '#006B3E'
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

// Render modern rounded QR in Deep Emerald & Forest Green palette
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

  // Deep forest-emerald rounded data dots
  ctx.fillStyle = '#043927'
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

  // Styled emerald corner finder eyes
  const drawFinderEye = (startRow: number, startCol: number) => {
    const x = (startCol + marginModules) * cell
    const y = (startRow + marginModules) * cell
    const outerSize = 7 * cell

    ctx.fillStyle = '#043927'
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

    ctx.fillStyle = '#006B3E'
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

  // Build high-contrast Emerald & Deep Forest Green print standee (1200 x 1640)
  const buildBrandedStandeeCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const exportCanvas = document.createElement('canvas')
    const W = 1200
    const H = 1640
    exportCanvas.width = W
    exportCanvas.height = H
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return null

    const logoImg = await loadVectorBrandLogo()

    // 1. Soft Mint-White Base Card
    ctx.fillStyle = '#F8FAFC'
    ctx.fillRect(0, 0, W, H)

    // 2. Bold Deep Forest-to-Emerald Top Hero Header (matches logo gradient tone)
    const heroGrad = ctx.createLinearGradient(0, 0, W, 470)
    heroGrad.addColorStop(0, '#042F2E')
    heroGrad.addColorStop(0.55, '#064E3B')
    heroGrad.addColorStop(1, '#006B3E')
    ctx.fillStyle = heroGrad
    ctx.fillRect(0, 0, W, 460)

    // Subtle Emerald Accent Line at bottom of header
    ctx.fillStyle = '#10B981'
    ctx.fillRect(0, 452, W, 10)

    // Store Partner Pill inside Header
    const pillW = 460
    const pillH = 52
    const pillX = (W - pillW) / 2
    const pillY = 56

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 26)
    ctx.fill()
    ctx.strokeStyle = 'rgba(167, 243, 208, 0.35)'
    ctx.lineWidth = 2
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 26)
    ctx.stroke()

    ctx.fillStyle = '#A7F3D0'
    ctx.font = '800 22px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('OFFICIAL REWARD PARTNER', W / 2, pillY + pillH / 2 + 1)

    // Primary Customer Hook Headline (Highest visual hierarchy)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 76px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`GET ${cashbackPercent}% CASHBACK`, W / 2, 198)

    // Store Name Subtitle
    const displayStore =
      storeName.length > 24 ? `${storeName.slice(0, 23)}…` : storeName
    ctx.fillStyle = '#D1FAE5'
    ctx.font = '700 42px system-ui, -apple-system, sans-serif'
    ctx.fillText(`at ${displayStore}`, W / 2, 265)

    // 3. Elevated Rounded White QR Card overlapping the Header
    const cardSize = 640
    const cardX = (W - cardSize) / 2
    const cardY = 325

    ctx.save()
    ctx.shadowColor = 'rgba(4, 47, 46, 0.16)'
    ctx.shadowBlur = 45
    ctx.shadowOffsetY = 18
    ctx.fillStyle = '#FFFFFF'
    drawRoundRect(ctx, cardX, cardY, cardSize, cardSize, 52)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = '#A7F3D0'
    ctx.lineWidth = 4
    drawRoundRect(ctx, cardX, cardY, cardSize, cardSize, 52)
    ctx.stroke()

    // Render Ultra-Sharp 560x560 Modern Rounded QR with /logo.svg
    const qrSize = 560
    const offscreenQr = document.createElement('canvas')
    renderStyledModernQr(offscreenQr, storeQrUrl, qrSize, logoImg)

    const qrX = cardX + (cardSize - qrSize) / 2
    const qrY = cardY + (cardSize - qrSize) / 2
    ctx.drawImage(offscreenQr, qrX, qrY, qrSize, qrSize)

    // 4. Scan Callout Pill
    const offerW = 860
    const offerH = 82
    const offerX = (W - offerW) / 2
    const offerY = 1015

    ctx.fillStyle = '#006B3E'
    drawRoundRect(ctx, offerX, offerY, offerW, offerH, 41)
    ctx.fill()

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 32px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const offerHeadline =
      targetVisits && targetVisits > 1
        ? `SCAN TO COLLECT • REDEEM ON VISIT #${targetVisits}`
        : 'SCAN TO CLAIM INSTANT CASHBACK'
    ctx.fillText(offerHeadline, W / 2, offerY + offerH / 2 + 1)

    // 5. "How It Works" 3-Step Strip (Localized with Rs)
    ctx.fillStyle = '#042F2E'
    ctx.font = '800 38px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('How It Works', W / 2, 1185)

    const colCenters = [265, 600, 935]
    const iconTopY = 1230

    // Step 1 Icon: QR Frame
    ctx.strokeStyle = '#006B3E'
    ctx.lineWidth = 5
    const s1X = colCenters[0] - 36
    drawRoundRect(ctx, s1X, iconTopY, 72, 72, 14)
    ctx.stroke()
    ctx.fillStyle = '#006B3E'
    ctx.fillRect(s1X + 14, iconTopY + 14, 18, 18)
    ctx.fillRect(s1X + 40, iconTopY + 14, 18, 18)
    ctx.fillRect(s1X + 14, iconTopY + 40, 18, 18)
    ctx.fillRect(s1X + 40, iconTopY + 40, 8, 8)
    ctx.fillRect(s1X + 50, iconTopY + 50, 8, 8)

    // Step 2 Icon: Smartphone
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

    // Step 3 Icon: Localized Rs Cashback Coin Badge
    ctx.beginPath()
    ctx.arc(colCenters[2], iconTopY + 36, 36, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#006B3E'
    ctx.font = '900 28px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Rs', colCenters[2], iconTopY + 38)

    // Step Labels
    ctx.fillStyle = '#0F172A'
    ctx.font = '700 30px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('1. Scan QR', colCenters[0], 1365)
    ctx.fillText('2. Enter Mobile', colCenters[1], 1365)
    ctx.fillText('3. Get Cashback', colCenters[2], 1365)

    // 6. Bottom Footer Strip
    ctx.strokeStyle = '#CBD5E1'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(72, 1450)
    ctx.lineTo(W - 72, 1450)
    ctx.stroke()

    if (logoImg) {
      ctx.drawImage(logoImg, 76, 1510, 58, 58)
    } else {
      drawCenterBrandEmblem(ctx, 106, 1539, 52, null)
    }

    ctx.fillStyle = '#042F2E'
    ctx.font = '900 42px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('RETCASH', 148, 1541)

    ctx.fillStyle = '#334155'
    ctx.font = '600 30px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('No App Needed • 10 Secs', W - 74, 1541)

    return exportCanvas
  }

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
    <div className="bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 border border-emerald-200/90 rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-extrabold text-[#042F2E] flex items-center gap-1.5 uppercase tracking-wider">
            <QrCode className="size-4 text-[#006B3E] shrink-0" /> Customer Counter QR Standee
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Print and place at your billing counter so customers can scan & earn.
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#006B3E] whitespace-nowrap shrink-0">
          Print Ready
        </span>
      </div>

      {/* Live Branded Counter Standee Preview (100% Emerald & Forest Green) */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-slate-50/60 text-center shadow-sm">
        {/* Deep Forest-to-Emerald Hero Header */}
        <div className="bg-gradient-to-br from-[#042F2E] via-[#064E3B] to-[#006B3E] px-4 pt-4 pb-12 text-white border-b-2 border-emerald-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-emerald-300/30 px-3 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-200">
            <Sparkles className="size-2.5" /> OFFICIAL REWARD PARTNER
          </span>

          <h3 className="mt-2 text-xl font-black tracking-tight text-white">
            GET {cashbackPercent}% CASHBACK
          </h3>
          <p className="text-xs font-bold text-emerald-200 truncate">
            at {storeName}
          </p>
        </div>

        {/* Overlapping White QR Card */}
        <div className="-mt-8 px-4">
          <div className="mx-auto inline-flex items-center justify-center rounded-2xl border-2 border-emerald-200 bg-white p-2.5 shadow-md shadow-emerald-950/10">
            <canvas ref={previewCanvasRef} className="size-[192px] block" />
          </div>
        </div>

        {/* Action Banner Pill */}
        <div className="mt-3.5 px-4">
          <span className="inline-block rounded-full bg-[#006B3E] px-4 py-1.5 text-[10px] font-extrabold tracking-wide text-white shadow-xs">
            {targetVisits && targetVisits > 1
              ? `SCAN TO COLLECT • REDEEM ON VISIT #${targetVisits}`
              : 'SCAN TO CLAIM INSTANT CASHBACK'}
          </span>
        </div>

        {/* How It Works 3-Step Visual Guide */}
        <div className="mt-4 px-4 pt-3 border-t border-slate-200/80">
          <p className="text-xs font-extrabold text-[#042F2E] mb-2.5">How It Works</p>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/80 text-[#006B3E]">
                <QrCode className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-800">1. Scan QR</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/80 text-[#006B3E]">
                <Smartphone className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-800">2. Enter Mobile</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/80 text-[#006B3E]">
                <Banknote className="size-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-800">3. Get Cashback</span>
            </div>
          </div>
        </div>

        {/* Bottom Co-Branding Strip */}
        <div className="mt-3.5 px-4 py-2.5 bg-white border-t border-slate-200/80 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            <img src="/logo.svg" alt="RETCASH" className="h-4 w-4 object-contain" />
            <span className="font-black tracking-wide text-[#042F2E]">RETCASH</span>
          </div>
          <span className="font-semibold text-slate-500">No App Needed • 10 Secs</span>
        </div>
      </div>

      {/* iOS Fallback Image Preview */}
      {iosFallbackImageUrl && (
        <div className="rounded-2xl border-2 border-[#006B3E] bg-emerald-50/70 p-3 space-y-2.5 text-center">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#006B3E] flex items-center gap-1">
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
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#006B3E] hover:bg-[#043927] text-white py-2.5 px-3 text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-60"
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
              <Check className="size-3.5 text-[#006B3E] shrink-0" /> Copied!
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
        className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#006B3E] hover:underline"
      >
        Preview customer scan screen <ExternalLink className="size-3" />
      </a>
    </div>
  )
}