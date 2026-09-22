'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAllStoresWithSubscriptions, renewStoreSubscription, Store } from '@/lib/adminService';

// 🔒 உங்கள் பிரத்யேக Admin Email
const MY_ADMIN_EMAIL = 'retcashdigital@gmail.com';

export default function AdminSubscriptionsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      // 1. தற்போதைய பயனரின் லாக் இன் விவரங்களை சரிபார்த்தல்
      const { data: { session } } = await supabase.auth.getSession();

      // 2. பயனர் லாக் இன் செய்யவில்லை என்றாலோ அல்லது அவர் retcashdigital@gmail.com இல்லை என்றாலோ தடுக்கப்படும்
      if (!session || session.user.email !== MY_ADMIN_EMAIL) {
        alert('உங்களுக்கு இந்த Admin பக்கத்தை அணுக அனுமதி இல்லை!');
        router.push('/merchant/login');
        return;
      }

      setAuthorized(true);
      await loadStores();
    } catch (err: any) {
      alert('பாதுகாப்புச் சோதனையில் பிழை: ' + err.message);
      router.push('/merchant/login');
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
      <h1 className="text-2xl font-bold mb-2">சப்ஸ்கிரிப்ஷன் நிர்வாகம் (Admin Panel)</h1>
      <p className="text-gray-400 mb-6">retcashdigital@gmail.com கணக்கிற்கு மட்டுமே அணுகல் உள்ளது.</p>

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