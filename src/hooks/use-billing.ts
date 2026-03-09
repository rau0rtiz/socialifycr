import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_amount: number;
  currency: string;
  billing_interval: string;
  features: string[];
  max_clients: number | null;
  max_users: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ClientSubscription {
  id: string;
  client_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'trialing';
  payment_provider: 'tilopay' | 'onvopay' | 'bac_compra_click' | null;
  provider_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  subscription_id: string | null;
  client_id: string;
  provider: 'tilopay' | 'onvopay' | 'bac_compra_click';
  provider_transaction_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_method: string | null;
  error_message: string | null;
  paid_at: string | null;
  created_at: string;
}

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
};

export const useClientSubscription = (clientId: string | null) => {
  return useQuery({
    queryKey: ['client-subscription', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data as ClientSubscription | null;
    },
    enabled: !!clientId,
  });
};

export const usePaymentTransactions = (clientId: string | null) => {
  return useQuery({
    queryKey: ['payment-transactions', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentTransaction[];
    },
    enabled: !!clientId,
  });
};

export const useAllSubscriptions = () => {
  return useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientSubscription[];
    },
  });
};

export const useCreateCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      planId,
      provider,
    }: {
      clientId: string;
      planId: string;
      provider: 'tilopay' | 'onvopay' | 'bac_compra_click';
    }) => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { client_id: clientId, plan_id: planId, provider },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] });
    },
  });
};

export const useMutatePlan = () => {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (plan: Omit<SubscriptionPlan, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(plan)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription-plans'] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubscriptionPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription-plans'] }),
  });

  return { create, update };
};
