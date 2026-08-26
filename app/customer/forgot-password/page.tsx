'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'OTP அனுப்புவதில் தோல்வி ஏற்பட்டது.');
            }

            if (data.data && data.data.otp) {
                alert(`[RETCACH SECURE OTP] Your OTP is: ${data.data.otp} (Valid for 5 minutes)`);
            }

            setMessage('OTP உங்கள் மின்னஞ்சலுக்கு வெற்றிகரமாக அனுப்பப்பட்டது!');

        } catch (err: any) {
            setError(err.message || 'ஏதோ தவறு நடந்துவிட்டது.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0d0f12] px-4 text-white">
            <div className="w-full max-w-md rounded-2xl bg-[#161920] p-8 shadow-xl border border-gray-800">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-wider text-orange-500">RETCACH</h1>
                    <h2 className="text-xl font-semibold mt-2">RESET PASSWORD</h2>
                    <p className="text-sm text-gray-400 mt-1">Set a secure new password for your store.</p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20 text-center">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-500 border border-green-500/20 text-center">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
                            Registered Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full rounded-xl bg-[#0d0f12] border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex space-x-3 pt-2">
                        <Link
                            href="/customer/login"
                            className="w-1/3 rounded-xl border border-gray-700 py-3 text-center text-sm font-semibold text-gray-300 hover:bg-gray-800 transition"
                        >
                            Back
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-2/3 rounded-xl bg-orange-600 py-3 text-center text-sm font-semibold text-white hover:bg-orange-500 transition disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}