'use client'

import { WalletCards, User, LogOut } from 'lucide-react'

interface MerchantSession {
  id: string
  store_name: string
  phone_number?: string
  default_cashback_percent?: number
  target_visits?: number
  logo_url?: string | null
  category?: string
}

interface DashboardHeaderProps {
  merchantSession: MerchantSession
  onOpenProfile: () => void
  onLogout: () => void
}

export default function DashboardHeader({
  merchantSession,
  onOpenProfile,
  onLogout
}: DashboardHeaderProps) {
  // கடையின் பெயரின் முதல் எழுத்தைப் பெறுவதற்கான Fallback Helper
  const storeInitial = merchantSession.store_name ? merchantSession.store_name.trim()[0].toUpperCase() : 'S'

  return (
    <header className="border-b border-emerald-800/20 bg-gradient-to-r from-[#00875A] via-[#059669] to-[#0d9488] text-white sticky top-0 z-40 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-5 lg:px-8">
        
        {/* RETCASH Logo & Store Name Identity */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 border border-white/30 backdrop-blur-xs text-white shadow-xs overflow-hidden">
            <img
              src="/logo.png"
              alt="RETCASH Logo"
              className="size-6 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <WalletCards className="size-5 hidden" />
          </div>
          <div>
            <p className="font-mono text-[13px] font-extrabold text-white">{merchantSession.store_name}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-100">
              <span className="size-2 rounded-full bg-emerald-300 animate-pulse" /> Store dashboard
            </div>
          </div>
        </div>
        
        {/* Profile Avatar & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer backdrop-blur-xs"
            type="button"
          >
            {/* Store Logo / Initial Avatar */}
            <div className="size-5 rounded-md bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {merchantSession.logo_url ? (
                <img
                  src={merchantSession.logo_url}
                  alt={merchantSession.store_name}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-black text-white leading-none">
                  {storeInitial}
                </span>
              )}
            </div>

            <span className="hidden sm:inline">Store Profile</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-red-200/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500/30 transition cursor-pointer backdrop-blur-xs"
            type="button"
          >
            <LogOut className="size-3.5" /> Logout
          </button>
        </div>
      </div>
    </header>
  )
}