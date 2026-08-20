import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FormAnswer } from '@/lib/form-runtime';

export interface FormResponseListItem {
  id: string;
  proposal_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: FormAnswer[];
  created_at: string;
}

/** Cantidad de respuestas por documento (para las tarjetas de Documentación). */
export const useFormResponseCounts = () =>
  useQuery({
    queryKey: ['form-response-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_form_responses')
        .select('proposal_id');
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        map[(row as any).proposal_id] = (map[(row as any).proposal_id] || 0) + 1;
      }
      return map;
    },
    staleTime: 60 * 1000,
  });

export const useFormResponses = (proposalId: string | null) =>
  useQuery({
    queryKey: ['form-responses', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      const { data, error } = await supabase
        .from('document_form_responses')
        .select('id, proposal_id, respondent_name, respondent_email, answers, created_at')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        answers: Array.isArray(r.answers) ? (r.answers as unknown as FormAnswer[]) : [],
      })) as FormResponseListItem[];
    },
    enabled: !!proposalId,
  });

export const fetchResponseHtml = async (id: string): Promise<string> => {
  const { data, error } = await supabase
    .from('document_form_responses')
    .select('html_snapshot')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data?.html_snapshot as string) || '';
};
