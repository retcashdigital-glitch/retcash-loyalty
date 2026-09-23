'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CustomerLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/customer/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password: password.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid email or password.');
            }

            // Save Session for Persistence
            if (data.customer) {
                localStorage.setItem('customer_card_id', data.customer.id);
                localStorage.setItem('customer_phone', data.customer.phone_number || '');
            }

            setMessage('Login successful! Redirecting to your card...');

            setTimeout(() => {
                router.push(`/card/${data.customer.id}`);
            }, 1200);

        } catch (err: any) {
            setError(err.message || 'Failed to login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 font-sans text-[#0F172A]">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl space-y-6">
                
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-md mx-auto mb-3 p-2">
                        <Image src="/logo.png" alt="RETCASH" width={48} height={48} className="object-contain" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wider text-[#00875A] uppercase">RETCASH</h1>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Customer Login</h2>
                    <p className="text-xs text-slate-500">Enter your credentials to access your digital card</p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-600">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {message && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-[#00875A]">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-900 outline-none focus:border-[#00875A]"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-[10px] font-bold uppercase text-slate-500">Password</label>
                            <Link href="/customer/forgot-password" className="text-[11px] font-semibold text-[#00875A] hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-900 outline-none focus:border-[#00875A]"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-[#00875A] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#059669] transition disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                <div className="text-center pt-2 text-xs">
                    <span className="text-slate-500">Don't have a card yet? </span>
                    <Link href="/customer/register" className="font-bold text-[#00875A] hover:underline">Register Now</Link>
                </div>

            </div>
        </div>
    );
}