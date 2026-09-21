'use client'

import Link from 'next/link'
import { Store, Wallet, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex justify-center min-h-screen bg-slate-200/60 font-sans selection:bg-[#00875A] selection:text-white antialiased">
      <div className="relative bg-slate-50 w-full max-w-[430px] flex flex-col min-h-screen border-x border-slate-200/50 shadow-2xl overflow-hidden justify-between">
        
        {/* Background Emerald Glows (வாலட் பக்கத்தின் அதே பச்சை நிற விளைவுகள்) */}
        <div className="absolute top-[-5%] left-[-10%] w-72 h-72 bg-[#00875A]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-10%] w-72 h-72 bg-[#059669]/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header (வாலட் பக்கத்தில் உள்ள அதே அசல் லோகோ கட்டமைப்பு) */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-5 pt-4 pb-3.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="RETCASH Logo"
              className="h-9 w-auto object-contain"
            />
            <div>
              <span className="text-[16px] font-black tracking-tight text-slate-800 leading-none block uppercase">
                RETCASH
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                Loyalty Wallet
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#00875A] bg-[#ECFDF5] border border-emerald-200/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
            v2.0
          </span>
        </header>

        {/* 2. Main Content */}
        <main className="flex-1 px-4 pt-6 pb-8 space-y-6 z-10 flex flex-col justify-center">
          
          {/* Hero Banner Card */}
          <div
            className="relative rounded-3xl p-6 text-white shadow-lg overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #00875A 0%, #059669 45%, #0d9488 100%)",
              boxShadow: "0 8px 32px rgba(0,135,90,0.28)",
            }}
          >
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute right-4 top-14 w-20 h-20 rounded-full bg-white/8 pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full backdrop-blur-xs">
                <Sparkles size={12} className="text-emerald-200" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Digital Rewards Platform
                </span>
              </div>

              <h1 className="text-2xl font-black leading-tight text-white">
                Welcome to Retcash
              </h1>
              <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">
                Track your visits, earn rewards, and manage your cashback seamlessly in one place.
              </p>
            </div>
          </div>

          {/* Portal Selection Cards */}
          <div className="space-y-3.5">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">
              Select Portal to Continue
            </p>

            {/* Merchant Portal Card */}
            <Link
              href="/merchant/login"
              className="group block bg-white rounded-3xl p-4 shadow-xs border border-slate-200/80 hover:border-[#00875A] active:scale-[0.985] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
                  <Store size={22} className="text-[#00875A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-[#00875A] transition-colors">
                    Merchant Portal
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    Store login & manage billing
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#00875A] group-hover:text-white flex items-center justify-center text-slate-400 transition-all">
                  <ChevronRight size={16} />
                </div>
              </div>
            </Link>

            {/* Customer Portal Card */}
            <Link
              href="/customer/login"
              className="group block bg-white rounded-3xl p-4 shadow-xs border border-slate-200/80 hover:border-[#00875A] active:scale-[0.985] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#ECFDF5] transition-colors">
                  <Wallet size={22} className="text-slate-600 group-hover:text-[#00875A] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-[#00875A] transition-colors">
                    Customer Portal
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    Check cashback & digital wallet
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#00875A] group-hover:text-white flex items-center justify-center text-slate-400 transition-all">
                  <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          </div>

        </main>

        {/* 3. Footer */}
        <footer className="py-4 text-center border-t border-slate-200/60 bg-white/50 backdrop-blur-xs">
          <p className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-[#00875A]" />
            Secure Loyalty & Rewards Platform
          </p>
        </footer>

      </div>
    </div>
  )
}