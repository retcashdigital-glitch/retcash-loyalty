'use client'

import Link from 'next/link'
import { 
  Store, 
  Wallet, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  QrCode,
  Calendar,
  Gift
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-[#00875A] selection:text-white antialiased text-slate-800">
      
      {/* Background Emerald Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[#00875A]/5 blur-3xl pointer-events-none -z-10" />

      {/* 1. HEADER - Responsive Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Logo & Branding */}
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
                Loyalty & Rewards
              </span>
            </div>
          </div>

          {/* Quick Access Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/customer/login"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
            >
              <Wallet size={15} className="text-[#00875A]" />
              <span className="hidden sm:inline">Customer</span> Wallet
            </Link>

            <Link
              href="/merchant/login"
              className="bg-[#00875A] hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-sm flex items-center gap-1.5"
            >
              <Store size={15} />
              <span>Merchant Portal</span>
            </Link>
          </div>

        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 sm:pt-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column - Main Pitch */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#ECFDF5] border border-emerald-200/80 px-3.5 py-1.5 rounded-full">
              <Gift size={14} className="text-[#00875A]" />
              <span className="text-xs font-bold text-[#00875A] uppercase tracking-wider">
                Start with 30-Day Unlimited Free Trial
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
              Grow Your Business with Smart <span className="text-[#00875A]">Cashback & Rewards</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Retcash helps retail stores retain customers, boost repeat visits, and manage digital loyalty wallets seamlessly without complex hardware.
            </p>

            {/* Portal Choice Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 max-w-lg mx-auto lg:mx-0">
              
              <Link
                href="/merchant/login"
                className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 hover:border-[#00875A] hover:shadow-md transition text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#00875A]">
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 group-hover:text-[#00875A] transition">Merchant Portal</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Store Login & Billing</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-[#00875A] transition" />
              </Link>

              <Link
                href="/customer/login"
                className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 hover:border-[#00875A] hover:shadow-md transition text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#ECFDF5] group-hover:text-[#00875A] transition">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 group-hover:text-[#00875A] transition">Customer Pass</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Check Rewards Wallet</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-[#00875A] transition" />
              </Link>

            </div>
          </div>

          {/* Right Column - Hero Graphic Banner */}
          <div className="lg:col-span-5">
            <div
              className="relative rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #00875A 0%, #059669 50%, #0d9488 100%)",
                boxShadow: "0 12px 36px rgba(0,135,90,0.25)",
              }}
            >
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <QrCode size={26} />
                </div>
                <h2 className="text-xl font-extrabold">Digital Loyalty Card</h2>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  No plastic cards required. Customers track their visits and redeem cashback instantly using their phone number or QR pass.
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px] font-bold text-emerald-200">
                  <CheckCircle2 size={14} /> Instant Setup for Retailers
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. MERCHANT SUBSCRIPTION PLANS (Updated to 2 Plans) */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-12 sm:py-16 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-extrabold text-[#00875A] uppercase tracking-wider bg-[#ECFDF5] px-3 py-1 rounded-full border border-emerald-200/60">
              Merchant Plans
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Start Free for 30 Days
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Enjoy full feature access for 1 month completely free. Choose your plan after trial.
            </p>
          </div>

          {/* Pricing Cards Grid - 2 Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            
            {/* Monthly Plan */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Monthly Pass</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Flexible month-to-month billing</p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    Standard
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  Rs. 990 <span className="text-xs font-semibold text-slate-400">/ month</span>
                </div>
                <p className="text-[11px] text-emerald-700 font-bold bg-[#ECFDF5] px-3 py-1.5 rounded-xl inline-block">
                  ✓ First 30 Days Free Trial Included
                </p>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium pt-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Unlimited Customers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> WhatsApp Click-to-Chat Pass
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Visit Stamp & Cashback Tracker
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Store Offers & Banner Manager
                  </li>
                </ul>
              </div>
              <Link
                href="/merchant/login"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs py-3 rounded-2xl text-center transition block"
              >
                Start 30-Day Free Trial
              </Link>
            </div>

            {/* Yearly Plan - Highlighted Best Value */}
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-[#00875A] relative flex flex-col justify-between space-y-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00875A] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                <Sparkles size={11} /> Best Value (Save 33%)
              </div>
              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Annual Pass</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Pay yearly & get maximum savings</p>
                  </div>
                  <span className="text-[10px] font-bold bg-[#ECFDF5] text-[#00875A] px-2.5 py-1 rounded-full border border-emerald-200">
                    4 Months Free
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  Rs. 7,900 <span className="text-xs font-semibold text-slate-400">/ year</span>
                </div>
                <p className="text-[11px] text-emerald-700 font-bold bg-[#ECFDF5] px-3 py-1.5 rounded-xl inline-block">
                  ✓ Equivalent to Rs. 658 / month
                </p>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium pt-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Everything in Monthly Pass
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Unlimited Customers & Visits
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Save Rs. 3,980 per year
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Priority Merchant Support
                  </li>
                </ul>
              </div>
              <Link
                href="/merchant/login"
                className="w-full bg-[#00875A] hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl text-center transition shadow-sm block"
              >
                Get Started with Free Trial
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="py-6 px-4 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <ShieldCheck size={16} className="text-[#00875A]" />
            <span>Retcash Loyalty System &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4 text-xs font-semibold text-slate-400">
            <Link href="/merchant/login" className="hover:text-slate-600">Merchant Portal</Link>
            <Link href="/customer/login" className="hover:text-slate-600">Customer Wallet</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}