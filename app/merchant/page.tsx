'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogIn, UserPlus, ArrowRight } from 'lucide-react'

export default function MerchantMainPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between items-center p-4 font-sans text-slate-800 selection:bg-[#00875A] selection:text-white">
      
      <div className="pt-4"></div>

      {/* Main Content Card Wrapper */}
      <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xl relative my-auto">
        
        {/* Brand Header with Logo */}
        <div className="mb-8 text-center space-y-2">
          <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-md shadow-slate-200/60 mx-auto mb-3 p-2">
            <Image 
              src="/logo.png" 
              alt="RETCASH Logo" 
              width={48} 
              height={48} 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-black tracking-wider text-[#00875A] uppercase">
            MERCHANT PORTAL
          </h1>
          <p className="text-xs text-slate-500">
            Sign in to manage your store console or create a new merchant account.
          </p>
        </div>

        {/* Choice Options */}
        <div className="w-full space-y-3.5">
          
          {/* Login Option */}
          <Link 
            href="/merchant/login"
            className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-[#00875A] hover:bg-white transition group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-100/60 rounded-xl text-[#00875A] group-hover:bg-[#00875A] group-hover:text-white transition">
                <LogIn className="size-5" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-slate-900 text-sm">Login</h2>
                <p className="text-[11px] text-slate-500">Access your existing account</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-400 group-hover:text-[#00875A] group-hover:translate-x-1 transition" />
          </Link>

          {/* Register Option */}
          <Link 
            href="/merchant/register"
            className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-[#00875A] hover:bg-white transition group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-slate-200/70 rounded-xl text-slate-700 group-hover:bg-[#00875A] group-hover:text-white transition">
                <UserPlus className="size-5" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-slate-900 text-sm">Register</h2>
                <p className="text-[11px] text-slate-500">Create a new store profile</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-400 group-hover:text-[#00875A] group-hover:translate-x-1 transition" />
          </Link>

        </div>

      </div>

      {/* Footer Copyright */}
      <div className="py-6 text-center text-[10px] text-slate-400 font-extrabold tracking-wider uppercase space-y-1">
        <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
        <p className="text-slate-400/80 font-semibold">Encrypted End-to-End & Supabase Secured Connection</p>
      </div>

    </div>
  )
}