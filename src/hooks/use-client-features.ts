import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChecklistItem {
  key: string;
  label: string;
}

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'checklist_quiz', label: 'Ya realizó el quiz' },
  { key: 'checklist_video', label: 'Ya vio el video antes de la llamada' },
  { key: 'checklist_whatsapp', label: 'Ya se creó el grupo de WhatsApp' },
  { key: 'checklist_testimonials', label: 'Ya se enviaron los testimonios' },
];

export interface ClientFeatureFlags {
  id: string;
  client_id: string;
  // Sections
  dashboard: boolean;
  ventas_section: boolean;
  contenido_section: boolean;
  reportes_section: boolean;
  email_marketing_section: boolean;
  business_setup_section: boolean;
  asistencia_section: boolean;
  // Dashboard widgets
  social_followers: boolean;
  instagram_posts: boolean;
  youtube_videos: boolean;
  funnel: boolean;
  campaigns: boolean;
  reach_chart: boolean;
  social_performance: boolean;
  stories_section: boolean;
  publication_goals: boolean;
  ai_insights: boolean;
  competitors: boolean;
  // Ventas widgets
  sales_tracking: boolean;
  setter_tracker: boolean;
  setter_checklist: boolean;
  setter_daily: boolean;
  pipeline_summary: boolean;
  sales_goal: boolean;
  closure_rate: boolean;
  ad_sales_ranking: boolean;
  lead_source: boolean;
  whatsapp_conversations: boolean;
  story_store: boolean;
  story_revenue_tracker: boolean;
  sales_by_product: boolean;
  sales_by_brand: boolean;
  collections: boolean;
  // Contenido widgets
  content_grid: boolean;
  video_ideas: boolean;
  generador_pauta: boolean;
  content_calendar: boolean;
  giveaway: boolean;
  // Reportes widgets
  monthly_sales_report: boolean;
  ai_report_generator: boolean;
  social_performance_report: boolean;
  // Meta
  checklist_items: ChecklistItem[];
}

const BOOLEAN_FLAG_KEYS: (keyof Omit<ClientFeatureFlags, 'id' | 'client_id' | 'checklist_items'>)[] = [
  'dashboard', 'ventas_section', 'contenido_section', 'reportes_section', 'email_marketing_section',
  'business_setup_section', 'asistencia_section',
  'social_followers', 'instagram_posts', 'youtube_videos', 'funnel', 'campaigns',
  'reach_chart', 'social_performance', 'stories_section', 'publication_goals', 'ai_insights', 'competitors',
  'sales_tracking', 'setter_tracker', 'setter_checklist', 'setter_daily',
  'pipeline_summary', 'sales_goal', 'closure_rate', 'ad_sales_ranking', 'lead_source',
  'whatsapp_conversations', 'story_store', 'story_revenue_tracker', 'sales_by_product', 'sales_by_brand', 'collections',
  'content_grid', 'video_ideas', 'generador_pauta', 'content_calendar', 'giveaway',
  'monthly_sales_report', 'ai_report_generator', 'social_performance_report',
];

const DEFAULT_FLAGS: Omit<ClientFeatureFlags, 'id' | 'client_id'> = Object.fromEntries([
  ...BOOLEAN_FLAG_KEYS.map(k => [k, true]),
  ['checklist_items', DEFAULT_CHECKLIST_ITEMS],
]) as any;

// Navigation section flags
export const SECTION_LABELS: Record<string, string> = {
  ventas_section: 'Ventas',
  contenido_section: 'Contenido',
  reportes_section: 'Reportes',
  email_marketing_section: 'Email Marketing',
  business_setup_section: 'Business Setup',
  asistencia_section: 'Asistencia',
};

// Dashboard widget flags
export const DASHBOARD_WIDGET_LABELS: Record<string, string> = {
  social_followers: 'Seguidores de Redes',
  instagram_posts: 'Top Posts Instagram',
  youtube_videos: 'Top Videos YouTube',
  funnel: 'Embudo (Funnel)',
  campaigns: 'Campañas',
  reach_chart: 'Gráfico de Alcance',
  social_performance: 'Rendimiento Social',
  stories_section: 'Historias de Instagram',
  publication_goals: 'Metas de Publicación',
  ai_insights: 'Insights de IA',
  competitors: 'Competidores',
};

export const VENTAS_WIDGET_LABELS: Record<string, string> = {
  setter_tracker: 'Agendas',
  setter_checklist: 'Checklist Pre-llamada',
  setter_daily: 'Reporte Diario del Setter',
  sales_tracking: 'Ventas por Mensajes',
  pipeline_summary: 'Resumen Pipeline',
  sales_goal: 'Barra de Meta Mensual',
  closure_rate: 'Tasa de Cierre',
  ad_sales_ranking: 'Ranking Anuncios por Ventas',
  lead_source: 'Fuente de Leads',
  whatsapp_conversations: 'Conversaciones WhatsApp',
  story_store: 'Story Store',
  story_revenue_tracker: 'Tracker Historias y Ventas',
  sales_by_product: 'Ventas por Producto',
  sales_by_brand: 'Ventas por Marca',
  collections: 'Widget de Cobros',
};

export const CONTENIDO_WIDGET_LABELS: Record<string, string> = {
  content_grid: 'Grid de Contenido',
  ai_insights: 'Insights de IA',
  video_ideas: 'Ideas de Video',
  competitors: 'Competidores',
  generador_pauta: 'Generador de Pauta',
  content_calendar: 'Calendario de Contenido',
  giveaway: 'Widget de Sorteos',
};

export const REPORTES_WIDGET_LABELS: Record<string, string> = {
  monthly_sales_report: 'Reporte Mensual de Ventas',
  ai_report_generator: 'Generador de Reportes IA',
  social_performance_report: 'Reporte Rendimiento Social',
};

// Combined for backward compat
export const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  ...DASHBOARD_WIDGET_LABELS,
  ...VENTAS_WIDGET_LABELS,
  ...CONTENIDO_WIDGET_LABELS,
  ...REPORTES_WIDGET_LABELS,
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
      if (!data) return null;
      return {
        ...data,
        checklist_items: (Array.isArray(data.checklist_items) ? data.checklist_items : DEFAULT_CHECKLIST_ITEMS) as ChecklistItem[],
      } as ClientFeatureFlags;
    },
    enabled: !!clientId,
  });

  const flags: Omit<ClientFeatureFlags, 'id' | 'client_id'> = data
    ? {
        ...Object.fromEntries(BOOLEAN_FLAG_KEYS.map(k => [k, (data as any)[k] ?? false])),
        checklist_items: data.checklist_items,
      } as any
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

  const updateChecklistItems = useMutation({
    mutationFn: async (items: ChecklistItem[]) => {
      if (!clientId) throw new Error('No client selected');

      if (data) {
        const { error } = await supabase
          .from('client_feature_flags')
          .update({ checklist_items: items as any, updated_at: new Date().toISOString() })
          .eq('client_id', clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_feature_flags')
          .insert({ client_id: clientId, checklist_items: items as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-features', clientId] });
    },
  });

  return { flags, isLoading, updateFlag, updateChecklistItems, hasRecord: !!data };
};
