'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// கடவுச்சொல்லை பாதுகாப்பாக Crypto Hash செய்வதற்கான ஃபங்ஷன் (SHA-256)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'RETCASH_ADMIN_SALT_2026'); // Extra Secret Salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 🔒 பாதுகாப்பு அம்சங்கள் (Attempts & Lockout State)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // லோக்கல் மெமரியில் பிளாக் செய்யப்பட்டிருக்கிறாரா எனச் சரிபார்த்தல்
    const blockedStatus = localStorage.getItem('admin_blocked') === 'true';
    const attempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0', 10);

    if (blockedStatus || attempts >= 3) {
      setIsBlocked(true);
    } else {
      setFailedAttempts(attempts);
    }

    checkPasswordSetup();
  }, []);

  // 📧 retcashdigital@gmail.com-க்கு மின்னஞ்சல் எச்சரிக்கை அனுப்பும் ஃபங்ஷன்
  async function sendSecurityAlertEmail(reason: string, failedCount: number) {
    try {
      // API Route மூலம் மின்னஞ்சல் அனுப்பும் அழைப்பு (Optional Backend Route call)
      await fetch('/api/admin-security-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'retcashdigital@gmail.com',
          reason: reason,
          attempts: failedCount,
          time: new Date().toLocaleString('ta-IN'),
          userAgent: navigator.userAgent,
        }),
      });
    } catch (err) {
      console.log('Email Alert Send Error:', err);
    }
  }

  // Supabase-இல் பாஸ்வேர்ட் ஏற்கனவே அமைக்கப்பட்டுள்ளதா எனச் சரிபார்க்கிறது
  async function checkPasswordSetup() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_password_hash')
        .single();

      if (error || !data) {
        setIsFirstTime(true); // பாஸ்வேர்ட் இல்லை என்றால் முதல் முறை
      } else {
        setIsFirstTime(false); // ஏற்கனவே பாஸ்வேர்ட் அமைக்கப்பட்டுவிட்டது
      }
    } catch (err) {
      setIsFirstTime(true);
    } finally {
      setLoading(false);
    }
  }

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlocked) {
      alert('பாதுகாப்பு காரணங்களுக்காக இந்தச் சாதனம் முடக்கப்பட்ட உள்ளது!');
      return;
    }

    setSubmitting(true);

    try {
      const hashedPassword = await hashPassword(password);

      if (isFirstTime) {
        // --- 1. முதல் முறை: புதிய பாஸ்வேர்ட் அமைத்தல் ---
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

        // Supabase-இல் பாதுகாப்பாக Hash செய்து சேமித்தல்
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: 'admin_password_hash', value: hashedPassword });

        if (error) throw error;

        alert('அட்மின் கடவுச்சொல் வெற்றிகரமாக அமைக்கப்பட்டது!');

        // Auth Cookie & LocalStorage
        document.cookie = 'admin_authenticated=true; path=/; max-age=86400';
        localStorage.setItem('admin_auth', 'true');
        router.push('/admin/subscriptions');
      } else {
        // --- 2. அடுத்தடுத்த முறைகள்: பாஸ்வேர்ட் சரிபார்த்தல் ---
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'admin_password_hash')
          .single();

        if (error || !data) {
          alert('பிழை: கடவுச்சொல் தரவுத்தளத்தில் இல்லை!');
          setSubmitting(false);
          return;
        }

        // Hash ஒப்பீடு செய்தல்
        if (data.value === hashedPassword) {
          alert('Admin Login வெற்றிகரமானது!');
          
          // வெற்றி பெற்றவுடன் முயற்சிகள் ரீசெட் செய்யப்படும்
          localStorage.setItem('admin_failed_attempts', '0');
          document.cookie = 'admin_authenticated=true; path=/; max-age=86400';
          localStorage.setItem('admin_auth', 'true');
          router.push('/admin/subscriptions');
        } else {
          // ⚠️ தவறான பாஸ்வேர்ட் உள்ளீடு
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          localStorage.setItem('admin_failed_attempts', newAttempts.toString());

          // 🚨 மெயிலுக்கு எச்சரிக்கை அனுப்புதல்
          sendSecurityAlertEmail('தவறான அட்மின் கடவுச்சொல் உள்ளீடு செய்ய முயற்சி', newAttempts);

          if (newAttempts >= 3) {
            // ❌ 3 முறை தவறாகப் போட்டால் முடக்குதல் (Lock Out)
            setIsBlocked(true);
            localStorage.setItem('admin_blocked', 'true');
            sendSecurityAlertEmail('அதிகபட்ச தவறான முயற்சிகள்! அட்மின் பக்கம் முடக்கம் செய்யப்பட்டது.', newAttempts);
            alert('அதிகபட்ச தவறான முயற்சிகள்! பாதுகாப்பு காரணங்களுக்காக இந்த அட்மின் பக்கம் முடக்கப்பட்டுள்ளது.');
          } else {
            alert(`பிழை: தவறான அட்மின் கடவுச்சொல்! (மீதமுள்ள முயற்சிகள்: ${3 - newAttempts})`);
          }
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
        பாதுகாப்பு அமைப்பு சரிபார்க்கப்படுகிறது...
      </div>
    );
  }

  // 🛑 பக்கம் முடக்கப்பட்டிருந்தால் (Blocked View)
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-red-950/40 border border-red-800/80 rounded-xl p-8 text-center shadow-2xl backdrop-blur">
          <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">அணுகல் முடக்கப்பட்டது (Access Blocked)</h2>
          <p className="text-gray-300 text-sm mb-4">
            அதிகப்படியான தவறான கடவுச்சொல் முயற்சிகள் காரணமாக இந்த அட்மின் பக்கம் பாதுகாப்பிற்காக முடக்கப்பட்டுள்ளது.
          </p>
          <p className="text-xs text-red-300/80 bg-red-900/30 p-3 rounded-lg border border-red-800/40">
            🚨 எச்சரிக்கை மின்னஞ்சல் <span className="font-semibold text-white">retcashdigital@gmail.com</span> முகவரிக்கு அனுப்பப்பட்டுள்ளது.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
      {/* Autofill மஞ்சள் நிறத்தை தடுப்பதற்கான CSS Style Injection */}
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #1f2937 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center text-emerald-500 mb-2">
          Retcash Admin Console
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          {isFirstTime
            ? 'அட்மின் கடவுச்சொல்லை முதன்முறையாக அமைக்கவும்'
            : 'அட்மின் பிரத்யேக நுழைவு வாயில்'}
        </p>

        <form onSubmit={handleAdminAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              {isFirstTime ? 'புதிய Admin Password உருவாக்கவும்' : 'Admin Password'}
            </label>

            {/* Password Input + Eye Icon */}
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pr-12 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />

              {/* Eye Icon Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1.5 text-gray-400 hover:text-white cursor-pointer select-none focus:outline-none z-10"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  // Eye Off Icon (மறைக்க)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 pointer-events-none"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  // Eye Icon (பார்க்க)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 pointer-events-none"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.064-7-9.542-7-4.477 0-8.268 2.943-9.542 7z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
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
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pr-12 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 p-1.5 text-gray-400 hover:text-white cursor-pointer select-none focus:outline-none z-10"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 pointer-events-none">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 pointer-events-none">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.064-7-9.542-7-4.477 0-8.268 2.943-9.542 7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold py-2.5 rounded-lg transition duration-200 text-white disabled:opacity-50 cursor-pointer"
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