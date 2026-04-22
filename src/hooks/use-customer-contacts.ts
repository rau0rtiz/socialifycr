import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerContact {
  id: string;
  client_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  garment_sizes: string[];
  preferred_brands: string[];
  total_purchases: number;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useCustomerContacts = (clientId: string | null) => {
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['customer-contacts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('customer_contacts' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CustomerContact[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  return { contacts, isLoading };
};

/**
 * Upsert a customer contact by (client_id, phone). If phone is empty, falls back to (client_id, full_name).
 * Merges garment_sizes and preferred_brands arrays. Increments total_purchases when isNewSale=true.
 */
export const upsertCustomerContact = async (params: {
  clientId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  garmentSize?: string | null;
  brand?: string | null;
  isNewSale?: boolean;
}): Promise<string | null> => {
  const { clientId, fullName, phone, email, garmentSize, brand, isNewSale = true } = params;
  if (!clientId || !fullName?.trim()) return null;

  const trimmedPhone = phone?.trim() || null;
  const trimmedName = fullName.trim();

  // Try to find existing contact
  let query = supabase
    .from('customer_contacts' as any)
    .select('id, garment_sizes, preferred_brands, total_purchases')
    .eq('client_id', clientId);

  if (trimmedPhone) {
    query = query.eq('phone', trimmedPhone);
  } else {
    query = query.eq('full_name', trimmedName);
  }

  const { data: existing } = await query.maybeSingle();

  const existingSizes: string[] = (existing as any)?.garment_sizes || [];
  const existingBrands: string[] = (existing as any)?.preferred_brands || [];
  const newSizes = garmentSize && !existingSizes.includes(garmentSize)
    ? [...existingSizes, garmentSize]
    : existingSizes;
  const newBrands = brand && !existingBrands.includes(brand)
    ? [...existingBrands, brand]
    : existingBrands;

  if (existing) {
    const { error } = await supabase
      .from('customer_contacts' as any)
      .update({
        full_name: trimmedName,
        email: email?.trim() || null,
        garment_sizes: newSizes,
        preferred_brands: newBrands,
        total_purchases: ((existing as any).total_purchases || 0) + (isNewSale ? 1 : 0),
        last_purchase_at: isNewSale ? new Date().toISOString() : undefined,
      } as any)
      .eq('id', (existing as any).id);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('upsertCustomerContact update error', error);
      return null;
    }
    return (existing as any).id;
  }

  const { data: inserted, error } = await supabase
    .from('customer_contacts' as any)
    .insert({
      client_id: clientId,
      full_name: trimmedName,
      phone: trimmedPhone,
      email: email?.trim() || null,
      garment_sizes: garmentSize ? [garmentSize] : [],
      preferred_brands: brand ? [brand] : [],
      total_purchases: isNewSale ? 1 : 0,
      last_purchase_at: isNewSale ? new Date().toISOString() : null,
    } as any)
    .select('id')
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('upsertCustomerContact insert error', error);
    return null;
  }
  return (inserted as any)?.id || null;
};

export const useInvalidateCustomerContacts = () => {
  const qc = useQueryClient();
  return (clientId: string) => qc.invalidateQueries({ queryKey: ['customer-contacts', clientId] });
};
