import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientFeatureFlags {
  id: string;
  client_id: string;
  dashboard: boolean;
  social_followers: boolean;
  instagram_posts: boolean;
  youtube_videos: boolean;
  content_grid: boolean;
  ai_insights: boolean;
  video_ideas: boolean;
  competitors: boolean;
  funnel: boolean;
  campaigns: boolean;
  sales_tracking: boolean;
  monthly_sales_report: boolean;
}

const DEFAULT_FLAGS: Omit<ClientFeatureFlags, 'id' | 'client_id'> = {
  dashboard: true,
  social_followers: false,
  instagram_posts: false,
  youtube_videos: false,
  content_grid: false,
  ai_insights: false,
  video_ideas: false,
  competitors: false,
  funnel: false,
  campaigns: false,
  sales_tracking: false,
  monthly_sales_report: false,
};

export const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  social_followers: 'Seguidores de Redes',
  instagram_posts: 'Top Posts Instagram',
  youtube_videos: 'Top Videos YouTube',
  content_grid: 'Grid de Contenido',
  ai_insights: 'Insights de IA',
  video_ideas: 'Ideas de Video',
  competitors: 'Competidores',
  funnel: 'Embudo (Funnel)',
  campaigns: 'Campañas',
  sales_tracking: 'Ventas por Mensajes',
  monthly_sales_report: 'Reporte Mensual de Ventas',
};

export const useClientFeatures = (clientId: string | null) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['client-features', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('client_feature_flags')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as ClientFeatureFlags | null;
    },
    enabled: !!clientId,
  });

  const flags: Omit<ClientFeatureFlags, 'id' | 'client_id'> = data
    ? {
        dashboard: data.dashboard,
        social_followers: data.social_followers,
        instagram_posts: data.instagram_posts,
        youtube_videos: data.youtube_videos,
        content_grid: data.content_grid,
        ai_insights: data.ai_insights,
        video_ideas: data.video_ideas,
        competitors: data.competitors,
        funnel: data.funnel,
        campaigns: data.campaigns,
        sales_tracking: data.sales_tracking,
        monthly_sales_report: data.monthly_sales_report,
      }
    : DEFAULT_FLAGS;

  const updateFlag = useMutation({
    mutationFn: async ({ flag, value }: { flag: string; value: boolean }) => {
      if (!clientId) throw new Error('No client selected');

      if (data) {
        const { error } = await supabase
          .from('client_feature_flags')
          .update({ [flag]: value, updated_at: new Date().toISOString() })
          .eq('client_id', clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_feature_flags')
          .insert({ client_id: clientId, [flag]: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-features', clientId] });
    },
  });

  return { flags, isLoading, updateFlag, hasRecord: !!data };
};
