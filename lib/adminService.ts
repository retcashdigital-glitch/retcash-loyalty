import { supabase } from './supabase';

export interface Store {
  id: string;
  store_name: string;
  phone_number: string;
  plan_type: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
}

// 1. அனைத்து கடைகளின் விவரங்களையும் பெறுதல்
export async function getAllStoresWithSubscriptions(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('id, store_name, phone_number, plan_type, subscription_status, trial_ends_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 2. சப்ஸ்கிரிப்ஷனை புதுப்பித்தல்
export async function renewStoreSubscription(
  storeId: string,
  monthsToAdd: number = 1,
  planType: string = 'monthly'
) {
  const newEndDate = new Date();
  newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);

  const { data, error } = await supabase
    .from('stores')
    .update({
      subscription_status: 'active',
      plan_type: planType,
      trial_ends_at: newEndDate.toISOString(),
    })
    .eq('id', storeId)
    .select();

  if (error) throw error;
  return data;
}