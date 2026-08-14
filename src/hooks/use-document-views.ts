import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DocumentView {
  id: string;
  proposal_id: string;
  slug: string;
  ip_hash: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  referrer: string | null;
  duration_seconds: number;
  created_at: string;
}

export interface DocumentViewsSummary {
  total: number;
  uniqueVisitors: number;
  avgSeconds: number;
  maxSeconds: number;
}

export const useDocumentViews = (proposalId: string | null) => {
  const query = useQuery({
    queryKey: ['document-views', proposalId],
    queryFn: async () => {
      if (!proposalId) return [] as DocumentView[];
      const { data, error } = await supabase
        .from('document_views')
        .select('id,proposal_id,slug,ip_hash,country,city,device,browser,referrer,duration_seconds,created_at')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as DocumentView[];
    },
    enabled: !!proposalId,
    staleTime: 30 * 1000,
  });

  const views = query.data ?? [];
  const durations = views.map((v) => v.duration_seconds ?? 0);
  const summary: DocumentViewsSummary = {
    total: views.length,
    uniqueVisitors: new Set(views.map((v) => v.ip_hash ?? v.id)).size,
    avgSeconds: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    maxSeconds: durations.length ? Math.max(...durations) : 0,
  };

  return { ...query, views, summary };
};

export const formatDuration = (seconds: number) => {
  if (!seconds) return 'menos de 1 s';
  if (seconds < 60) return `${seconds} s`;
  const min = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${min} min ${rest} s` : `${min} min`;
};
