'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 🔒 நீங்கள் மட்டுமே பயன்படுத்தும் பிரத்யேக ரகசிய கடவுச்சொல் (Secret Admin Password)
// இதை உங்களுக்குப் பிடித்தவாறு மாற்றிக் கொள்ளுங்கள்
const HARDCODED_ADMIN_PASSWORD = 'MySuperSecretAdminPass123#'; 

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. நீங்கள் டைப் செய்த பாஸ்வேர்ட், நமது ரகசிய பாஸ்வேர்ட்டுடன் பொருந்துகிறதா எனச் சரிபார்த்தல்
    if (password === HARDCODED_ADMIN_PASSWORD) {
      // பிரவுசர் நினைவகத்தில் (Cookie / LocalStorage) அட்மின் லாக் இன் தகவலைச் சேமித்தல்
      document.cookie = "admin_authenticated=true; path=/; max-age=86400"; // 1 நாள் செல்லுபடியாகும்
      localStorage.setItem('admin_auth', 'true');

      alert('Admin Login வெற்றிகரமானது!');
      router.push('/admin/subscriptions');
    } else {
      alert('பிழை: தவறான அட்மின் கடவுச்சொல் (Access Denied)!');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center text-emerald-500 mb-2">
          Retcash Admin Console
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          அட்மின் பக்கத்திற்கான பிரத்யேக நுழைவு வாயில்
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
              Secret Admin Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold py-2.5 rounded-lg transition duration-200 text-white"
          >
            {loading ? 'சரிபார்க்கப்படுகிறது...' : 'Admin Console நுழைக'}
          </button>
        </form>
      </div>
    </div>
  );
}