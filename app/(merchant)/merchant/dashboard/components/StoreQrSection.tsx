'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { QrCode, Download, Copy, Check, ExternalLink } from 'lucide-react'

interface StoreQrSectionProps {
  storeId: string
  storeName: string
  cashbackPercent?: number
  targetVisits?: number
}

// ─── Self-Contained ISO/IEC 18004 QR Matrix Generator (Versions 1–10, ECC M) ───
const ECC_M_TABLE: Record<
  number,
  { total: number; eccPerBlock: number; blocks: [number, number][] }
> = {
  1: { total: 26, eccPerBlock: 10, blocks: [[1, 16]] },
  2: { total: 44, eccPerBlock: 16, blocks: [[1, 28]] },
  3: { total: 70, eccPerBlock: 26, blocks: [[1, 44]] },
  4: { total: 100, eccPerBlock: 18, blocks: [[2, 32]] },
  5: { total: 134, eccPerBlock: 24, blocks: [[2, 43]] },
  6: { total: 172, eccPerBlock: 16, blocks: [[4, 27]] },
  7: { total: 196, eccPerBlock: 18, blocks: [[4, 31]] },
  8: { total: 242, eccPerBlock: 22, blocks: [[2, 38], [2, 39]] },
  9: { total: 292, eccPerBlock: 22, blocks: [[3, 36], [2, 37]] },
  10: { total: 346, eccPerBlock: 26, blocks: [[4, 43], [1, 44]] },
}

const ALIGNMENT_COORDS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
}

const FORMAT_BITS_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0]
const VERSION_BITS: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
}

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number) {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    const factor = GF_EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], factor)
    }
    poly = next
  }
  return poly
}

function rsComputeEcc(data: Uint8Array, eccLen: number): Uint8Array {
  const gen = rsGeneratorPoly(eccLen)
  const res = new Uint8Array(eccLen)
  for (let i = 0; i < data.length; i++) {
    const coef = data[i] ^ res[0]
    res.copyWithin(0, 1)
    res[eccLen - 1] = 0
    if (coef !== 0) {
      for (let j = 0; j < eccLen; j++) {
        res[j] ^= gfMul(gen[j + 1], coef)
      }
    }
  }
  return res
}

function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)
  let version = 1
  while (version <= 10) {
    const spec = ECC_M_TABLE[version]
    const dataCap = spec.blocks.reduce((sum, [cnt, len]) => sum + cnt * len, 0)
    const headerBits = version >= 10 ? 20 : 12
    if (Math.ceil((headerBits + bytes.length * 8) / 8) <= dataCap) break
    version++
  }
  if (version > 10) version = 10

  const spec = ECC_M_TABLE[version]
  const dataCap = spec.blocks.reduce((sum, [cnt, len]) => sum + cnt * len, 0)

  const bits: number[] = []
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }

  pushBits(0b0100, 4) // Byte mode
  pushBits(bytes.length, version >= 10 ? 16 : 8)
  for (const b of bytes) pushBits(b, 8)
  pushBits(0, Math.min(4, dataCap * 8 - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)

  const dataBytes = new Uint8Array(dataCap)
  for (let i = 0; i < bits.length / 8; i++) {
    let v = 0
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b]
    dataBytes[i] = v
  }
  const pads = [0xec, 0x11]
  for (let i = bits.length / 8, p = 0; i < dataCap; i++, p++) {
    dataBytes[i] = pads[p % 2]
  }

  const dataBlocks: Uint8Array[] = []
  const eccBlocks: Uint8Array[] = []
  let offset = 0
  for (const [count, len] of spec.blocks) {
    for (let b = 0; b < count; b++) {
      const slice = dataBytes.slice(offset, offset + len)
      offset += len
      dataBlocks.push(slice)
      eccBlocks.push(rsComputeEcc(slice, spec.eccPerBlock))
    }
  }

  const codewords: number[] = []
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length))
  for (let i = 0; i < maxDataLen; i++) {
    for (const blk of dataBlocks) if (i < blk.length) codewords.push(blk[i])
  }
  for (let i = 0; i < spec.eccPerBlock; i++) {
    for (const blk of eccBlocks) codewords.push(blk[i])
  }

  const size = version * 4 + 17
  const modules: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  )
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  )

  const setFunc = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = val
      isFunction[r][c] = true
    }
  }

  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6
        setFunc(row + r, col + c, inOuter && (onBorder || inInner))
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  const coords = ALIGNMENT_COORDS[version]
  for (const r of coords) {
    for (const c of coords) {
      if (isFunction[r][c]) continue
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFunc(r + dr, c + dc, Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0))
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunc(6, i, i % 2 === 0)
    if (!isFunction[i][6]) setFunc(i, 6, i % 2 === 0)
  }

  // Reserve format & version areas
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunc(8, i, false)
    if (!isFunction[i][8]) setFunc(i, 8, false)
  }
  for (let i = 0; i < 8; i++) {
    setFunc(8, size - 1 - i, false)
    setFunc(size - 1 - i, 8, false)
  }
  setFunc(size - 8, 8, true)

  if (version >= 7) {
    const vBits = VERSION_BITS[version]
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >>> i) & 1) === 1
      const a = Math.floor(i / 3)
      const b = size - 11 + (i % 3)
      setFunc(a, b, bit)
      setFunc(b, a, bit)
    }
  }

  // Place data bits zigzag
  let bitIdx = 0
  const totalBits = codewords.length * 8
  let upward = true
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert
      for (let j = 0; j < 2; j++) {
        const c = right - j
        if (!isFunction[r][c]) {
          let bit = false
          if (bitIdx < totalBits) {
            bit = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) === 1
            bitIdx++
          }
          modules[r][c] = bit
        }
      }
    }
    upward = !upward
  }

  // Apply Mask 0 ((r + c) % 2 === 0) for crisp balance
  const maskPattern = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c]
      }
    }
  }

  const fmt = FORMAT_BITS_M[maskPattern]
  for (let i = 0; i <= 5; i++) setFunc(8, i, ((fmt >>> i) & 1) === 1)
  setFunc(8, 7, ((fmt >>> 6) & 1) === 1)
  setFunc(8, 8, ((fmt >>> 7) & 1) === 1)
  setFunc(7, 8, ((fmt >>> 8) & 1) === 1)
  for (let i = 9; i < 15; i++) setFunc(14 - i, 8, ((fmt >>> i) & 1) === 1)
  for (let i = 0; i < 8; i++) setFunc(size - 1 - i, 8, ((fmt >>> i) & 1) === 1)
  for (let i = 8; i < 15; i++) setFunc(8, size - 15 + i, ((fmt >>> i) & 1) === 1)
  setFunc(size - 8, 8, true)

  return modules.map((row) => row.map((cell) => Boolean(cell)))
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const storeQrUrl = useMemo(() => {
    const base = origin || 'https://retcash.vercel.app'
    return `${base}/customer/login?store=${encodeURIComponent(storeId)}`
  }, [origin, storeId])

  const qrMatrix = useMemo(() => generateQrMatrix(storeQrUrl), [storeQrUrl])

  // Render live preview QR on small canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !qrMatrix.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const modulesCount = qrMatrix.length
    const quietZone = 2
    const totalModules = modulesCount + quietZone * 2
    const pixelSize = 220
    const scale = pixelSize / totalModules

    canvas.width = pixelSize
    canvas.height = pixelSize

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, pixelSize, pixelSize)

    ctx.fillStyle = '#0F172A'
    for (let r = 0; r < modulesCount; r++) {
      for (let c = 0; c < modulesCount; c++) {
        if (qrMatrix[r][c]) {
          ctx.fillRect(
            Math.floor((c + quietZone) * scale),
            Math.floor((r + quietZone) * scale),
            Math.ceil(scale),
            Math.ceil(scale)
          )
        }
      }
    }
  }, [qrMatrix])

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(storeQrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Ignore clipboard fallback
    }
  }

  // Generate high-res branded print standee PNG (900 x 1200) and download
  const handleDownloadBrandedQr = () => {
    const exportCanvas = document.createElement('canvas')
    const W = 900
    const H = 1200
    exportCanvas.width = W
    exportCanvas.height = H
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

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
    const qrBoxSize = 430
    const qrX = (W - qrBoxSize) / 2
    const qrY = 465

    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(qrX - 20, qrY - 20, qrBoxSize + 40, qrBoxSize + 40, 28)
    ctx.fill()
    ctx.strokeStyle = '#F97316'
    ctx.lineWidth = 5
    ctx.stroke()

    // Draw crisp QR Matrix
    const modulesCount = qrMatrix.length
    const quietZone = 2
    const totalModules = modulesCount + quietZone * 2
    const cellSize = qrBoxSize / totalModules

    ctx.fillStyle = '#0F172A'
    for (let r = 0; r < modulesCount; r++) {
      for (let c = 0; c < modulesCount; c++) {
        if (qrMatrix[r][c]) {
          ctx.fillRect(
            Math.floor(qrX + (c + quietZone) * cellSize),
            Math.floor(qrY + (r + quietZone) * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          )
        }
      }
    }

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

    const safeFileName = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const link = document.createElement('a')
    link.download = `${safeFileName || 'store'}-retcash-qr.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="bg-gradient-to-br from-orange-50/80 via-white to-emerald-50/60 border border-orange-200/80 rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
            <QrCode className="size-4 text-[#F97316]" /> Customer Counter QR Code
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Print and place at your counter. Customers scan to open their wallet.
          </p>
        </div>
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#EA580C]">
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

        <div className="rounded-2xl border-2 border-[#F97316] bg-white p-2.5 shadow-xs">
          <canvas ref={previewCanvasRef} className="size-[170px] block" />
        </div>

        <p className="mt-2.5 text-[11px] font-bold text-slate-700">
          Scan to Earn {cashbackPercent}% Cashback
        </p>
        <p className="text-[10px] text-slate-400 font-mono truncate max-w-full mt-1">
          {storeQrUrl}
        </p>
      </div>

      {/* Download & Copy Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDownloadBrandedQr}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white py-2.5 px-3 text-xs font-extrabold shadow-sm transition cursor-pointer"
        >
          <Download className="size-3.5" /> Download Print Card
        </button>

        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 py-2.5 px-3 text-xs font-bold transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-[#00875A]" /> Copied!
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy QR Link
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