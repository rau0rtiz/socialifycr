import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Presentation, FileText, ExternalLink, Download, RefreshCw,
  Sparkles, BarChart3, ShoppingCart, Users, Loader2, Eye,
  ArrowRight, ArrowLeft, Check, Pencil
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCampaigns } from '@/hooks/use-ads-data';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { useSocialFollowers } from '@/hooks/use-social-followers';
import { useGammaReport, GammaFormat } from '@/hooks/use-gamma-report';
import { useBrand } from '@/contexts/BrandContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GammaReportGeneratorProps {
  clientId: string | null;
  hasAdAccount: boolean;
}

type DataSource = 'campaigns' | 'sales' | 'social';
type Step = 'configure' | 'review' | 'generating' | 'done';

const dataSourceOptions: { id: DataSource; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'campaigns', label: 'Campañas Meta Ads', icon: BarChart3, description: 'Gasto, alcance, clics, ROAS' },
  { id: 'sales', label: 'Ventas', icon: ShoppingCart, description: 'Ventas registradas del mes' },
  { id: 'social', label: 'Redes Sociales', icon: Users, description: 'Seguidores por plataforma' },
];

export const GammaReportGenerator = ({ clientId, hasAdAccount }: GammaReportGeneratorProps) => {
  const { selectedClient } = useBrand();
  const [selectedSources, setSelectedSources] = useState<DataSource[]>(['campaigns', 'sales', 'social']);
  const [format, setFormat] = useState<GammaFormat>('presentation');
  const [customInstructions, setCustomInstructions] = useState('');
  const [numCards, setNumCards] = useState<string>('8');
  const [step, setStep] = useState<Step>('configure');
  const [generatedText, setGeneratedText] = useState('');
  const [isPreparingText, setIsPreparingText] = useState(false);

  const { generate, isGenerating, generation, reset: resetGamma } = useGammaReport();

  const { data: campaignsResult, isLoading: campaignsLoading } = useCampaigns(
    clientId,
    hasAdAccount && selectedSources.includes('campaigns'),
    'last_30d'
  );

  const { sales, isLoading: salesLoading } = useSalesTracking(
    selectedSources.includes('sales') ? clientId : null
  );

  const { platforms: socialPlatforms, isLoading: socialLoading } = useSocialFollowers(
    selectedSources.includes('social') ? clientId : null
  );

  const campaigns = campaignsResult?.campaigns || [];
  const currency = campaignsResult?.currency || 'USD';

  const toggleSource = (source: DataSource) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const buildDashboardData = useCallback(() => {
    const data: Record<string, unknown> = {};

    if (selectedSources.includes('campaigns') && campaigns.length > 0) {
      const totals = campaigns.reduce(
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
          totalCampaigns: campaigns.length,
          totalSpend: `${totals.spend.toFixed(2)} ${currency}`,
          totalReach: totals.reach,
          totalClicks: totals.clicks,
          totalResults: totals.results,
          avgCPA: totals.results > 0 ? (totals.spend / totals.results).toFixed(2) : 'N/A',
        },
        details: campaigns.map(c => ({
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

    if (selectedSources.includes('sales') && sales.length > 0) {
      const totalCRC = sales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + s.amount, 0);
      const totalUSD = sales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + s.amount, 0);
      const bySource = sales.reduce((acc, s) => {
        acc[s.source] = (acc[s.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const byStatus = sales.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      data.sales = {
        totalSales: sales.length,
        totalCRC,
        totalUSD,
        bySource,
        byStatus,
        topProducts: [...new Set(sales.filter(s => s.product).map(s => s.product))].slice(0, 5),
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
  }, [selectedSources, campaigns, currency, sales, socialPlatforms]);

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
        },
      });

      if (error) throw error;
      if (!data?.text) throw new Error('No text generated');

      setGeneratedText(data.text);
      setStep('review');
    } catch (err) {
      console.error('Error preparing text:', err);
      toast.error('Error al preparar el texto del reporte');
    } finally {
      setIsPreparingText(false);
    }
  };

  const handleSendToGamma = () => {
    if (!generatedText.trim()) return;
    setStep('generating');
    generate(generatedText, format, customInstructions || undefined, parseInt(numCards) || undefined);
  };

  // Watch for Gamma completion
  if (generation?.status === 'completed' && step === 'generating') {
    setStep('done');
  }

  const handleReset = () => {
    setStep('configure');
    setGeneratedText('');
    resetGamma();
  };

  const isDataLoading = campaignsLoading || salesLoading || socialLoading;
  const hasData =
    (selectedSources.includes('campaigns') && campaigns.length > 0) ||
    (selectedSources.includes('sales') && sales.length > 0) ||
    (selectedSources.includes('social') && socialPlatforms.length > 0);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: 'configure', label: '1. Configurar' },
          { key: 'review', label: '2. Revisar texto' },
          { key: 'generating', label: '3. Generar' },
          { key: 'done', label: '4. Listo' },
        ].map((s, i, arr) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
              step === s.key
                ? 'bg-primary text-primary-foreground'
                : ['done', 'generating', 'review'].indexOf(step) >= ['done', 'generating', 'review'].indexOf(s.key) && step !== 'configure'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            )}>
              {['review', 'generating', 'done'].indexOf(step) > ['review', 'generating', 'done'].indexOf(s.key) && s.key !== step ? (
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Datos del Reporte
              </CardTitle>
              <CardDescription>
                Selecciona qué datos incluir. Perplexity los analizará para crear el contenido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                  {selectedSources.includes('campaigns') && (
                    <Badge variant="secondary">{campaigns.length} campañas</Badge>
                  )}
                  {selectedSources.includes('sales') && (
                    <Badge variant="secondary">{sales.length} ventas</Badge>
                  )}
                  {selectedSources.includes('social') && (
                    <Badge variant="secondary">{socialPlatforms.length} plataformas</Badge>
                  )}
                  {selectedSources.length === 0 && (
                    <span className="text-xs text-muted-foreground">Selecciona al menos una fuente</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opciones de Generación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Format */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Formato</label>
                  <Select value={format} onValueChange={(v) => setFormat(v as GammaFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presentation">
                        <span className="flex items-center gap-2">
                          <Presentation className="h-4 w-4" /> Presentación
                        </span>
                      </SelectItem>
                      <SelectItem value="document">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Documento
                        </span>
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

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Instrucciones adicionales (opcional)</label>
                <Textarea
                  placeholder="Ej: Enfócate en el ROAS. Usa un tono ejecutivo. Incluye recomendaciones de presupuesto..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handlePrepareText}
                disabled={isPreparingText || selectedSources.length === 0 || !hasData || isDataLoading}
                className="w-full"
                size="lg"
              >
                {isPreparingText ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando datos con Perplexity...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Analizar y Previsualizar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Review text */}
      {step === 'review' && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Revisar Contenido
              </CardTitle>
              <CardDescription className="mt-1">
                Perplexity analizó tus datos. Revisa y edita el texto antes de enviarlo a Gamma.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {format === 'presentation' ? 'Presentación' : 'Documento'} • {numCards} slides
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[400px]">
              <Textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                className="min-h-[380px] font-mono text-sm resize-none border-0 focus-visible:ring-0 p-0"
              />
            </ScrollArea>

            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep('configure')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button
                className="flex-1"
                size="lg"
                onClick={handleSendToGamma}
                disabled={!generatedText.trim()}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enviar a Gamma
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generating */}
      {step === 'generating' && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div>
              <p className="text-lg font-semibold">Gamma está creando tu {format === 'presentation' ? 'presentación' : 'documento'}...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Esto puede tardar hasta 1 minuto. No cierres esta página.
              </p>
            </div>
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
                ¡{format === 'presentation' ? 'Presentación' : 'Documento'} listo! 🎉
              </p>
              <p className="text-muted-foreground mt-1">
                Tu reporte fue generado exitosamente en Gamma
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

            <Button variant="ghost" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Generar otro reporte
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Failed state */}
      {generation?.status === 'failed' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-destructive font-medium">Error al generar el reporte en Gamma</p>
            <Button variant="outline" onClick={handleReset}>Intentar de nuevo</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
