import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Presentation, FileText, ExternalLink, Download, RefreshCw,
  Sparkles, BarChart3, ShoppingCart, Users, Loader2, Eye,
  ArrowRight, ArrowLeft, Check, Pencil, CalendarIcon,
  ChevronDown, ChevronRight, Save, Palette, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCampaigns, useAdSets, useAds, CampaignInsights } from '@/hooks/use-ads-data';
import { useSocialFollowers } from '@/hooks/use-social-followers';
import { useGammaReport, useGammaThemes, GammaFormat } from '@/hooks/use-gamma-report';
import { useSaveReport } from '@/hooks/use-saved-reports';
import { useContentData } from '@/hooks/use-content-data';
import { useBrand } from '@/contexts/BrandContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ReportPreview } from './ReportPreview';
import { format as formatDate, subDays, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';

interface GammaReportGeneratorProps {
  clientId: string | null;
  hasAdAccount: boolean;
}

type DataSource = 'campaigns' | 'sales' | 'social' | 'content';
type Step = 'configure' | 'preview' | 'exporting' | 'done';

const dataSourceOptions: { id: DataSource; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'campaigns', label: 'Campañas Meta Ads', icon: BarChart3, description: 'Gasto, alcance, clics, ROAS' },
  { id: 'sales', label: 'Ventas', icon: ShoppingCart, description: 'Ventas registradas del período' },
  { id: 'content', label: 'Contenido Orgánico', icon: ImageIcon, description: 'Top posts, engagement, análisis de contenido' },
  { id: 'social', label: 'Redes Sociales', icon: Users, description: 'Seguidores por plataforma' },
];

// ── Campaign Selection Tree ──
interface CampaignTreeProps {
  clientId: string | null;
  hasAdAccount: boolean;
  dateRange: DateRange;
  selectedCampaignIds: Set<string>;
  selectedAdSetIds: Set<string>;
  selectedAdIds: Set<string>;
  onToggleCampaign: (id: string) => void;
  onToggleAdSet: (id: string) => void;
  onToggleAd: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const CampaignTree = ({
  clientId, hasAdAccount, dateRange,
  selectedCampaignIds, selectedAdSetIds, selectedAdIds,
  onToggleCampaign, onToggleAdSet, onToggleAd,
  onSelectAll, onDeselectAll
}: CampaignTreeProps) => {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  const customRange = dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined;

  const { data: campaignsResult, isLoading: campaignsLoading } = useCampaigns(
    clientId, hasAdAccount, 'custom', customRange
  );

  const campaigns = campaignsResult?.campaigns || [];
  const currency = campaignsResult?.currency || 'USD';

  const expandedCampaignId = expandedCampaigns.size > 0 ? Array.from(expandedCampaigns)[0] : null;
  const expandedCampaignObj = campaigns.find(c => c.id === expandedCampaignId);
  const { data: adsets, isLoading: adsetsLoading } = useAdSets(
    clientId, expandedCampaignId, expandedCampaignObj?.objective || '', 'custom', customRange
  );

  const expandedAdSetId = expandedAdSets.size > 0 ? Array.from(expandedAdSets)[0] : null;
  const { data: ads, isLoading: adsLoading } = useAds(
    clientId, expandedAdSetId, expandedCampaignObj?.objective || '', 'custom', customRange
  );

  const toggleExpandCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else { next.clear(); next.add(id); }
      return next;
    });
    setExpandedAdSets(new Set());
  };

  const toggleExpandAdSet = (id: string) => {
    setExpandedAdSets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else { next.clear(); next.add(id); }
      return next;
    });
  };

  if (campaignsLoading) return <Skeleton className="h-32 w-full" />;
  if (campaigns.length === 0) return <p className="text-sm text-muted-foreground p-3">No se encontraron campañas en este período.</p>;

  const allSelected = campaigns.every(c => selectedCampaignIds.has(c.id));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{campaigns.length} campañas encontradas</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={allSelected ? onDeselectAll : onSelectAll}>
          {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
        </Button>
      </div>
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-1 pr-3">
          {campaigns.map(campaign => {
            const isExpanded = expandedCampaigns.has(campaign.id);
            const isSelected = selectedCampaignIds.has(campaign.id);
            return (
              <div key={campaign.id}>
                <div className={cn(
                  'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
                  isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'
                )}>
                  <Checkbox checked={isSelected} onCheckedChange={() => onToggleCampaign(campaign.id)} />
                  <button
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleExpandCampaign(campaign.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => onToggleCampaign(campaign.id)}>
                    <p className="text-sm font-medium truncate">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Gasto: {currency} {campaign.spend.toFixed(2)} · {campaign.resultType}: {campaign.results}
                    </p>
                  </div>
                </div>
                {isExpanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {adsetsLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : (adsets || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-2">Sin conjuntos de anuncios</p>
                    ) : (adsets || []).map(adset => {
                      const adSetExpanded = expandedAdSets.has(adset.id);
                      const adSetSelected = selectedAdSetIds.has(adset.id);
                      return (
                        <div key={adset.id}>
                          <div className={cn(
                            'flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors',
                            adSetSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                          )}>
                            <Checkbox checked={adSetSelected} onCheckedChange={() => onToggleAdSet(adset.id)} />
                            <button
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => toggleExpandAdSet(adset.id)}
                            >
                              {adSetExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </button>
                            <div className="flex-1 min-w-0" onClick={() => onToggleAdSet(adset.id)}>
                              <p className="text-xs font-medium truncate">{adset.name}</p>
                              <p className="text-[10px] text-muted-foreground">Gasto: {currency} {adset.spend.toFixed(2)}</p>
                            </div>
                          </div>
                          {adSetExpanded && (
                            <div className="ml-7 mt-1 space-y-1">
                              {adsLoading ? (
                                <Skeleton className="h-6 w-full" />
                              ) : (ads || []).length === 0 ? (
                                <p className="text-[10px] text-muted-foreground pl-2">Sin anuncios</p>
                              ) : (ads || []).map(ad => {
                                const adSelected = selectedAdIds.has(ad.id);
                                return (
                                  <div key={ad.id} className={cn(
                                    'flex items-center gap-2 p-1 rounded cursor-pointer',
                                    adSelected ? 'bg-primary/5' : 'hover:bg-muted/20'
                                  )} onClick={() => onToggleAd(ad.id)}>
                                    <Checkbox checked={adSelected} onCheckedChange={() => onToggleAd(ad.id)} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-medium truncate">{ad.name}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        Gasto: {currency} {ad.spend.toFixed(2)} · {ad.resultType}: {ad.results}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export const GammaReportGenerator = ({ clientId, hasAdAccount }: GammaReportGeneratorProps) => {
  const { selectedClient } = useBrand();
  const [selectedSources, setSelectedSources] = useState<DataSource[]>(['campaigns', 'sales', 'content', 'social']);
  const [format, setFormat] = useState<GammaFormat>('presentation');
  const [customInstructions, setCustomInstructions] = useState('');
  const [numCards, setNumCards] = useState<string>('8');
  const [step, setStep] = useState<Step>('configure');
  const [generatedText, setGeneratedText] = useState('');
  const [isPreparingText, setIsPreparingText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Campaign selection
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<Set<string>>(new Set());
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());

  const { generate, isGenerating, generation, reset: resetGamma } = useGammaReport();
  const { data: gammaThemes, isLoading: themesLoading } = useGammaThemes();
  const saveReport = useSaveReport();

  // Data fetching
  const customRange = dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined;
  const { data: campaignsResult, isLoading: campaignsLoading } = useCampaigns(
    clientId,
    hasAdAccount && selectedSources.includes('campaigns'),
    'custom',
    customRange
  );

  const { data: salesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales', clientId, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      if (!clientId || !dateRange.from || !dateRange.to) return [];
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('message_sales')
        .select('*')
        .eq('client_id', clientId)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && selectedSources.includes('sales') && !!dateRange.from && !!dateRange.to,
  });

  const { platforms: socialPlatforms, isLoading: socialLoading } = useSocialFollowers(
    selectedSources.includes('social') ? clientId : null
  );

  // Content data - fetch all then filter by date
  const { content: allContent, isLoading: contentLoading } = useContentData(
    selectedSources.includes('content') ? clientId : null,
    500
  );

  // Filter content by date range
  const filteredContent = useMemo(() => {
    if (!dateRange.from || !dateRange.to || !allContent.length) return [];
    return allContent.filter(post => {
      const postDate = new Date(post.date);
      return isWithinInterval(postDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [allContent, dateRange.from, dateRange.to]);

  // Sort content by engagement for top posts
  const topContent = useMemo(() => {
    return [...filteredContent]
      .sort((a, b) => (b.engagement || 0) - (a.engagement || 0))
      .slice(0, 20);
  }, [filteredContent]);

  const campaigns = campaignsResult?.campaigns || [];
  const currency = campaignsResult?.currency || 'USD';

  const toggleSource = (source: DataSource) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleSelectAllCampaigns = () => setSelectedCampaignIds(new Set(campaigns.map(c => c.id)));
  const handleDeselectAllCampaigns = () => {
    setSelectedCampaignIds(new Set());
    setSelectedAdSetIds(new Set());
    setSelectedAdIds(new Set());
  };
  const toggleCampaign = (id: string) => {
    setSelectedCampaignIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleAdSet = (id: string) => {
    setSelectedAdSetIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleAd = (id: string) => {
    setSelectedAdIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const getDateLabel = (): string => {
    if (dateRange.from && dateRange.to) {
      return `${formatDate(dateRange.from, 'dd MMM yyyy', { locale: es })} – ${formatDate(dateRange.to, 'dd MMM yyyy', { locale: es })}`;
    }
    return 'Sin rango seleccionado';
  };

  const buildDashboardData = useCallback(() => {
    const data: Record<string, unknown> = {};

    if (selectedSources.includes('campaigns') && campaigns.length > 0) {
      const filteredCampaigns = selectedCampaignIds.size > 0
        ? campaigns.filter(c => selectedCampaignIds.has(c.id))
        : campaigns;

      const totals = filteredCampaigns.reduce(
        (acc, c) => ({
          spend: acc.spend + c.spend,
          reach: acc.reach + c.reach,
          clicks: acc.clicks + c.clicks,
          results: acc.results + c.results,
        }),
        { spend: 0, reach: 0, clicks: 0, results: 0 }
      );

      data.campaigns = {
        summary: {
          totalCampaigns: filteredCampaigns.length,
          totalSpend: `${totals.spend.toFixed(2)} ${currency}`,
          totalReach: totals.reach,
          totalClicks: totals.clicks,
          totalResults: totals.results,
          avgCPA: totals.results > 0 ? (totals.spend / totals.results).toFixed(2) : 'N/A',
        },
        details: filteredCampaigns.map(c => ({
          name: c.name,
          status: c.effectiveStatus,
          spend: c.spend,
          reach: c.reach,
          clicks: c.clicks,
          results: c.results,
          resultType: c.resultType,
          costPerResult: c.costPerResult,
          roas: c.roas,
        })),
      };
    }

    if (selectedSources.includes('sales') && salesData.length > 0) {
      const completedSales = salesData.filter((s: any) => s.status === 'completed');
      const totalCRC = completedSales.filter((s: any) => s.currency === 'CRC').reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const totalUSD = completedSales.filter((s: any) => s.currency === 'USD').reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const bySource = completedSales.reduce((acc: Record<string, number>, s: any) => {
        acc[s.source] = (acc[s.source] || 0) + 1;
        return acc;
      }, {});

      const adSales = completedSales.filter((s: any) => s.source === 'ad' && s.ad_campaign_name);
      const adSalesByCampaign = adSales.reduce((acc: Record<string, { count: number; totalCRC: number; totalUSD: number }>, s: any) => {
        const key = s.ad_campaign_name || 'Sin campaña';
        if (!acc[key]) acc[key] = { count: 0, totalCRC: 0, totalUSD: 0 };
        acc[key].count++;
        if (s.currency === 'CRC') acc[key].totalCRC += Number(s.amount);
        else acc[key].totalUSD += Number(s.amount);
        return acc;
      }, {});

      data.sales = {
        totalSales: salesData.length,
        completedSales: completedSales.length,
        totalCRC,
        totalUSD,
        bySource,
        adAttributedSales: adSalesByCampaign,
        topProducts: [...new Set(salesData.filter((s: any) => s.product).map((s: any) => s.product))].slice(0, 5),
      };
    }

    if (selectedSources.includes('content') && topContent.length > 0) {
      // Aggregate content stats by type
      const byType = filteredContent.reduce((acc: Record<string, { count: number; totalEngagement: number; totalViews: number }>, post) => {
        const type = post.type || 'post';
        if (!acc[type]) acc[type] = { count: 0, totalEngagement: 0, totalViews: 0 };
        acc[type].count++;
        acc[type].totalEngagement += post.engagement || 0;
        acc[type].totalViews += post.views || 0;
        return acc;
      }, {});

      // Aggregate by platform
      const byPlatform = filteredContent.reduce((acc: Record<string, { count: number; totalEngagement: number }>, post) => {
        const platform = post.network || 'unknown';
        if (!acc[platform]) acc[platform] = { count: 0, totalEngagement: 0 };
        acc[platform].count++;
        acc[platform].totalEngagement += post.engagement || 0;
        return acc;
      }, {});

      data.topContent = {
        totalPosts: filteredContent.length,
        contentByType: byType,
        contentByPlatform: byPlatform,
        avgEngagement: filteredContent.length > 0 ? Math.round(filteredContent.reduce((sum, p) => sum + (p.engagement || 0), 0) / filteredContent.length) : 0,
        top10Posts: topContent.slice(0, 10).map(post => ({
          title: post.title,
          type: post.type,
          platform: post.network,
          date: post.date,
          views: post.views || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          saves: post.saves || 0,
          engagement: post.engagement || 0,
          caption: post.caption?.substring(0, 200),
        })),
      };
    }

    if (selectedSources.includes('social') && socialPlatforms.length > 0) {
      data.socialFollowers = socialPlatforms.map(p => ({
        platform: p.platform,
        followers: p.followers,
        name: p.name,
      }));
    }

    return data;
  }, [selectedSources, campaigns, currency, salesData, socialPlatforms, selectedCampaignIds, topContent, filteredContent]);

  const handlePrepareText = async () => {
    if (selectedSources.length === 0) return;

    setIsPreparingText(true);
    try {
      const dashboardData = buildDashboardData();

      const { data, error } = await supabase.functions.invoke('prepare-gamma-report', {
        body: {
          dashboardData,
          clientName: selectedClient?.name,
          clientIndustry: selectedClient?.industry,
          clientContext: selectedClient?.ai_context,
          format,
          customInstructions,
          dateRange: getDateLabel(),
        },
      });

      if (error) throw error;
      if (!data?.text) throw new Error('No text generated');

      setGeneratedText(data.text);
      setStep('preview');
      setIsEditing(false);
    } catch (err) {
      console.error('Error preparing text:', err);
      toast.error('Error al preparar el texto del reporte');
    } finally {
      setIsPreparingText(false);
    }
  };

  const handleSaveReport = async () => {
    if (!clientId || !generatedText.trim()) return;
    try {
      await saveReport.mutateAsync({
        clientId,
        title: `Reporte ${getDateLabel()} - ${selectedClient?.name || 'Cliente'}`,
        templateType: 'gamma',
        prompt: customInstructions,
        content: generatedText,
      });
      toast.success('Reporte guardado exitosamente');
    } catch {
      toast.error('Error al guardar el reporte');
    }
  };

  const handleExportToGamma = () => {
    if (!generatedText.trim()) return;
    setStep('exporting');
    generate(generatedText, format, customInstructions || undefined, parseInt(numCards) || undefined, selectedThemeId || undefined);
  };

  if (generation?.status === 'completed' && step === 'exporting') {
    setStep('done');
  }

  const handleReset = () => {
    setStep('configure');
    setGeneratedText('');
    setIsEditing(false);
    resetGamma();
  };

  const isDataLoading = campaignsLoading || salesLoading || socialLoading || contentLoading;
  const hasData =
    (selectedSources.includes('campaigns') && campaigns.length > 0) ||
    (selectedSources.includes('sales') && salesData.length > 0) ||
    (selectedSources.includes('content') && filteredContent.length > 0) ||
    (selectedSources.includes('social') && socialPlatforms.length > 0);

  const selectionSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedSources.includes('campaigns')) {
      const count = selectedCampaignIds.size || campaigns.length;
      parts.push(`${count} campaña${count !== 1 ? 's' : ''}`);
    }
    if (selectedSources.includes('sales')) parts.push(`${salesData.length} venta${salesData.length !== 1 ? 's' : ''}`);
    if (selectedSources.includes('content')) parts.push(`${filteredContent.length} publicacion${filteredContent.length !== 1 ? 'es' : ''}`);
    if (selectedSources.includes('social')) parts.push(`${socialPlatforms.length} plataforma${socialPlatforms.length !== 1 ? 's' : ''}`);
    return parts;
  }, [selectedSources, selectedCampaignIds.size, campaigns.length, salesData.length, filteredContent.length, socialPlatforms.length]);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {[
          { key: 'configure', label: '1. Configurar' },
          { key: 'preview', label: '2. Reporte' },
          { key: 'exporting', label: '3. Exportar' },
          { key: 'done', label: '4. Listo' },
        ].map((s, i, arr) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
              step === s.key
                ? 'bg-primary text-primary-foreground'
                : ['done', 'exporting', 'preview'].indexOf(step) >= ['done', 'exporting', 'preview'].indexOf(s.key) && step !== 'configure'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            )}>
              {['preview', 'exporting', 'done'].indexOf(step) > ['preview', 'exporting', 'done'].indexOf(s.key) && s.key !== step ? (
                <Check className="h-3 w-3" />
              ) : null}
              {s.label}
            </div>
            {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Configure */}
      {step === 'configure' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Datos del Reporte
                </CardTitle>
                <CardDescription>
                  Selecciona el período, fuentes y campañas específicas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Date Range */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Período del reporte</label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateRange.from && 'text-muted-foreground'
                      )}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from && dateRange.to
                          ? `${formatDate(dateRange.from, 'dd MMM yyyy', { locale: es })} – ${formatDate(dateRange.to, 'dd MMM yyyy', { locale: es })}`
                          : 'Seleccionar fecha inicio y fin'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={(newRange) => {
                          setDateRange(newRange || { from: undefined, to: undefined });
                          if (newRange?.from && newRange?.to) setIsCalendarOpen(false);
                        }}
                        numberOfMonths={2}
                        locale={es}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Sources */}
                <div className="grid gap-2">
                  {dataSourceOptions.map(option => {
                    const isDisabled = option.id === 'campaigns' && !hasAdAccount;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          selectedSources.includes(option.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Checkbox
                          checked={selectedSources.includes(option.id)}
                          onCheckedChange={() => !isDisabled && toggleSource(option.id)}
                          disabled={isDisabled}
                        />
                        <div className="p-1.5 rounded-md bg-muted">
                          <option.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Data Summary */}
                {isDataLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    {selectionSummary.map((text, i) => (
                      <Badge key={i} variant="secondary">{text}</Badge>
                    ))}
                    {selectionSummary.length === 0 && (
                      <span className="text-xs text-muted-foreground">Selecciona al menos una fuente</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaign Selection Tree */}
            {selectedSources.includes('campaigns') && hasAdAccount && dateRange.from && dateRange.to && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Seleccionar Campañas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Elige campañas, conjuntos o anuncios específicos. Si no seleccionas nada, se incluyen todas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CampaignTree
                    clientId={clientId}
                    hasAdAccount={hasAdAccount}
                    dateRange={dateRange}
                    selectedCampaignIds={selectedCampaignIds}
                    selectedAdSetIds={selectedAdSetIds}
                    selectedAdIds={selectedAdIds}
                    onToggleCampaign={toggleCampaign}
                    onToggleAdSet={toggleAdSet}
                    onToggleAd={toggleAd}
                    onSelectAll={handleSelectAllCampaigns}
                    onDeselectAll={handleDeselectAllCampaigns}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: Options */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Opciones de Generación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Context */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Contexto del reporte <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="Ej: Enfócate en el ROAS. Usa un tono ejecutivo. Incluye recomendaciones de presupuesto..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                {customInstructions.trim().length === 0 && (
                  <p className="text-xs text-muted-foreground">Describe el enfoque, tono y puntos clave del reporte.</p>
                )}
              </div>

              {/* Format + Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Formato</label>
                  <Select value={format} onValueChange={(v) => setFormat(v as GammaFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presentation">
                        <span className="flex items-center gap-2"><Presentation className="h-4 w-4" /> Presentación</span>
                      </SelectItem>
                      <SelectItem value="document">
                        <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documento</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Slides / Secciones</label>
                  <Select value={numCards} onValueChange={setNumCards}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8, 10, 12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Gamma Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Palette className="h-4 w-4" />
                  Tema de Gamma (para exportar)
                </label>
                <Select value={selectedThemeId} onValueChange={setSelectedThemeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tema por defecto del workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_default">Tema por defecto</SelectItem>
                    {themesLoading ? (
                      <SelectItem value="_loading" disabled>Cargando temas...</SelectItem>
                    ) : (gammaThemes || []).map(theme => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  El tema se aplica al exportar a Gamma. La vista previa usa formato markdown.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handlePrepareText}
                disabled={isPreparingText || selectedSources.length === 0 || !hasData || isDataLoading || !customInstructions.trim() || !dateRange.from || !dateRange.to}
                className="w-full"
                size="lg"
              >
                {isPreparingText ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando datos...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Preview (main report view) */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Reporte Generado
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedClient?.name} · {getDateLabel()}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {format === 'presentation' ? 'Presentación' : 'Documento'} • {numCards} slides
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {isEditing ? 'Ver preview' : 'Editar'}
              </Button>
            </div>
          </div>

          {isEditing ? (
            <Card>
              <CardContent className="pt-6">
                <ScrollArea className="h-[550px]">
                  <Textarea
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    className="min-h-[530px] font-mono text-sm resize-none border-0 focus-visible:ring-0 p-0"
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <ReportPreview content={generatedText} />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setStep('configure')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerar
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={handleSaveReport}
              disabled={saveReport.isPending || !generatedText.trim()}
            >
              {saveReport.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
            <Button
              onClick={handleExportToGamma}
              disabled={!generatedText.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Exportar a Gamma
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Exporting to Gamma */}
      {step === 'exporting' && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div>
              <p className="text-lg font-semibold">Gamma está creando tu {format === 'presentation' ? 'presentación' : 'documento'}...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Esto puede tardar hasta 1 minuto. No cierres esta página.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setStep('preview'); resetGamma(); }}>
              Cancelar y volver al reporte
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === 'done' && generation?.gammaUrl && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
              {format === 'presentation' ? (
                <Presentation className="h-20 w-20 text-primary" />
              ) : (
                <FileText className="h-20 w-20 text-primary" />
              )}
            </div>
            <div>
              <p className="text-xl font-bold">
                ¡Exportado exitosamente! 🎉
              </p>
              <p className="text-muted-foreground mt-1">
                Tu reporte fue exportado a Gamma con el tema seleccionado
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <Button
                className="w-full sm:flex-1"
                size="lg"
                onClick={() => window.open(generation.gammaUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir en Gamma
              </Button>
              {generation.exportUrl && (
                <Button
                  variant="outline"
                  className="w-full sm:flex-1"
                  size="lg"
                  onClick={() => window.open(generation.exportUrl, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setStep('preview')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al reporte
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generar otro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed state */}
      {generation?.status === 'failed' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-destructive font-medium">Error al exportar a Gamma</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setStep('preview')}>
                Volver al reporte
              </Button>
              <Button variant="outline" onClick={handleExportToGamma}>
                Reintentar exportación
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
