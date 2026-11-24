'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode } from 'lucide-react';
import UniversalQrGeneratorModal from '../components/UniversalQrGeneratorModal';

interface Store {
  id: string;
  store_name: string;
  phone_number: string;
  plan_type?: string | null;
  subscription_status: string;
  trial_ends_at?: string | null;
}

export default function AdminSubscriptionsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [updatingStoreId, setUpdatingStoreId] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    verifyAndLoadStores();
  }, []);

  async function verifyAndLoadStores() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_stores' }),
      });

      if (res.status === 401) {
        localStorage.removeItem('admin_auth');
        router.replace('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'தரவுகளைப் பெறுவதில் பிழை');
      }

      setAuthorized(true);
      setStores(data.stores || []);
    } catch (err: any) {
      alert('பிழை: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustMonths(storeId: string, months: number, plan?: string) {
    const label =
      months > 0
        ? `${months} மாதத்திற்குச் சப்ஸ்கிரிப்ஷனை நீட்டிக்கவா?`
        : `${Math.abs(months)} மாதத்தைச் சப்ஸ்கிரிப்ஷனிலிருந்து குறைக்கவா?`;

    if (!confirm(label)) return;

    try {
      setUpdatingStoreId(storeId);
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_months',
          storeId,
          months,
          plan,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem('admin_auth');
        router.replace('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'புதுப்பிப்பதில் பிழை');

      alert('வெற்றிகரமாக புதுப்பிக்கப்பட்டது!');
      await verifyAndLoadStores();
    } catch (err: any) {
      alert('பிழை: ' + err.message);
    } finally {
      setUpdatingStoreId(null);
    }
  }

  async function handleDateChange(storeId: string, newDate: string) {
    if (!newDate) return;
    if (!confirm(`முடிவடையும் தேதியை ${newDate} ஆக மாற்றவா?`)) return;

    try {
      setUpdatingStoreId(storeId);
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_expiry_date',
          storeId,
          date: newDate,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem('admin_auth');
        router.replace('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'தேதியை மாற்றுவதில் பிழை');

      alert('தேதி வெற்றிகரமாக மாற்றப்பட்டது!');
      await verifyAndLoadStores();
    } catch (err: any) {
      alert('பிழை: ' + err.message);
    } finally {
      setUpdatingStoreId(null);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // Continue redirect even if network fails
    }
    localStorage.removeItem('admin_auth');
    router.replace('/admin/login');
  }

  if (!authorized && loading) {
    return (
      <div className="p-8 text-center font-bold text-emerald-400 bg-gray-950 min-h-screen flex items-center justify-center">
        பாதுகாப்புச் சோதனை செய்யப்படுகிறது...
      </div>
    );
  }

  if (!authorized) return null;

  const filteredStores = stores.filter(
    (s) =>
      (s.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone_number || '').includes(searchQuery)
  );

  return (
    <div className="p-4 sm:p-8 font-sans bg-gray-950 text-white min-h-screen">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">சப்ஸ்கிரிப்ஷன் நிர்வாகம் (Admin Panel)</h1>
          <p className="text-gray-400 text-sm">
            மொத்த கடைகள்: <span className="text-white font-bold">{stores.length}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition duration-200 cursor-pointer"
          >
            <QrCode className="size-4" />
            Universal QR Standee
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition duration-200 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mb-4 max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="கடை பெயர் அல்லது போன் எண் மூலம் தேடுக..."
          className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">கடை விவரங்கள் ஏற்றப்படுகிறது...</div>
      ) : filteredStores.length === 0 ? (
        <div className="py-12 text-center text-gray-400 border border-gray-800 rounded-xl bg-gray-900/40">
          கடைகள் எதுவும் கிடைக்கவில்லை.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-900 text-left text-gray-300 text-sm">
                <th className="p-3 border-b border-gray-800">கடை பெயர்</th>
                <th className="p-3 border-b border-gray-800">போன் எண்</th>
                <th className="p-3 border-b border-gray-800">பிளான்</th>
                <th className="p-3 border-b border-gray-800">நிலை</th>
                <th className="p-3 border-b border-gray-800">முடிவடையும் தேதி</th>
                <th className="p-3 border-b border-gray-800">செயல்பாடு</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredStores.map((store) => {
                const isBusy = updatingStoreId === store.id;
                const inputDateValue = store.trial_ends_at
                  ? new Date(store.trial_ends_at).toISOString().split('T')[0]
                  : '';

                return (
                  <tr key={store.id} className="border-b border-gray-800 hover:bg-gray-900/70">
                    <td className="p-3 font-semibold whitespace-nowrap">{store.store_name}</td>
                    <td className="p-3 font-mono whitespace-nowrap">{store.phone_number}</td>
                    <td className="p-3 uppercase text-xs font-bold text-gray-300">
                      {store.plan_type || 'N/A'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-bold text-white ${
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
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-gray-300">
                          {store.trial_ends_at
                            ? new Date(store.trial_ends_at).toLocaleDateString()
                            : 'N/A'}
                        </span>
                        <input
                          type="date"
                          disabled={isBusy}
                          value={inputDateValue}
                          onChange={(e) => handleDateChange(store.id, e.target.value)}
                          className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-50"
                        />
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={isBusy}
                          onClick={() => handleAdjustMonths(store.id, -1)}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          -1 மாதம்
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => handleAdjustMonths(store.id, 1, 'monthly')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          +1 மாதம்
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => handleAdjustMonths(store.id, 12, 'yearly')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          +1 வருடம்
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Universal QR Standee Generator Modal */}
      <UniversalQrGeneratorModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}