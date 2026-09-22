'use client';

import { useEffect, useState } from 'react';
import { getAllStoresWithSubscriptions, renewStoreSubscription, Store } from '@/lib/adminService';

export default function AdminSubscriptionsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStoreId, setUpdatingStoreId] = useState<string | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

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
      setUpdatingStoreId(storeId);
      await renewStoreSubscription(storeId, months, plan);
      alert('வெற்றிகரமாக புதுப்பிக்கப்பட்டது!');
      await loadStores();
    } catch (err: any) {
      alert('பிழை: ' + err.message);
    } finally {
      setUpdatingStoreId(null);
    }
  }

  if (loading) return <div className="p-8">ஏற்றப்படுகிறது...</div>;

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-2">சப்ஸ்கிரிப்ஷன் நிர்வாகம் (Admin Panel)</h1>
      <p className="text-gray-600 mb-6">கடை சப்ஸ்கிரிப்ஷன்களை மேனுவலாகப் புதுப்பிக்கலாம்.</p>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3 border">கடை பெயர்</th>
            <th className="p-3 border">போன் எண்</th>
            <th className="p-3 border">பிளான்</th>
            <th className="p-3 border">நிலை</th>
            <th className="p-3 border">முடிவடையும் தேதி</th>
            <th className="p-3 border">செயல்பாடு</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => (
            <tr key={store.id} className="border-b">
              <td className="p-3 border font-semibold">{store.store_name}</td>
              <td className="p-3 border">{store.phone_number}</td>
              <td className="p-3 border">{store.plan_type || 'N/A'}</td>
              <td className="p-3 border">
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
              <td className="p-3 border">
                {store.trial_ends_at
                  ? new Date(store.trial_ends_at).toLocaleDateString()
                  : 'N/A'}
              </td>
              <td className="p-3 border gap-2 flex">
                <button
                  disabled={updatingStoreId === store.id}
                  onClick={() => handleRenew(store.id, 1, 'monthly')}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  +1 மாதம் (Monthly)
                </button>
                <button
                  disabled={updatingStoreId === store.id}
                  onClick={() => handleRenew(store.id, 12, 'yearly')}
                  className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  +1 வருடம் (Yearly)
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}