'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function CustomerForgotPasswordPage() {
    // Step state: 1 = Enter Email, 2 = Enter OTP & Reset Password
    const [step, setStep] = useState<1 | 2>(1);
    
    // Form Inputs
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Feedback States
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const router = useRouter();

    // STEP 1: Send OTP via Dedicated Customer API
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            // Updated Endpoint: /api/customer/send-otp
            const response = await fetch('/api/customer/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP verification code.');
            }

            const receivedOtp = data?.data?.otp || data?.otp;
            if (receivedOtp) {
                alert(`[RETCACH SECURE OTP] Your OTP is: ${receivedOtp} (Valid for 5 minutes)`);
            }

            setMessage('Verification OTP has been sent to your email.');
            setStep(2);

        } catch (err: any) {
            setError(err.message || 'An error occurred while sending OTP.');
        } finally {
            setLoading(false);
        }
    };

    // STEP 2: Verify OTP and Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/customer/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    otp,
                    newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password. Please verify your OTP.');
            }

            setMessage('Password reset successful! Redirecting to login...');
            
            setTimeout(() => {
                router.push('/customer/login');
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'An error occurred during password reset.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 font-sans text-[#0F172A] selection:bg-[#EA580C] selection:text-white">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl space-y-6">
                
                {/* Header Section */}
                <div className="text-center space-y-2">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EA580C] text-white mx-auto shadow-md">
                        <KeyRound className="size-6" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wider text-[#EA580C] uppercase">RETCASH</h1>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        {step === 1 ? 'Forgot Password' : 'Reset Password'}
                    </h2>
                    <p className="text-xs text-slate-500">
                        {step === 1 
                            ? 'Enter your registered email to receive a security OTP.' 
                            : 'Enter the 6-digit OTP sent to your email and your new password.'}
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-600">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Success Banner */}
                {message && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                {/* STEP 1: EMAIL INPUT FORM */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                                Registered Email
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-900 outline-none focus:border-[#EA580C] focus:bg-white focus:ring-2 focus:ring-[#EA580C]/20 transition"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Link
                                href="/customer/login"
                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 py-3 text-center text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                                <ArrowLeft className="size-3.5" /> Back
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] rounded-xl bg-[#EA580C] hover:bg-[#d64e05] py-3 text-center text-xs font-bold text-white shadow-md transition disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>
                        </div>
                    </form>
                )}

                {/* STEP 2: OTP & NEW PASSWORD FORM */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                                Verification OTP Code
                            </label>
                            <div className="relative">
                                <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter 6-digit OTP"
                                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3 py-3 text-sm font-mono tracking-widest text-slate-900 outline-none focus:border-[#EA580C] focus:bg-white focus:ring-2 focus:ring-[#EA580C]/20 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                                New Password
                            </label>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#EA580C] focus:bg-white focus:ring-2 focus:ring-[#EA580C]/20 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#EA580C] focus:bg-white focus:ring-2 focus:ring-[#EA580C]/20 transition"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setError('');
                                    setMessage('');
                                }}
                                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 py-3 text-center text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] rounded-xl bg-[#EA580C] hover:bg-[#d64e05] py-3 text-center text-xs font-bold text-white shadow-md transition disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? 'Resetting...' : 'Submit & Reset'}
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}