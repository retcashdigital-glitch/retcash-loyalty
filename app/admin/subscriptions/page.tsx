'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAllStoresWithSubscriptions, renewStoreSubscription, Store } from '@/lib/adminService';

const ADMIN_EMAIL = 'retcashdigital@gmail.com';

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
      // 1. Supabase Auth Session பெறுகிறது
      const { data: { session }, error } = await supabase.auth.getSession();

      // 2. செஷன் இல்லை என்றாலோ அல்லது ஈமெயில் retcashdigital@gmail.com இல்லை என்றாலோ உடனடியாக வெளியேற்றப்படும்
      if (error || !session || session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        await supabase.auth.signOut();
        alert('அணுகல் தடையிடப்பட்டது: உங்களுக்கு இந்த பக்கத்தை அணுக அனுமதி இல்லை!');
        router.push('/admin/login');
        return;
      }

      setAuthorized(true);
      await loadStores();
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
      alert('தரவை ஏற்​ற முடியவில்லை: ' + err.message);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  if (!authorized) {
    return (
      <div className="p-8 text-center font-bold text-red-500 bg-gray-950 min-h-screen flex items-center justify-center">
        பாதுகாப்புச் சோதனை செய்யப்படுகிறது... (Server Authentication Check)
      </div>
    );
  }

  if (loading) return <div className="p-8 text-white bg-gray-950 min-h-screen">ஏற்றப்படுகிறது...</div>;

  return (
    <div className="p-8 font-sans bg-gray-950 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">சப்ஸ்கிரிப்ஷன் நிர்வாகம் (Admin Panel)</h1>
          <p className="text-gray-400 text-sm">retcashdigital@gmail.com கணக்காக லாக் இன் செய்யப்பட்டுள்ளீர்கள்.</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition duration-200"
        >
          Logout
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-800">
          <thead>
            <tr className="bg-gray-900 text-left text-gray-300">
              <th className="p-3 border border-gray-800">கடை பெயர்</th>
              <th className="p-3 border border-gray-800">போன் எண்</th>
              <th className="p-3 border border-gray-800">பிளான்</th>
              <th className="p-3 border border-gray-800">நிலை</th>
              <th className="p-3 border border-gray-800">முடிவடையும் தேதி</th>
              <th className="p-3 border border-gray-800">செயல்பாடு</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="border-b border-gray-800 hover:bg-gray-900">
                <td className="p-3 border border-gray-800 font-semibold">{store.store_name}</td>
                <td className="p-3 border border-gray-800">{store.phone_number}</td>
                <td className="p-3 border border-gray-800">{store.plan_type || 'N/A'}</td>
                <td className="p-3 border border-gray-800">
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
                <td className="p-3 border border-gray-800">
                  {store.trial_ends_at
                    ? new Date(store.trial_ends_at).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td className="p-3 border border-gray-800 gap-2 flex">
                  <button
                    onClick={() => handleRenew(store.id, 1, 'monthly')}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    +1 மாதம்
                  </button>
                  <button
                    onClick={() => handleRenew(store.id, 12, 'yearly')}
                    className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700"
                  >
                    +1 வருடம்
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