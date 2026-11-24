'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, Check, X, Globe, ExternalLink } from 'lucide-react';

type Language = 'en' | 'ta' | 'si';

interface StandeeCopy {
  label: string;
  line1: string;
  line2: string;
  steps: string;
  trust: string;
  equation: string;
  slogan: string;
  fontStack: string;
}

const COPY_BY_LANG: Record<Language, StandeeCopy> = {
  en: {
    label: 'English',
    line1: 'Scan & Claim',
    line2: 'Your Cashback.',
    steps: 'SCAN  •  COLLECT  •  REDEEM',
    trust: 'Not for payment  •  100% Free',
    equation: 'More Visits = More Cashback',
    slogan: 'Get your cashback. Enjoy your shopping.',
    fontStack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  ta: {
    label: 'தமிழ்',
    line1: 'ஸ்கேன் செய்து',
    line2: 'கேஷ்பேக் பெறுங்கள்.',
    steps: 'ஸ்கேன்  •  சேகரிப்பு  •  கேஷ்பேக்',
    trust: 'பணம் செலுத்த அல்ல  •  முற்றிலும் இலவசம்',
    equation: 'அதிக விசிட் = அதிக கேஷ்பேக்',
    slogan: 'கேஷ்பேக் பெறுங்கள். மகிழ்ச்சியாக வாங்குங்கள்.',
    fontStack: '"Noto Sans Tamil", "Latha", system-ui, sans-serif',
  },
  si: {
    label: 'සිංහල',
    line1: 'Scan කර',
    line2: 'Cashback ලබාගන්න.',
    steps: 'SCAN  •  එකතු කරන්න  •  ලබාගන්න',
    trust: 'ගෙවීම් සඳහා නොවේ  •  100% නොමිලේ',
    equation: 'වැඩි වාර ගණනක් = වැඩි Cashback',
    slogan: 'Cashback ලබාගන්න. සතුටින් සාප්පු යන්න.',
    fontStack: '"Noto Sans Sinhala", "Iskoola Pota", system-ui, sans-serif',
  },
};

const TARGET_WALLET_URL = 'https://www.retcashapp.com/customer/login';

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function loadVectorBrandLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/logo.svg';
  });
}

function drawCenterBrandEmblem(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  badgeSize: number,
  logoImg: HTMLImageElement | null
) {
  const half = badgeSize / 2;
  const x = centerX - half;
  const y = centerY - half;

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  drawRoundRect(ctx, x - 6, y - 6, badgeSize + 12, badgeSize + 12, badgeSize * 0.28);
  ctx.fill();

  ctx.strokeStyle = '#D1FAE5';
  ctx.lineWidth = Math.max(1.5, badgeSize * 0.02);
  drawRoundRect(ctx, x - 2, y - 2, badgeSize + 4, badgeSize + 4, badgeSize * 0.25);
  ctx.stroke();

  if (logoImg) {
    const pad = Math.round(badgeSize * 0.14);
    ctx.drawImage(logoImg, x + pad, y + pad, badgeSize - pad * 2, badgeSize - pad * 2);
  } else {
    ctx.fillStyle = '#006B3E';
    drawRoundRect(ctx, x, y, badgeSize, badgeSize, badgeSize * 0.24);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(badgeSize * 0.6)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', centerX, centerY + badgeSize * 0.03);
  }
  ctx.restore();
}

function renderStyledModernQr(
  canvas: HTMLCanvasElement,
  url: string,
  pixelSize: number,
  logoImg: HTMLImageElement | null
) {
  const qrData = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const count = qrData.modules.size;
  const data = qrData.modules.data;

  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  const marginModules = 2;
  const totalModules = count + marginModules * 2;
  const cell = pixelSize / totalModules;

  const isFinderZone = (r: number, c: number) => {
    if (r < 7 && c < 7) return true;
    if (r < 7 && c >= count - 7) return true;
    if (r >= count - 7 && c < 7) return true;
    return false;
  };

  const centerIdx = count / 2;
  const clearRadius = count * 0.165;
  const isCenterLogoZone = (r: number, c: number) =>
    Math.abs(r + 0.5 - centerIdx) < clearRadius && Math.abs(c + 0.5 - centerIdx) < clearRadius;

  ctx.fillStyle = '#043927';
  const dotRadius = cell * 0.42;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (isFinderZone(r, c) || isCenterLogoZone(r, c)) continue;
      if (data[r * count + c]) {
        const cx = (c + marginModules + 0.5) * cell;
        const cy = (r + marginModules + 0.5) * cell;
        ctx.beginPath();
        ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const drawFinderEye = (startRow: number, startCol: number) => {
    const x = (startCol + marginModules) * cell;
    const y = (startRow + marginModules) * cell;
    const outerSize = 7 * cell;

    ctx.fillStyle = '#043927';
    drawRoundRect(ctx, x, y, outerSize, outerSize, cell * 1.8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(
      ctx,
      x + cell,
      y + cell,
      outerSize - cell * 2,
      outerSize - cell * 2,
      cell * 1.15
    );
    ctx.fill();

    ctx.fillStyle = '#006B3E';
    drawRoundRect(
      ctx,
      x + cell * 2,
      y + cell * 2,
      outerSize - cell * 4,
      outerSize - cell * 4,
      cell * 0.85
    );
    ctx.fill();
  };

  drawFinderEye(0, 0);
  drawFinderEye(0, count - 7);
  drawFinderEye(count - 7, 0);

  const badgeSize = Math.round(pixelSize * 0.23);
  drawCenterBrandEmblem(ctx, pixelSize / 2, pixelSize / 2, badgeSize, logoImg);
}

interface UniversalQrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UniversalQrGeneratorModal({
  isOpen,
  onClose,
}: UniversalQrGeneratorModalProps) {
  const [lang, setLang] = useState<Language>('en');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewQrRef = useRef<HTMLCanvasElement | null>(null);

  const copy = COPY_BY_LANG[lang];

  useEffect(() => {
    if (!isOpen) return;
    const canvas = previewQrRef.current;
    if (!canvas) return;

    let cancelled = false;
    loadVectorBrandLogo().then((logoImg) => {
      if (!cancelled) {
        renderStyledModernQr(canvas, TARGET_WALLET_URL, 420, logoImg);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, lang]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(TARGET_WALLET_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard fallback
    }
  };

  // High-resolution A5 Print-Ready Canvas Export (1240 x 1748 px at 300 DPI ratio)
  const handleDownloadPng = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const exportCanvas = document.createElement('canvas');
      const W = 1240;
      const H = 1748;
      exportCanvas.width = W;
      exportCanvas.height = H;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      const logoImg = await loadVectorBrandLogo();

      // 1. Pure Solid White Print Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      // Subtle Outer Print Trim Border & Corner Geometric Accents
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 24, W - 48, H - 48);

      // Top-left & Bottom-right Emerald Corner Triangles (Fintech Precision Accent)
      ctx.fillStyle = '#006B3E';
      ctx.beginPath();
      ctx.moveTo(24, 24);
      ctx.lineTo(154, 24);
      ctx.lineTo(24, 154);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(W - 24, H - 24);
      ctx.lineTo(W - 154, H - 24);
      ctx.lineTo(W - 24, H - 154);
      ctx.closePath();
      ctx.fill();

      // 2. Top Brand Header (Logo + RETCASH QR)
      const headerY = 148;
      ctx.font = '800 42px system-ui, -apple-system, sans-serif';
      const brandText = 'RETCASH QR';
      const textWidth = ctx.measureText(brandText).width;
      const logoSize = 54;
      const gap = 18;
      const totalHeaderW = logoSize + gap + textWidth;
      const startX = (W - totalHeaderW) / 2;

      if (logoImg) {
        ctx.drawImage(logoImg, startX, headerY - logoSize / 2, logoSize, logoSize);
      } else {
        drawCenterBrandEmblem(ctx, startX + logoSize / 2, headerY, logoSize, null);
      }

      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(brandText, startX + logoSize + gap, headerY + 2);

      // 3. Primary 2-Line Action Headline
      const headlineSize = lang === 'en' ? 88 : 68;
      ctx.fillStyle = '#0F172A';
      ctx.font = `900 ${headlineSize}px ${copy.fontStack}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(copy.line1, W / 2, 325);
      ctx.fillText(copy.line2, W / 2, 325 + headlineSize + 18);

      // 4. Center QR Code + Precision Viewfinder Corner Brackets
      const qrSize = 560;
      const qrX = (W - qrSize) / 2;
      const qrY = 530;

      const offscreenQr = document.createElement('canvas');
      renderStyledModernQr(offscreenQr, TARGET_WALLET_URL, qrSize, logoImg);
      ctx.drawImage(offscreenQr, qrX, qrY, qrSize, qrSize);

      // Precision Fintech Viewfinder Brackets around QR
      const pad = 34;
      const bLen = 84;
      const bx1 = qrX - pad;
      const by1 = qrY - pad;
      const bx2 = qrX + qrSize + pad;
      const by2 = qrY + qrSize + pad;

      ctx.strokeStyle = '#006B3E';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(bx1, by1 + bLen);
      ctx.lineTo(bx1, by1);
      ctx.lineTo(bx1 + bLen, by1);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bx2 - bLen, by1);
      ctx.lineTo(bx2, by1);
      ctx.lineTo(bx2, by1 + bLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(bx1, by2 - bLen);
      ctx.lineTo(bx1, by2);
      ctx.lineTo(bx1 + bLen, by2);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bx2 - bLen, by2);
      ctx.lineTo(bx2, by2);
      ctx.lineTo(bx2, by2 - bLen);
      ctx.stroke();

      // 5. Crisp 3-Word Action Strip
      const stepsSize = lang === 'en' ? 40 : 33;
      ctx.fillStyle = '#006B3E';
      ctx.font = `800 ${stepsSize}px ${copy.fontStack}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(copy.steps, W / 2, 1225);

      // 6. Trust Pill ("Not for payment • 100% Free")
      const trustSize = lang === 'en' ? 28 : 25;
      ctx.font = `700 ${trustSize}px ${copy.fontStack}`;
      const trustTextW = ctx.measureText(copy.trust).width;
      const pillW = trustTextW + 84;
      const pillH = 62;
      const pillX = (W - pillW) / 2;
      const pillY = 1272;

      ctx.fillStyle = '#F1F5F9';
      drawRoundRect(ctx, pillX, pillY, pillW, pillH, 31);
      ctx.fill();

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      drawRoundRect(ctx, pillX, pillY, pillW, pillH, 31);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(copy.trust, W / 2, pillY + pillH / 2 + 1);

      // 7. Value Equation ("More Visits = More Cashback")
      const eqSize = lang === 'en' ? 38 : 32;
      ctx.fillStyle = '#0F172A';
      ctx.font = `700 ${eqSize}px ${copy.fontStack}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(copy.equation, W / 2, 1445);

      // 8. Clean Horizontal Divider & Brand Footer
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(84, 1525);
      ctx.lineTo(W - 84, 1525);
      ctx.stroke();

      const sloganSize = lang === 'en' ? 27 : 23;
      ctx.fillStyle = '#475569';
      ctx.font = `600 ${sloganSize}px ${copy.fontStack}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(copy.slogan, 84, 1605);

      ctx.fillStyle = '#0F172A';
      ctx.font = '800 27px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('RETCASH • retcashapp.com', W - 84, 1605);

      // Trigger PNG Download
      const blob = await new Promise<Blob | null>((resolve) =>
        exportCanvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) return;

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `retcash-universal-standee-${lang}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-gray-800 bg-gray-900 text-white shadow-2xl overflow-hidden my-auto">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 bg-gray-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <QrCode className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Universal Customer QR Standee (Print Ready)
              </h2>
              <p className="text-xs text-gray-400">
                அனைத்து கடைகளுக்கும் பொதுவான A5 வெள்ளை நிற போஸ்டர்
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body: Left Controls + Right Live Standee Preview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
          {/* Left Controls */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Language Switcher */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                  <Globe className="size-3.5 text-emerald-400" /> மொழியைத் தேர்ந்தெடுக்கவும்
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['en', 'ta', 'si'] as Language[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLang(code)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        lang === code
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                          : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {COPY_BY_LANG[code].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target URL Box */}
              <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-400">
                    QR திறக்கும் முகவரி (Target URL)
                  </span>
                  <a
                    href={TARGET_WALLET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    Test <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-900 px-2.5 py-2 border border-gray-800">
                  <code className="text-[11px] text-emerald-300 truncate">
                    {TARGET_WALLET_URL}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="shrink-0 text-gray-400 hover:text-white cursor-pointer"
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-400" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Print Tip */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-gray-300 space-y-1">
                <p className="font-bold text-emerald-400">பிரிண்ட் குறிப்பு (A5 Size):</p>
                <p className="text-gray-400 leading-relaxed">
                  டவுன்லோட் ஆகும் PNG படத்தை ஒரு A4 தாளில் இரண்டு போஸ்டர்கள் வரும்படி (A5 அளவில்)
                  கலர் பிரிண்ட் எடுத்து லேமினேட் செய்து கவுண்டரில் வைக்கவும்.
                </p>
              </div>
            </div>

            {/* Download Action Button */}
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 text-sm font-extrabold shadow-lg transition cursor-pointer disabled:opacity-60"
            >
              <Download className="size-4" />
              {isDownloading
                ? 'உருவாக்கப்படுகிறது...'
                : `Download A5 Standee (${COPY_BY_LANG[lang].label})`}
            </button>
          </div>

          {/* Right Live Preview Card (Matches Clean Fintech White Layout) */}
          <div className="md:col-span-7 flex items-center justify-center rounded-xl bg-gray-950 p-5 border border-gray-800">
            <div className="relative w-full max-w-[330px] bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 overflow-hidden px-6 py-6 text-center select-none">
              {/* Precision Fintech Corner Triangles */}
              <div className="absolute top-0 left-0 w-0 h-0 border-t-[32px] border-t-[#006B3E] border-r-[32px] border-r-transparent" />
              <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[32px] border-b-[#006B3E] border-l-[32px] border-l-transparent" />

              {/* Top Brand Row */}
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <img src="/logo.svg" alt="Retcash" className="h-5 w-5 object-contain" />
                <span className="text-xs font-extrabold tracking-wide text-slate-900">
                  RETCASH QR
                </span>
              </div>

              {/* Primary 2-Line Headline */}
              <h3
                className={`font-black text-slate-900 leading-tight tracking-tight ${
                  lang === 'en' ? 'text-2xl' : 'text-lg'
                }`}
              >
                {copy.line1}
                <br />
                {copy.line2}
              </h3>

              {/* QR Code with Viewfinder Corner Brackets */}
              <div className="relative mx-auto my-5 inline-flex items-center justify-center p-3">
                <span className="absolute top-0 left-0 h-5 w-5 border-t-[3.5px] border-l-[3.5px] border-[#006B3E] rounded-tl-xs" />
                <span className="absolute top-0 right-0 h-5 w-5 border-t-[3.5px] border-r-[3.5px] border-[#006B3E] rounded-tr-xs" />
                <span className="absolute bottom-0 left-0 h-5 w-5 border-b-[3.5px] border-l-[3.5px] border-[#006B3E] rounded-bl-xs" />
                <span className="absolute bottom-0 right-0 h-5 w-5 border-b-[3.5px] border-r-[3.5px] border-[#006B3E] rounded-br-xs" />

                <canvas ref={previewQrRef} className="size-[165px] block" />
              </div>

              {/* 3-Word Action Strip */}
              <p className="text-[11px] font-extrabold tracking-wider text-[#006B3E]">
                {copy.steps}
              </p>

              {/* Trust Pill */}
              <div className="mt-2">
                <span className="inline-block rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-700">
                  {copy.trust}
                </span>
              </div>

              {/* Value Equation */}
              <p className="mt-4 text-xs font-bold text-slate-900">{copy.equation}</p>

              {/* Footer Divider */}
              <div className="mt-4 pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2 text-[9px]">
                <span className="font-semibold text-slate-600 text-left truncate">
                  {copy.slogan}
                </span>
                <span className="font-extrabold text-slate-900 shrink-0">
                  RETCASH • retcashapp.com
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}