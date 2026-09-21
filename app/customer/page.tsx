"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCheck, UserPlus, ArrowRight, Wallet } from "lucide-react";

export default function CustomerPortal() {
  const router = useRouter();

  // 1. Auto-Login Check: ஏற்கனவே லாகின் செய்திருந்தால் நேரடியாக Card/Wallet பக்கத்திற்கு அனுப்பிவிடும்
  useEffect(() => {
    const savedCardId = localStorage.getItem("customer_card_id");
    const savedPhone = localStorage.getItem("customer_phone");

    if (savedCardId && savedPhone) {
      router.push(`/card/${savedCardId}`);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-slate-50 p-4 sm:p-6 font-sans">
      {/* Top Bar / Header */}
      <div className="w-full max-w-md flex justify-between items-center py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            R
          </div>
          <span className="font-bold text-gray-800 text-lg tracking-tight">
            Retcash
          </span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
          Customer Portal
        </span>
      </div>

      {/* Main Card Section */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 my-auto my-6">
        {/* Brand Icon & Heading */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-emerald-200">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            CUSTOMER PORTAL
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
            Sign in to access your digital loyalty card or create a new account to earn rewards.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="space-y-4">
          {/* Login Option */}
          <Link
            href="/customer/login"
            className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/60 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-all duration-200 shadow-sm hover:shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                <UserCheck size={22} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-800 group-hover:text-emerald-900 text-base">
                  Login
                </h3>
                <p className="text-xs text-gray-500">
                  Access your existing digital card
                </p>
              </div>
            </div>
            <ArrowRight
              size={18}
              className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-200"
            />
          </Link>

          {/* Register Option */}
          <Link
            href="/customer/register"
            className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/60 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-all duration-200 shadow-sm hover:shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                <UserPlus size={22} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-800 group-hover:text-emerald-900 text-base">
                  Register
                </h3>
                <p className="text-xs text-gray-500">
                  Create a new customer profile
                </p>
              </div>
            </div>
            <ArrowRight
              size={18}
              className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-200"
            />
          </Link>
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="text-center py-4 text-xs text-gray-400">
        <p>© 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
        <p className="mt-1 text-[10px] text-gray-400/80">
          ENCRYPTED END-TO-END & SUPABASE SECURED CONNECTION
        </p>
      </div>
    </div>
  );
}