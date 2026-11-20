'use client'

import { useCustomerLang } from '@/lib/i18n/useCustomerLang'
import { CustomerLang } from '@/lib/i18n/customerDictionary'

const LANG_OPTIONS: { code: CustomerLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'si', label: 'සිංහල' },
]

export default function CustomerLangSwitcher() {
  const { lang, setLang } = useCustomerLang()

  return (
    <div
      role="group"
      aria-label="Select Language"
      className="inline-flex items-center rounded-full bg-slate-100 p-0.5 border border-slate-200/80 shrink-0"
    >
      {LANG_OPTIONS.map((opt) => {
        const isActive = lang === opt.code
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLang(opt.code)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition cursor-pointer ${
              isActive
                ? 'bg-[#00875A] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}