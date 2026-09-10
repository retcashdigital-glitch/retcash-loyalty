'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Wallet } from 'lucide-react';
import Link from 'next/link';
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

    // Unicode safe Base64 helper (பழைய கணக்குகளின் இணக்கத்தன்மைக்காக)
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
            // 1. தேடலில் +94 மற்றும் 07X என இரண்டு வடிவங்களையும் சரிபார்க்கும் நெகிழ்வுத்தன்மை
            const { data: customer, error: fetchError } = await supabase
                .from('customers')
                .select('*')
                .or(`phone_number.eq.${dbPhone},phone_number.eq.${phoneWithZero}`)
                .maybeSingle();

            if (fetchError || !customer) {
                setMessage('Invalid phone number or password.');
                setLoading(false);
                return;
            }

            // 2. பாஸ்வேர்ட் சரிபார்த்தல் (Bcrypt Hash, Plain Text, மற்றும் பழைய Base64)
            const storedPass = customer.password ? customer.password.trim() : '';
            let isPasswordCorrect = false;

            // அ) Bcrypt Hash ஒப்பீடு
            if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$')) {
                isPasswordCorrect = await bcrypt.compare(inputPass, storedPass);
            } else {
                // ஆ) பழைய முறையில் சேமிக்கப்பட்ட Plain Text / Base64 ஒப்பீடு
                const base64Pass = safeBtoa(inputPass);
                isPasswordCorrect = storedPass === inputPass || storedPass === base64Pass;
            }

            if (!isPasswordCorrect) {
                setMessage('Invalid phone number or password.');
                setLoading(false);
                return;
            }

            // 3. Success Log In - Set exact session keys
            localStorage.setItem(`retcash_wallet_session_${dbPhone}`, 'true');
            localStorage.setItem(`retcash_wallet_auth_${dbPhone}`, 'true');
            localStorage.setItem(`customer_name_${dbPhone}`, customer.full_name || '');

            // Redirecting to wallet route
            router.push(`/customer/wallet/${dbPhone}`);

        } catch (err) {
            console.error("Login Error:", err);
            setMessage('Invalid phone number or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            {/* Top Header with Logo */}
            <div className="w-full max-w-md bg-gray-300 py-3 px-4 rounded-t-xl flex items-center justify-center space-x-2 shadow-sm mb-[-10px] z-10">
                <div className="bg-orange-500 p-1.5 rounded-lg flex items-center justify-center text-white shadow">
                    <Wallet className="w-5 h-5" />
                </div>
                <span className="font-bold tracking-wider text-gray-800 text-lg">
                    RET<span className="text-orange-600">CASH</span>
                </span>
            </div>

            {/* Main Card */}
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 pt-10 border border-gray-100 relative z-20">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-md mb-3 text-white">
                        <Wallet className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wide text-gray-900">
                        RET<span className="text-orange-500">CASH</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Access your customer wallet</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Phone Number Field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                            Phone Number
                        </label>
                        <div className="flex items-center w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-orange-500 transition">
                            <span className="text-gray-500 font-medium text-sm pr-2 border-r border-gray-300">+94</span>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0771234567 or 771234567"
                                required
                                maxLength={12}
                                className="w-full bg-transparent pl-3 focus:outline-none text-gray-800 text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Password
                            </label>
                            <Link href="/customer/forgot-password" className="text-xs font-semibold text-orange-600 hover:underline">
                                Forgot?
                            </Link>
                        </div>
                        <div className="relative flex items-center w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-orange-500 transition">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full bg-transparent pr-8 focus:outline-none text-gray-800 text-sm font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/30 transition duration-200 text-sm tracking-wide mt-2 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="text-center mt-6 text-xs text-gray-500">
                    Don't have an account?{' '}
                    <Link href="/customer/register" className="text-orange-600 font-bold hover:underline">
                        Register here
                    </Link>
                </div>
            </div>
        </div>
    );
}