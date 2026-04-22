import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerAddress {
  label?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  post_code?: string | null;
  country?: string | null;
}

export interface CustomerContact {
  id: string;
  client_id: string;
  full_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  notes: string | null;
  garment_sizes: string[];
  preferred_brands: string[];
  addresses: CustomerAddress[];
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

const addressKey = (a: CustomerAddress) =>
  `${(a.address_line_1 || '').trim().toLowerCase()}|${(a.city || '').trim().toLowerCase()}|${(a.district || '').trim().toLowerCase()}`;

const mergeAddresses = (existing: CustomerAddress[], newOne?: CustomerAddress | null): CustomerAddress[] => {
  if (!newOne || !newOne.address_line_1?.trim()) return existing;
  const seen = new Set(existing.map(addressKey));
  if (seen.has(addressKey(newOne))) return existing;
  return [...existing, newOne];
};

/**
 * Upsert a customer contact by (client_id, phone). If phone is empty, falls back to (client_id, full_name).
 * Merges garment_sizes, preferred_brands, and addresses arrays. Increments total_purchases when isNewSale=true.
 */
export const upsertCustomerContact = async (params: {
  clientId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  idNumber?: string | null;
  garmentSize?: string | null;
  brand?: string | null;
  address?: CustomerAddress | null;
  isNewSale?: boolean;
}): Promise<string | null> => {
  const { clientId, fullName, phone, email, idNumber, garmentSize, brand, address, isNewSale = true } = params;
  if (!clientId || !fullName?.trim()) return null;

  const trimmedPhone = phone?.trim() || null;
  const trimmedName = fullName.trim();

  // Try to find existing contact
  let query = supabase
    .from('customer_contacts' as any)
    .select('id, garment_sizes, preferred_brands, addresses, total_purchases, id_number, email')
    .eq('client_id', clientId);

  if (trimmedPhone) {
    query = query.eq('phone', trimmedPhone);
  } else {
    query = query.eq('full_name', trimmedName);
  }

  const { data: existing } = await query.maybeSingle();

  const existingSizes: string[] = (existing as any)?.garment_sizes || [];
  const existingBrands: string[] = (existing as any)?.preferred_brands || [];
  const existingAddresses: CustomerAddress[] = (existing as any)?.addresses || [];
  const newSizes = garmentSize && !existingSizes.includes(garmentSize)
    ? [...existingSizes, garmentSize]
    : existingSizes;
  const newBrands = brand && !existingBrands.includes(brand)
    ? [...existingBrands, brand]
    : existingBrands;
  const newAddresses = mergeAddresses(existingAddresses, address || null);

  if (existing) {
    const updates: Record<string, any> = {
      full_name: trimmedName,
      email: email?.trim() || (existing as any).email || null,
      id_number: idNumber?.trim() || (existing as any).id_number || null,
      garment_sizes: newSizes,
      preferred_brands: newBrands,
      addresses: newAddresses,
    };
    if (isNewSale) {
      updates.total_purchases = ((existing as any).total_purchases || 0) + 1;
      updates.last_purchase_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('customer_contacts' as any)
      .update(updates as any)
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
      id_number: idNumber?.trim() || null,
      garment_sizes: garmentSize ? [garmentSize] : [],
      preferred_brands: brand ? [brand] : [],
      addresses: address && address.address_line_1?.trim() ? [address] : [],
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
