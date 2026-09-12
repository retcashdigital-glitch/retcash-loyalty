'use client'

import Link from 'next/link'
import { WalletCards, LogIn, UserPlus, ArrowRight } from 'lucide-react'

export default function MerchantMainPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans text-slate-800">
      
      {/* Brand Header */}
      <div className="mb-8 text-center space-y-2">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#00875A] text-white shadow-lg mx-auto mb-3">
          <WalletCards className="size-7" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Retcash Merchant Portal</h1>
        <p className="text-sm text-slate-500 font-medium">உங்களின் வணிகத்தை எளிதாக நிர்வகிக்க உள்நுழையவும்</p>
      </div>

      {/* Choice Options */}
      <div className="w-full max-w-sm space-y-4">
        
        {/* Login Option */}
        <Link 
          href="/merchant/login"
          className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-[#00875A] transition group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-[#00875A] group-hover:bg-[#00875A] group-hover:text-white transition">
              <LogIn className="size-6" />
            </div>
            <div className="text-left">
              <h2 className="font-bold text-slate-900 text-base">Login</h2>
              <p className="text-xs text-slate-500">ஏற்கனவே கணக்கு உள்ளது</p>
            </div>
          </div>
          <ArrowRight className="size-5 text-slate-400 group-hover:text-[#00875A] group-hover:translate-x-1 transition" />
        </Link>

        {/* Register Option */}
        <Link 
          href="/merchant/register"
          className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-[#00875A] transition group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-xl text-slate-700 group-hover:bg-[#00875A] group-hover:text-white transition">
              <UserPlus className="size-6" />
            </div>
            <div className="text-left">
              <h2 className="font-bold text-slate-900 text-base">Register</h2>
              <p className="text-xs text-slate-500">புதிய கடையைப் பதிவு செய்ய</p>
            </div>
          </div>
          <ArrowRight className="size-5 text-slate-400 group-hover:text-[#00875A] group-hover:translate-x-1 transition" />
        </Link>

      </div>

    </div>
  )
}