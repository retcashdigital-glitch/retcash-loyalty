'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'retcashdigital@gmail.com';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. உள்ளீடு செய்த ஈமெயில் அட்மின் ஈமெயிலா என முதலில் சரிபார்த்தல்
      if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        alert('பிழை: இந்த மின்னஞ்சலுக்கு அட்மின் அனுமதி இல்லை!');
        setLoading(false);
        return;
      }

      // 2. Supabase Server-side Auth மூலம் லாக் இன் செய்தல்
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw new Error('தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்!');
      }

      // 3. லாக் இன் செய்த பயனரின் ஈமெயிலை சர்வர் டோக்கனிலிருந்து உறுதிசெய்தல்
      if (data.user && data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        alert('Admin Login வெற்றிகரமானது!');
        router.push('/admin/subscriptions');
      } else {
        await supabase.auth.signOut();
        alert('அணுகல் தடையிடப்பட்டது: நீங்கள் அட்மின் கிடையாது!');
      }
    } catch (err: any) {
      alert('லாக் இன் செய்வதில் பிழை: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center text-emerald-500 mb-2">
          Retcash Admin Portal
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          உயர் பாதுகாப்பு வசதியுடன் கூடிய அட்மின் முனையம்
        </p>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="retcashdigital@gmail.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Admin Password
            </label>

            {/* Password Input + Eye Icon */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-emerald-500"
              />

              {/* Eye Icon Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
              >
                {showPassword ? (
                  // Eye Off Icon
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Eye Icon
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.064-7-9.542-7-4.477 0-8.268 2.943-9.542 7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold py-2.5 rounded-lg transition duration-200 text-white disabled:opacity-50"
          >
            {loading ? 'பாதுகாப்புச் சோதனை செய்யப்படுகிறது...' : 'Admin Console நுழைக'}
          </button>
        </form>
      </div>
    </div>
  );
}