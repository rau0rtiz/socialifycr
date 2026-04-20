import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, ShoppingCart, FileText, BarChart3, Mail,
  Search, Users, Zap, BarChart, LineChart, PieChart, CalendarDays,
  Film, ShoppingBag, ClipboardList, Sparkles, TrendingUp,
  Target, MessageSquare, CreditCard, Eye, Layers, Palette,
  BookOpen, Video, Swords, Megaphone, Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  section: 'dashboard' | 'ventas' | 'contenido' | 'reportes' | 'email' | 'standalone';
  featureFlag?: string;
  clientSpecific?: string[];
  tags: string[];
}

const WIDGET_CATALOG: WidgetDef[] = [
  // Dashboard widgets
  { id: 'kpi-section', name: 'KPI Cards', description: 'Tarjetas de métricas principales: alcance, impresiones, engagement, seguidores, publicaciones.', icon: BarChart3, section: 'dashboard', tags: ['métricas', 'analytics'] },
  { id: 'social-followers', name: 'Seguidores de Redes', description: 'Seguimiento de crecimiento de seguidores en Instagram, Facebook, TikTok, YouTube y LinkedIn con sparklines.', icon: Users, featureFlag: 'social_followers', section: 'dashboard', tags: ['redes sociales', 'crecimiento'] },
  { id: 'reach-chart', name: 'Gráfico de Alcance', description: 'Chart de área con alcance e impresiones por día, con selector de rango de fechas.', icon: LineChart, section: 'dashboard', tags: ['gráficos', 'alcance'] },
  { id: 'social-performance', name: 'Rendimiento Social', description: 'Gráfico de barras comparando likes, comments, saves y shares por publicación.', icon: BarChart, section: 'dashboard', tags: ['engagement', 'gráficos'] },
  { id: 'instagram-top-posts', name: 'Top Posts Instagram', description: 'Grid de mejores publicaciones de Instagram ordenadas por engagement, con thumbnails y métricas.', icon: Eye, featureFlag: 'instagram_posts', section: 'dashboard', tags: ['instagram', 'contenido'] },
  { id: 'youtube-top-videos', name: 'Top Videos YouTube', description: 'Ranking de videos de YouTube con views, likes y duración.', icon: Video, featureFlag: 'youtube_videos', section: 'dashboard', tags: ['youtube', 'video'] },
  { id: 'funnel-module', name: 'Embudo de Conversión', description: 'Visualización del funnel: impresiones → clics → leads → ventas con tasas de conversión.', icon: TrendingUp, featureFlag: 'funnel', section: 'dashboard', tags: ['conversión', 'embudo'] },
  { id: 'campaigns-table', name: 'Tabla de Campañas', description: 'Listado de campañas de Meta Ads con métricas de rendimiento, presupuesto y CPA.', icon: Megaphone, featureFlag: 'campaigns', section: 'dashboard', tags: ['ads', 'campañas', 'meta'] },
  { id: 'stories-section', name: 'Historias de Instagram', description: 'Panel de historias activas y archivadas con métricas de reach, impresiones y replies.', icon: Film, section: 'dashboard', tags: ['stories', 'instagram'] },
  { id: 'publication-goals', name: 'Metas de Publicación', description: 'Barra de progreso mensual de publicaciones vs meta establecida.', icon: Target, section: 'dashboard', tags: ['metas', 'publicaciones'] },
  { id: 'ai-insights', name: 'Insights de IA', description: 'Panel de análisis inteligente con recomendaciones generadas por IA basadas en el rendimiento.', icon: Sparkles, featureFlag: 'ai_insights', section: 'dashboard', tags: ['ia', 'análisis'] },
  { id: 'competitors', name: 'Panel de Competidores', description: 'Seguimiento de cuentas competidoras con comparación de métricas.', icon: Swords, featureFlag: 'competitors', section: 'dashboard', tags: ['competencia', 'análisis'] },

  // Ventas widgets
  { id: 'pipeline-summary', name: 'Resumen Pipeline', description: 'Cuadrícula de 8 KPIs: Ingresos, Conversaciones, Tasa Asistencia, No asistió, Ventas, Tasa Cierre, Por cobrar.', icon: PieChart, featureFlag: 'sales_tracking', section: 'ventas', tags: ['pipeline', 'kpis'] },
  { id: 'sales-goal-bar', name: 'Barra de Meta Mensual', description: 'Barra de progreso de meta de ventas mensual con monto actual vs objetivo.', icon: Target, section: 'ventas', tags: ['metas', 'ventas'] },
  { id: 'setter-tracker', name: 'Agendas (Setter Tracker)', description: 'Calendario y listado de citas agendadas con leads, estados y checklist pre-llamada configurable.', icon: CalendarDays, featureFlag: 'setter_tracker', section: 'ventas', tags: ['agendas', 'leads', 'setter'] },
  { id: 'setter-daily', name: 'Reporte Diario del Setter', description: 'Registro diario de conversaciones IG/WA, links enviados, followups y citas logradas.', icon: ClipboardList, featureFlag: 'setter_tracker', section: 'ventas', tags: ['setter', 'reporte'] },
  { id: 'sales-tracking', name: 'Registro de Ventas', description: 'Flujo de registro de ventas en 4 pasos con soporte de cuotas, anuncios vinculados y métodos de pago.', icon: ShoppingCart, featureFlag: 'sales_tracking', section: 'ventas', tags: ['ventas', 'registro'] },
  { id: 'collections-widget', name: 'Widget de Cobros', description: 'Gestión de cuotas pendientes con calendario de pagos y estados (pagado/pendiente/atrasado).', icon: CreditCard, section: 'ventas', tags: ['cobros', 'pagos'] },
  { id: 'closure-rate', name: 'Tasa de Cierre', description: 'Donut chart con porcentaje de cierre y breakdown por fuente de leads.', icon: PieChart, section: 'ventas', tags: ['conversión', 'gráficos'] },
  { id: 'ad-sales-ranking', name: 'Ranking Anuncios por Ventas', description: 'Tabla con los anuncios que más ventas generaron, ordenados por monto.', icon: Megaphone, section: 'ventas', tags: ['ads', 'atribución'] },
  { id: 'lead-source', name: 'Fuente de Leads', description: 'Gráfico de distribución de leads por origen: Story, Ad, Referral, Organic, etc.', icon: BarChart, section: 'ventas', tags: ['leads', 'fuente'] },
  { id: 'whatsapp-conversations', name: 'Conversaciones WhatsApp', description: 'Métricas de conversaciones iniciadas por WhatsApp desde campañas de Meta.', icon: MessageSquare, section: 'ventas', tags: ['whatsapp', 'conversaciones'] },
  { id: 'story-store', name: 'Story Store', description: 'Grid de historias para vincular ventas directamente a stories activas o archivadas con auto-escaneo IA.', icon: ShoppingBag, section: 'ventas', clientSpecific: ['Alma Bendita'], tags: ['stories', 'ventas', 'ia'] },
  { id: 'story-revenue-tracker', name: 'Tracker de Historias y Ventas', description: 'Calendario semanal automático que cuenta historias archivadas y ventas vinculadas, con override manual.', icon: Film, section: 'ventas', clientSpecific: ['Alma Bendita'], tags: ['stories', 'tracker', 'automático'] },
  { id: 'clinic-summary', name: 'Vista Clínica', description: 'KPIs médicos: Valoraciones, Procedimientos, Ingresos, Por cobrar. Diseñado para clínicas.', icon: ClipboardList, section: 'ventas', clientSpecific: ['Dra Silvia Alvarado'], tags: ['clínica', 'médico'] },
  { id: 'speakup-analytics', name: 'Analytics de Retención', description: 'Dashboard de MRR, churn y retención de estudiantes con terminología educativa.', icon: TrendingUp, section: 'ventas', clientSpecific: ['Speak Up Costa Rica'], tags: ['mrr', 'retención', 'educación'] },
  { id: 'sales-by-product', name: 'Ventas por Producto', description: 'Gráfico de barras con distribución de ventas por producto/servicio.', icon: BarChart, section: 'ventas', tags: ['productos', 'gráficos'] },

  // Contenido widgets
  { id: 'content-grid', name: 'Grid de Contenido', description: 'Cuadrícula visual de publicaciones con filtros por tag, modelo, plataforma y búsqueda. Incluye métricas 48h.', icon: Layers, featureFlag: 'content_grid', section: 'contenido', tags: ['contenido', 'grid'] },
  { id: 'content-calendar', name: 'Calendario de Contenido', description: 'Vista mensual de publicaciones con thumbnails, codificación por color por tipo de contenido.', icon: CalendarDays, section: 'contenido', tags: ['calendario', 'planificación'] },
  { id: 'generador-pauta', name: 'Generador de Estáticos', description: 'Herramienta para crear anuncios en formatos 1:1, 4:5, 9:16 y 2:1 con logo, textos y exportación HD.', icon: Palette, featureFlag: 'generador_pauta', section: 'contenido', tags: ['diseño', 'ads', 'creativos'] },
  { id: 'giveaway-widget', name: 'Widget de Sorteos', description: 'Selección de publicación, configuración de reglas y animación de sorteo aleatorio para Instagram.', icon: Sparkles, section: 'contenido', clientSpecific: ['petshop2go'], tags: ['sorteo', 'instagram'] },

  // Email Marketing
  { id: 'email-campaigns', name: 'Campañas de Email', description: 'Creación, segmentación por tags y envío masivo de emails con tracking de entrega.', icon: Mail, section: 'email', tags: ['email', 'campañas'] },
  { id: 'email-contacts', name: 'Contactos de Email', description: 'Base de datos de suscriptores con tags, estados y gestión de listas.', icon: Database, section: 'email', tags: ['email', 'contactos'] },

  // Standalone
  { id: 'client-database', name: 'Base de Datos de Clientes', description: 'CRM básico con historial de contactos, ventas y actividad por cliente.', icon: Database, section: 'standalone', tags: ['crm', 'base de datos'] },
];

const SECTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  ventas: { label: 'Ventas', icon: ShoppingCart, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  contenido: { label: 'Contenido', icon: FileText, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  email: { label: 'Email Marketing', icon: Mail, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  standalone: { label: 'Independiente', icon: Layers, color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
};

export const WidgetCatalog = () => {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('all');

  // Fetch all clients with their feature flags
  const { data: clientsData = [] } = useQuery({
    queryKey: ['catalog-clients-flags'],
    queryFn: async () => {
      const { data: clients } = await supabase.from('clients').select('id, name').order('name');
      if (!clients) return [];

      const { data: flags } = await supabase.from('client_feature_flags').select('*');
      const flagMap = new Map((flags || []).map((f: any) => [f.client_id, f]));

      return clients.map((c: any) => ({
        id: c.id,
        name: c.name,
        flags: flagMap.get(c.id) || {},
      }));
    },
  });

  // For each widget, determine which clients use it
  const widgetsWithClients = useMemo(() => {
    return WIDGET_CATALOG.map(widget => {
      let activeClients: string[] = [];

      if (widget.clientSpecific) {
        activeClients = widget.clientSpecific;
      } else if (widget.featureFlag) {
        activeClients = clientsData
          .filter(c => c.flags[widget.featureFlag!])
          .map(c => c.name);
      } else {
        // Always-on widgets — show for all clients that have the section enabled
        const sectionFlagMap: Record<string, string | null> = {
          dashboard: null,
          ventas: 'ventas_section',
          contenido: 'contenido_section',
          reportes: 'reportes_section',
          email: 'email_marketing_section',
          standalone: null,
        };
        const sectionFlag = sectionFlagMap[widget.section];
        if (sectionFlag) {
          activeClients = clientsData.filter(c => c.flags[sectionFlag]).map(c => c.name);
        } else {
          activeClients = clientsData.map(c => c.name);
        }
      }

      return { ...widget, activeClients };
    });
  }, [clientsData]);

  // Filter
  const filtered = useMemo(() => {
    return widgetsWithClients.filter(w => {
      if (activeSection !== 'all' && w.section !== activeSection) return false;
      if (search) {
        const q = search.toLowerCase();
        return w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          w.tags.some(t => t.includes(q));
      }
      return true;
    });
  }, [widgetsWithClients, search, activeSection]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: WIDGET_CATALOG.length };
    WIDGET_CATALOG.forEach(w => {
      counts[w.section] = (counts[w.section] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Catálogo de Widgets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Librería interna con todos los componentes disponibles para asignar a clientes.
        </p>
      </div>

      {/* Search + Stats */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          <span><strong className="text-foreground">{WIDGET_CATALOG.length}</strong> widgets disponibles</span>
        </div>
      </div>

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-3 py-1.5 text-xs">
            Todos ({sectionCounts.all})
          </TabsTrigger>
          {Object.entries(SECTION_CONFIG).map(([key, config]) => (
            <TabsTrigger
              key={key}
              value={key}
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-3 py-1.5 text-xs gap-1.5"
            >
              <config.icon className="h-3 w-3" />
              {config.label} ({sectionCounts[key] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <Separator className="my-4" />

        <TabsContent value={activeSection} className="mt-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No se encontraron widgets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(widget => {
                const sectionConfig = SECTION_CONFIG[widget.section];
                const Icon = widget.icon;

                return (
                  <Card key={widget.id} className="group hover:shadow-md transition-all duration-200 border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2.5 rounded-xl border shrink-0', sectionConfig.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-foreground truncate">{widget.name}</h3>
                            {widget.featureFlag && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 font-mono">
                                {widget.featureFlag}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                            {widget.description}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {widget.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Active clients */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                            {widget.activeClients.length === 0 ? (
                              <span className="text-[10px] text-muted-foreground italic">Sin clientes activos</span>
                            ) : widget.activeClients.length <= 4 ? (
                              widget.activeClients.map(name => (
                                <Badge key={name} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                  {name}
                                </Badge>
                              ))
                            ) : (
                              <>
                                {widget.activeClients.slice(0, 3).map(name => (
                                  <Badge key={name} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                    {name}
                                  </Badge>
                                ))}
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                  +{widget.activeClients.length - 3} más
                                </Badge>
                              </>
                            )}
                          </div>

                          {/* Client-specific badge */}
                          {widget.clientSpecific && (
                            <div className="mt-2 flex items-center gap-1">
                              <Zap className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                Widget especializado
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
