'use client'

import Link from 'next/link'
import { 
  Store, 
  Wallet, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  TrendingUp, 
  Users, 
  QrCode 
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
              <Sparkles size={14} className="text-[#00875A]" />
              <span className="text-xs font-bold text-[#00875A] uppercase tracking-wider">
                Next-Gen Customer Loyalty System
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

      {/* 3. MERCHANT SUBSCRIPTION PLANS */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-12 sm:py-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-extrabold text-[#00875A] uppercase tracking-wider bg-[#ECFDF5] px-3 py-1 rounded-full border border-emerald-200/60">
              Merchant Plans
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Simple Pricing for Every Business
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Choose the right plan to power your store loyalty program and boost revenue.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Starter Plan */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Starter</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Ideal for small single stores</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  Rs. 0 <span className="text-xs font-semibold text-slate-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Up to 100 Customers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Basic Visit Stamp Tracker
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Digital QR Pass
                  </li>
                </ul>
              </div>
              <Link
                href="/merchant/login"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs py-3 rounded-2xl text-center transition block"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan - Highlighted */}
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-[#00875A] relative flex flex-col justify-between space-y-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00875A] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                Most Popular
              </div>
              <div className="space-y-4 pt-1">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Pro Merchant</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">For growing retail shops & cafes</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  Rs. 2,990 <span className="text-xs font-semibold text-slate-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Unlimited Customers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Automated Cashback Engine
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Store Offers & Deals Banner
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Detailed Customer Analytics
                  </li>
                </ul>
              </div>
              <Link
                href="/merchant/login"
                className="w-full bg-[#00875A] hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl text-center transition shadow-sm block"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Enterprise</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">For multi-branch retail chains</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  Custom
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Multi-Branch Management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Custom POS System Integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00875A]" /> Dedicated Account Manager
                  </li>
                </ul>
              </div>
              <Link
                href="/merchant/login"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs py-3 rounded-2xl text-center transition block"
              >
                Contact Sales
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