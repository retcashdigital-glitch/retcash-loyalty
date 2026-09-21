'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import bcrypt from 'bcryptjs';

export default function CustomerLoginPage() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setMessage] = useState('');
    const router = useRouter();

    const normalizePhone = (input: string) => {
        let cleaned = input.replace(/\D/g, '');

        if (cleaned.startsWith('94') && cleaned.length >= 11) {
            cleaned = cleaned.slice(2);
        } else if (cleaned.startsWith('0') && cleaned.length >= 10) {
            cleaned = cleaned.slice(1);
        }

        return cleaned.slice(0, 9);
    };

    // 1. Auto-Login Check: ஏற்கனவே லாகின் செய்திருந்தால் நேரடியாக வாலட் பக்கத்திற்கு அனுப்பும்
    useEffect(() => {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('retcash_wallet_session_')) {
                    const dbPhone = key.replace('retcash_wallet_session_', '');
                    const isAuth = localStorage.getItem(`retcash_wallet_auth_${dbPhone}`);
                    if (isAuth === 'true') {
                        router.push(`/wallet/${dbPhone}`);
                        break;
                    }
                }
            }
        } catch (e) {
            console.error("Session check error:", e);
        }
    }, [router]);

    // Safe Base64 decoding helper for older accounts
    const safeBtoa = (str: string) => {
        try {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
        } catch {
            return str;
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const formattedPhone = normalizePhone(phone);
        if (formattedPhone.length !== 9) {
            setMessage('Please enter a valid phone number.');
            setLoading(false);
            return;
        }

        const dbPhone = `94${formattedPhone}`;
        const phoneWithZero = `0${formattedPhone}`;
        const inputPass = password.trim();

        try {
            // Check for matching customer phone formats (+94 or 07X)
            const { data: customer, error: fetchError } = await supabase
                .from('customers')
                .select('*')
                .or(`phone_number.eq.${dbPhone},phone_number.eq.${phoneWithZero}`)
                .maybeSingle();

            // 2. Smart Redirect: பயனர் கணக்கு இல்லை என்றால் Register பக்கத்திற்கு அனுப்பிவைக்கும்
            if (fetchError || !customer) {
                setMessage('கணக்கு எதுவுமில்லை! உங்களை Register பக்கத்திற்கு மாற்றுகிறோம்...');
                setTimeout(() => {
                    router.push(`/customer/register?phone=${formattedPhone}`);
                }, 1800);
                return;
            }

            // Validate password hashes
            const storedPass = customer.password ? customer.password.trim() : '';
            let isPasswordCorrect = false;

            if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$')) {
                isPasswordCorrect = await bcrypt.compare(inputPass, storedPass);
            } else {
                const base64Pass = safeBtoa(inputPass);
                isPasswordCorrect = storedPass === inputPass || storedPass === base64Pass;
            }

            if (!isPasswordCorrect) {
                setMessage('Invalid phone number or password.');
                setLoading(false);
                return;
            }

            // Establish customer wallet session
            localStorage.setItem(`retcash_wallet_session_${dbPhone}`, 'true');
            localStorage.setItem(`retcash_wallet_auth_${dbPhone}`, 'true');
            localStorage.setItem(`customer_name_${dbPhone}`, customer.full_name || '');

            router.push(`/wallet/${dbPhone}`);

        } catch (err) {
            console.error("Login Error:", err);
            setMessage('Invalid phone number or password.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-between p-4 font-sans selection:bg-[#00875A] selection:text-white">
            <div className="pt-2"></div>

            {/* Single Unified Clean White Card */}
            <div className="bg-white w-full max-w-md rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 md:p-8 border border-slate-100 relative my-auto space-y-6">
                
                {/* Header Brand Logo & Title */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] mb-3 p-2.5">
                        <Image 
                            src="/logo.png" 
                            alt="RETCASH Logo" 
                            width={48} 
                            height={48} 
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase">
                        RET<span className="text-[#00875A]">CASH</span>
                    </h1>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Access your customer wallet</p>
                </div>

                {error && (
                    <div className={`p-3 border text-xs rounded-xl text-center font-bold ${
                        error.includes('Register') 
                            ? 'bg-amber-50 border-amber-200 text-amber-700' 
                            : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Phone Number Field */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Phone Number
                        </label>
                        <div className="flex items-center w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus-within:border-[#00875A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00875A]/20 transition">
                            <span className="text-slate-500 font-bold text-sm pr-2 border-r border-slate-300">+94</span>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0771234567 or 771234567"
                                required
                                maxLength={12}
                                className="w-full bg-transparent pl-3 focus:outline-none text-slate-900 text-sm font-semibold"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Password
                            </label>
                            <Link href="/customer/forgot-password" className="text-xs font-bold text-[#00875A] hover:underline">
                                Forgot?
                            </Link>
                        </div>
                        <div className="relative flex items-center w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus-within:border-[#00875A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00875A]/20 transition">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full bg-transparent pr-8 focus:outline-none text-slate-900 text-sm font-semibold"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#00875A] hover:bg-[#059669] text-white font-extrabold py-3.5 rounded-xl shadow-md shadow-[#00875A]/25 transition active:scale-[0.98] duration-200 text-xs uppercase tracking-wider mt-2 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? 'Processing...' : 'Login'}
                    </button>
                </form>

                <div className="text-center text-xs text-slate-500 font-medium">
                    Don't have an account?{' '}
                    <Link href="/customer/register" className="text-[#00875A] font-extrabold hover:underline">
                        Register here
                    </Link>
                </div>
            </div>

            {/* Bottom Footer */}
            <div className="py-6 text-center text-[10px] text-slate-400 font-bold tracking-wider uppercase space-y-1">
                <p>©️ 2026 RETCASH DIGITAL LOYALTY PLATFORM. ALL RIGHTS RESERVED.</p>
            </div>
        </div>
    );
}