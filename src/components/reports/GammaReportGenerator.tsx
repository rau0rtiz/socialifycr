import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Presentation, FileText, ExternalLink, Download, RefreshCw,
  Sparkles, BarChart3, ShoppingCart, Users, Loader2
} from 'lucide-react';
import { useCampaigns } from '@/hooks/use-ads-data';
import { useSalesTracking } from '@/hooks/use-sales-tracking';
import { useSocialFollowers } from '@/hooks/use-social-followers';
import { useGammaReport, GammaFormat } from '@/hooks/use-gamma-report';
import { cn } from '@/lib/utils';

interface GammaReportGeneratorProps {
  clientId: string | null;
  hasAdAccount: boolean;
}

type DataSource = 'campaigns' | 'sales' | 'social';

const dataSourceOptions: { id: DataSource; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'campaigns', label: 'Campañas Meta Ads', icon: BarChart3, description: 'Gasto, alcance, clics, ROAS' },
  { id: 'sales', label: 'Ventas', icon: ShoppingCart, description: 'Ventas registradas del mes' },
  { id: 'social', label: 'Redes Sociales', icon: Users, description: 'Seguidores por plataforma' },
];

export const GammaReportGenerator = ({ clientId, hasAdAccount }: GammaReportGeneratorProps) => {
  const [selectedSources, setSelectedSources] = useState<DataSource[]>(['campaigns']);
  const [format, setFormat] = useState<GammaFormat>('presentation');
  const [customInstructions, setCustomInstructions] = useState('');
  const [numCards, setNumCards] = useState<string>('8');

  const { generate, isGenerating, generation, reset } = useGammaReport();

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
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const buildInputText = (): string => {
    const sections: string[] = [];

    sections.push('Genera un reporte profesional de marketing digital en español con los siguientes datos:\n');

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

      sections.push('## CAMPAÑAS META ADS (Últimos 30 días)');
      sections.push(`Total de campañas: ${campaigns.length}`);
      sections.push(`Inversión total: ${totals.spend.toFixed(2)} ${currency}`);
      sections.push(`Alcance total: ${totals.reach.toLocaleString()}`);
      sections.push(`Clics totales: ${totals.clicks.toLocaleString()}`);
      sections.push(`Resultados totales: ${totals.results.toLocaleString()}\n`);

      sections.push('Detalle por campaña:');
      campaigns.forEach(c => {
        sections.push(`- ${c.name}: Gasto ${c.spend.toFixed(2)} ${currency}, Alcance ${c.reach.toLocaleString()}, Clics ${c.clicks}, Resultados ${c.results} (${c.resultType}), CPA ${c.costPerResult.toFixed(2)} ${currency}${c.roas ? `, ROAS ${c.roas.toFixed(2)}` : ''}`);
      });
      sections.push('');
    }

    if (selectedSources.includes('sales') && sales.length > 0) {
      const totalCRC = sales.filter(s => s.currency === 'CRC').reduce((sum, s) => sum + s.amount, 0);
      const totalUSD = sales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + s.amount, 0);
      const bySource = sales.reduce((acc, s) => {
        acc[s.source] = (acc[s.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      sections.push('## VENTAS DEL MES');
      sections.push(`Total de ventas: ${sales.length}`);
      if (totalCRC > 0) sections.push(`Total CRC: ₡${totalCRC.toLocaleString()}`);
      if (totalUSD > 0) sections.push(`Total USD: $${totalUSD.toLocaleString()}`);
      sections.push(`Fuentes: ${Object.entries(bySource).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      sections.push('');
    }

    if (selectedSources.includes('social') && socialPlatforms.length > 0) {
      sections.push('## REDES SOCIALES');
      socialPlatforms.forEach(p => {
        sections.push(`- ${p.platform}: ${p.followers.toLocaleString()} seguidores`);
      });
      sections.push('');
    }

    return sections.join('\n');
  };

  const handleGenerate = () => {
    if (selectedSources.length === 0) {
      return;
    }

    const inputText = buildInputText();
    generate(inputText, format, customInstructions || undefined, parseInt(numCards) || undefined);
  };

  const isDataLoading = campaignsLoading || salesLoading || socialLoading;

  const hasData =
    (selectedSources.includes('campaigns') && campaigns.length > 0) ||
    (selectedSources.includes('sales') && sales.length > 0) ||
    (selectedSources.includes('social') && socialPlatforms.length > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Panel - Configuration */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generar con Gamma
            </CardTitle>
            <CardDescription>
              Crea presentaciones o documentos profesionales con tus datos reales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Data Sources */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Datos a incluir</label>
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
            </div>

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
                placeholder="Ej: Enfócate en el ROAS de las campañas de ventas. Usa un tono ejecutivo..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
                className="resize-none"
              />
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
                  <span className="text-xs text-muted-foreground">Selecciona al menos una fuente de datos</span>
                )}
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || selectedSources.length === 0 || !hasData || isDataLoading}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generando en Gamma...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generar en Gamma
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Result */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-base">Resultado</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-[400px] flex flex-col items-center justify-center">
          {isGenerating && !generation?.gammaUrl && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <p className="font-medium">Generando tu {format === 'presentation' ? 'presentación' : 'documento'}...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Gamma está creando tu reporte. Esto puede tardar hasta 1 minuto.
                </p>
              </div>
            </div>
          )}

          {generation?.status === 'completed' && generation.gammaUrl && (
            <div className="text-center space-y-6 w-full">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                {format === 'presentation' ? (
                  <Presentation className="h-16 w-16 text-primary mx-auto" />
                ) : (
                  <FileText className="h-16 w-16 text-primary mx-auto" />
                )}
                <div>
                  <p className="font-semibold text-lg">
                    ¡{format === 'presentation' ? 'Presentación' : 'Documento'} listo!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tu reporte fue generado exitosamente en Gamma
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => window.open(generation.gammaUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en Gamma
                </Button>

                {generation.exportUrl && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(generation.exportUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={reset}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generar otro
                </Button>
              </div>
            </div>
          )}

          {generation?.status === 'failed' && (
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">Error al generar el reporte</p>
              <Button variant="outline" onClick={reset}>
                Intentar de nuevo
              </Button>
            </div>
          )}

          {!isGenerating && !generation && (
            <div className="text-center text-muted-foreground space-y-2">
              <Presentation className="h-12 w-12 mx-auto opacity-50" />
              <p>Tu reporte de Gamma aparecerá aquí</p>
              <p className="text-xs">Selecciona los datos y haz clic en generar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
