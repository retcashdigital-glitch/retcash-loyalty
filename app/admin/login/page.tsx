'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkPasswordSetup();
  }, []);

  // Supabase-இல் ஏற்கனவே அட்மின் பாஸ்வேர்ட் அமைக்கப்பட்டுள்ளதா எனச் சரிபார்க்கிறது
  async function checkPasswordSetup() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_password')
        .single();

      if (error || !data) {
        // பாஸ்வேர்ட் அமைக்கப்படவில்லை என்றால் முதல் முறை (First Time Setup)
        setIsFirstTime(true);
      } else {
        setIsFirstTime(false);
      }
    } catch (err) {
      setIsFirstTime(true);
    } finally {
      setLoading(false);
    }
  }

  // பாஸ்வேர்ட் சரிபார்த்தல் அல்லது உருவாக்குதல்
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isFirstTime) {
        // --- முதல் முறை: புதிய பாஸ்வேர்ட் அமைத்தல் ---
        if (password.length < 6) {
          alert('கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்!');
          setSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          alert('இரண்டு கடவுச்சொற்களும் பொருத்துப் போகவில்லை!');
          setSubmitting(false);
          return;
        }

        // Supabase-இல் சேமித்தல்
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: 'admin_password', value: password });

        if (error) throw error;

        alert('அட்மின் கடவுச்சொல் வெற்றிகரமாக அமைக்கப்பட்டது!');
        
        // லாக் இன் ஆதாரம் சேமித்தல்
        document.cookie = "admin_authenticated=true; path=/; max-age=86400";
        localStorage.setItem('admin_auth', 'true');
        router.push('/admin/subscriptions');

      } else {
        // --- அடுத்தடுத்த முறைகள்: பழைய பாஸ்வேர்ட்டைச் சரிபார்த்தல் ---
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'admin_password')
          .single();

        if (error || !data) {
          alert('பிழை: கடவுச்சொல் தரவுத்தளத்தில் இல்லை!');
          setSubmitting(false);
          return;
        }

        if (data.value === password) {
          alert('Admin Login வெற்றிகரமானது!');
          document.cookie = "admin_authenticated=true; path=/; max-age=86400";
          localStorage.setItem('admin_auth', 'true');
          router.push('/admin/subscriptions');
        } else {
          alert('பிழை: தவறான அட்மின் கடவுச்சொல் (Access Denied)!');
        }
      }
    } catch (err: any) {
      alert('பிழை ஏற்பட்டது: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans">
        சரிபார்க்கப்படுகிறது...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center text-emerald-500 mb-2">
          Retcash Admin Console
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          {isFirstTime ? 'அட்மின் கடவுச்சொல்லை முதன்முறையாக அமைக்கவும்' : 'அட்மின் பிரத்யேக நுழைவு வாயில்'}
        </p>

        <form onSubmit={handleAdminAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              {isFirstTime ? 'புதிய Admin Password உருவாக்கவும்' : 'Admin Password'}
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
                  // Eye Off Icon (மறைக்க)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Eye Icon (பார்க்க)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.064-7-9.542-7-4.477 0-8.268 2.943-9.542 7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* முதல்முறை மட்டும் Confirm Password கேட்கப்படும் */}
          {isFirstTime && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold py-2.5 rounded-lg transition duration-200 text-white disabled:opacity-50"
          >
            {submitting
              ? 'செயலாக்கப்படுகிறது...'
              : isFirstTime
              ? 'கடவுச்சொல்லைச் சேமித்து நுழைக'
              : 'Admin Console நுழைக'}
          </button>
        </form>
      </div>
    </div>
  );
}