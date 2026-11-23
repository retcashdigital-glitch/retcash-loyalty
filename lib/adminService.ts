export interface Store {
  id: string;
  store_name: string;
  phone_number: string;
  plan_type: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

export async function getAllStoresWithSubscriptions(): Promise<Store[]> {
  const res = await fetch('/api/admin/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list_stores' }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch stores');
  return data.stores || [];
}

export async function renewStoreSubscription(
  storeId: string,
  monthsToAdd: number = 1,
  planType: string = 'monthly'
) {
  const res = await fetch('/api/admin/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'adjust_months',
      storeId,
      months: monthsToAdd,
      plan: planType,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to renew subscription');
  return data;
}