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
  setter_tracker: boolean;
  setter_checklist: boolean;
  monthly_sales_report: boolean;
  ventas_section: boolean;
  contenido_section: boolean;
  reportes_section: boolean;
  email_marketing_section: boolean;
  generador_pauta: boolean;
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
  setter_tracker: false,
  setter_checklist: true,
  ventas_section: false,
  contenido_section: false,
  reportes_section: false,
  email_marketing_section: false,
  generador_pauta: false,
};

// Navigation section flags — these control sidebar visibility
export const SECTION_LABELS: Record<string, string> = {
  ventas_section: 'Ventas',
  contenido_section: 'Contenido',
  reportes_section: 'Reportes',
  email_marketing_section: 'Email Marketing',
};

// Dashboard widget flags grouped by section
export const DASHBOARD_WIDGET_LABELS: Record<string, string> = {
  social_followers: 'Seguidores de Redes',
  instagram_posts: 'Top Posts Instagram',
  youtube_videos: 'Top Videos YouTube',
  funnel: 'Embudo (Funnel)',
  campaigns: 'Campañas',
};

export const VENTAS_WIDGET_LABELS: Record<string, string> = {
  setter_tracker: 'Agendas',
  sales_tracking: 'Ventas por Mensajes',
  monthly_sales_report: 'Reporte Mensual de Ventas',
};

export const CONTENIDO_WIDGET_LABELS: Record<string, string> = {
  content_grid: 'Grid de Contenido',
  ai_insights: 'Insights de IA',
  video_ideas: 'Ideas de Video',
  competitors: 'Competidores',
  generador_pauta: 'Generador de Pauta',
};

// Combined for backward compat
export const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  ...DASHBOARD_WIDGET_LABELS,
  ...VENTAS_WIDGET_LABELS,
  ...CONTENIDO_WIDGET_LABELS,
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
        setter_tracker: data.setter_tracker,
        setter_checklist: data.setter_checklist,
        monthly_sales_report: data.monthly_sales_report,
        ventas_section: data.ventas_section,
        contenido_section: data.contenido_section,
        reportes_section: data.reportes_section,
        email_marketing_section: data.email_marketing_section,
        generador_pauta: data.generador_pauta,
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
