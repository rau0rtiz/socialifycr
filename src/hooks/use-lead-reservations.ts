import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInCalendarDays } from 'date-fns';

export type ReservationStatus = 'active' | 'converted' | 'lost' | 'expired';

export interface LeadReservation {
  id: string;
  client_id: string;
  lead_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  product_id: string | null;
  product_name: string | null;
  deposit_amount: number;
  currency: string;
  reserved_at: string;
  expires_at: string;
  status: ReservationStatus;
  sale_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationInput {
  client_id: string;
  lead_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  deposit_amount?: number;
  currency?: string;
  reserved_at?: string;
  notes?: string | null;
}

export type ReservationUrgency = 'green' | 'yellow' | 'orange' | 'red';

export const getReservationUrgency = (expires_at: string, status: ReservationStatus): ReservationUrgency => {
  if (status === 'expired') return 'red';
  const days = differenceInCalendarDays(new Date(expires_at), new Date());
  if (days < 0) return 'red';
  if (days < 30) return 'orange';
  if (days < 60) return 'yellow';
  return 'green';
};

export const getDaysRemaining = (expires_at: string): number =>
  differenceInCalendarDays(new Date(expires_at), new Date());

export const useLeadReservations = (clientId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['lead-reservations', clientId],
    queryFn: async () => {
      if (!clientId) return [] as LeadReservation[];
      const { data, error } = await supabase
        .from('lead_reservations')
        .select('*')
        .eq('client_id', clientId)
        .order('expires_at', { ascending: true });
      if (error) throw error;
      return (data || []) as LeadReservation[];
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });

  const create = useMutation({
    mutationFn: async (input: ReservationInput) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase
        .from('lead_reservations')
        .insert({
          client_id: input.client_id,
          lead_id: input.lead_id ?? null,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone ?? null,
          customer_email: input.customer_email ?? null,
          product_id: input.product_id ?? null,
          product_name: input.product_name ?? null,
          deposit_amount: input.deposit_amount ?? 200,
          currency: input.currency ?? 'USD',
          reserved_at: input.reserved_at ?? new Date().toISOString().slice(0, 10),
          notes: input.notes ?? null,
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as LeadReservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-reservations', clientId] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<LeadReservation> & { id: string }) => {
      const { data, error } = await supabase
        .from('lead_reservations')
        .update(patch as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LeadReservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-reservations', clientId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_reservations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-reservations', clientId] });
    },
  });

  return {
    reservations: query.data || [],
    isLoading: query.isLoading,
    create,
    update,
    remove,
  };
};
