import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PackageType = 'monthly' | 'quarterly' | 'one_time';
export type ProposalKind = 'proposal' | 'report' | 'content_plan';

export interface AgencyProposal {
  id: string;
  title: string;
  client_id: string | null;
  client_name: string | null;
  contact_point: string | null;
  amount: number | null;
  currency: string | null;
  package_type: PackageType | null;
  kind: ProposalKind;
  html_content: string;
  slug: string;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const slugify = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'propuesta';

const randomSuffix = () => Math.random().toString(36).slice(2, 8);

export type AgencyProposalListItem = Omit<AgencyProposal, 'html_content'>;

export const useAgencyProposals = () => {
  return useQuery({
    queryKey: ['agency-proposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_proposals')
        .select('id,title,client_id,client_name,contact_point,amount,currency,package_type,kind,slug,is_published,created_by,created_at,updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgencyProposalListItem[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const fetchProposalHtml = async (id: string): Promise<string> => {
  const { data, error } = await supabase
    .from('agency_proposals')
    .select('html_content')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data?.html_content as string) || '';
};


export const useAgencyProposal = (id: string | null) => {
  return useQuery({
    queryKey: ['agency-proposal', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('agency_proposals')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as AgencyProposal | null;
    },
    enabled: !!id,
  });
};

export const useCreateAgencyProposal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { title: string; client_id?: string | null; client_name?: string | null; html_content: string; is_published?: boolean; kind?: ProposalKind }) => {
      const slug = `${slugify(input.title)}-${randomSuffix()}`;
      const { data, error } = await supabase
        .from('agency_proposals')
        .insert({
          title: input.title,
          client_id: input.client_id ?? null,
          client_name: input.client_name || null,
          html_content: input.html_content,
          slug,
          is_published: input.is_published ?? true,
          kind: input.kind ?? 'proposal',
          created_by: user?.id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as AgencyProposal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-proposals'] }),
  });
};

export const useUpdateAgencyProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      client_id?: string | null;
      client_name?: string | null;
      contact_point?: string | null;
      amount?: number | null;
      currency?: string | null;
      package_type?: PackageType | null;
      html_content?: string;
      is_published?: boolean;
      kind?: ProposalKind;
    }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('agency_proposals')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as AgencyProposal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['agency-proposals'] });
      qc.invalidateQueries({ queryKey: ['agency-proposal', data.id] });
    },
  });
};

export const useDeleteAgencyProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agency_proposals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-proposals'] }),
  });
};
