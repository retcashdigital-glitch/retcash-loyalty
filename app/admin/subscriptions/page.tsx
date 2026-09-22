'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllStoresWithSubscriptions, renewStoreSubscription, Store } from '@/lib/adminService';

export default function AdminSubscriptionsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  function checkAdminAccess() {
    try {
      // 1. அட்மின் லாக் இன் செய்து Cookie / LocalStorage அமைக்கப்பட்டுள்ளதா எனச் சரிபார்த்தல்
      const isAuth = localStorage.getItem('admin_auth');

      // லாக் இன் செய்யப்படவில்லை என்றால் பிரத்யேக /admin/login பக்கத்திற்குத் திருப்பிவிடுதல்
      if (isAuth !== 'true') {
        router.push('/admin/login');
        return;
      }

      setAuthorized(true);
      loadStores();
    } catch (err: any) {
      alert('பாதுகாப்புச் சோதனையில் பிழை: ' + err.message);
      router.push('/admin/login');
    }
  }

  async function loadStores() {
    try {
      setLoading(true);
      const data = await getAllStoresWithSubscriptions();
      setStores(data);
    } catch (err: any) {
      alert('பிழை: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRenew(storeId: string, months: number, plan: string) {
    if (!confirm(`${months} மாதத்திற்குச் சப்ஸ்கிரிப்ஷனை நீட்டிக்கவா?`)) return;

    try {
      await renewStoreSubscription(storeId, months, plan);
      alert('வெற்றிகரமாக புதுப்பிக்கப்பட்டது!');
      await loadStores();
    } catch (err: any) {
      alert('பிழை: ' + err.message);
    }
  }

  // அட்மின் கணக்கிலிருந்து வெளியேற (Logout)
  function handleLogout() {
    localStorage.removeItem('admin_auth');
    document.cookie = "admin_authenticated=; path=/; max-age=0";
    router.push('/admin/login');
  }

  // Admin இல்லை என்றால் பக்கத்தைக் காட்ட வேண்டாம்
  if (!authorized) {
    return (
      <div className="p-8 text-center font-bold text-red-500 bg-gray-900 min-h-screen flex items-center justify-center">
        பாதுகாப்புச் சோதனை செய்யப்படுகிறது... (Access Denied for Non-Admins)
      </div>
    );
  }

  if (loading) return <div className="p-8 text-white bg-gray-900 min-h-screen">ஏற்றப்படுகிறது...</div>;

  return (
    <div className="p-8 font-sans bg-gray-900 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">சப்ஸ்கிரிப்ஷன் நிர்வாகம் (Admin Panel)</h1>
          <p className="text-gray-400">அட்மின் கணக்கில் வெற்றிகரமாக லாக் இன் செய்யப்பட்டுள்ளீர்கள்.</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition duration-200"
        >
          Logout
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-700">
          <thead>
            <tr className="bg-gray-800 text-left">
              <th className="p-3 border border-gray-700">கடை பெயர்</th>
              <th className="p-3 border border-gray-700">போன் எண்</th>
              <th className="p-3 border border-gray-700">பிளான்</th>
              <th className="p-3 border border-gray-700">நிலை</th>
              <th className="p-3 border border-gray-700">முடிவடையும் தேதி</th>
              <th className="p-3 border border-gray-700">செயல்பாடு</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="border-b border-gray-700 hover:bg-gray-800">
                <td className="p-3 border border-gray-700 font-semibold">{store.store_name}</td>
                <td className="p-3 border border-gray-700">{store.phone_number}</td>
                <td className="p-3 border border-gray-700">{store.plan_type || 'N/A'}</td>
                <td className="p-3 border border-gray-700">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold text-white ${
                      store.subscription_status === 'active'
                        ? 'bg-green-600'
                        : store.subscription_status === 'trialing'
                        ? 'bg-amber-500'
                        : 'bg-red-600'
                    }`}
                  >
                    {store.subscription_status}
                  </span>
                </td>
                <td className="p-3 border border-gray-700">
                  {store.trial_ends_at
                    ? new Date(store.trial_ends_at).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td className="p-3 border border-gray-700 gap-2 flex">
                  <button
                    onClick={() => handleRenew(store.id, 1, 'monthly')}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    +1 மாதம் (Monthly)
                  </button>
                  <button
                    onClick={() => handleRenew(store.id, 12, 'yearly')}
                    className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700"
                  >
                    +1 வருடம் (Yearly)
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}