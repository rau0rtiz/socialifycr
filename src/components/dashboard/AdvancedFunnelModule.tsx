import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Filter,
  RefreshCw,
  CalendarIcon,
  Calculator,
  ArrowRight,
  ArrowDown,
  TrendingUp,
  DollarSign,
  Target,
  Copy,
  Trash2,
  Plus,
  Link,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFunnelAnalytics } from '@/hooks/use-funnel-analytics';
import { useUTMTracking, UTMInput } from '@/hooks/use-utm-tracking';
import { DatePresetKey, DateRange } from '@/hooks/use-ads-data';
import { toast } from 'sonner';

interface AdvancedFunnelModuleProps {
  clientId: string | null;
  hasAdAccount: boolean;
}

const datePresetLabels: Record<DatePresetKey, string> = {
  last_7d: 'Últimos 7 días',
  last_14d: 'Últimos 14 días',
  last_30d: 'Últimos 30 días',
  last_90d: 'Últimos 90 días',
  this_month: 'Este mes',
  last_month: 'Mes pasado',
  custom: 'Personalizado',
};

const funnelColors = [
  'hsl(222, 47%, 20%)',
  'hsl(210, 80%, 50%)',
  'hsl(173, 80%, 40%)',
  'hsl(142, 70%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 75%, 55%)',
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatCurrency = (value: number, currency: string = 'USD') => {
  const localeMap: Record<string, string> = { USD: 'en-US', CRC: 'es-CR', MXN: 'es-MX' };
  return new Intl.NumberFormat(localeMap[currency] || 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
};

// ============= FUNNEL VISUAL =============
const FunnelVisual = ({
  stages,
  conversionRates,
  spend,
  currency,
}: {
  stages: { id: string; name: string; value: number; source: string }[];
  conversionRates: { from: string; to: string; rate: number }[];
  spend: number;
  currency: string;
}) => {
  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay datos disponibles para el período seleccionado.</p>
      </div>
    );
  }

  const maxValue = Math.max(...stages.map(s => s.value));
  const overallRate = stages.length >= 2 && stages[0].value > 0
    ? (stages[stages.length - 1].value / stages[0].value * 100).toFixed(2)
    : null;

  return (
    <div className="flex flex-col items-center gap-0 py-4">
      {stages.map((stage, index) => {
        const displayWidth = 100 - (index * (70 / Math.max(stages.length - 1, 1)));
        const convRate = conversionRates[index - 1];
        const color = funnelColors[index % funnelColors.length];
        const isLast = index === stages.length - 1;

        return (
          <div key={stage.id} className="w-full flex flex-col items-center">
            {convRate && (
              <div className="flex items-center gap-2 py-1">
                <div className="h-3 w-px bg-border" />
                <Badge variant="secondary" className="text-[10px] px-2 py-0 font-mono bg-muted">
                  {(convRate.rate * 100).toFixed(1)}%
                </Badge>
                <div className="h-3 w-px bg-border" />
              </div>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative flex flex-col items-center justify-center px-4 py-4 transition-all duration-500 cursor-pointer hover:brightness-110 hover:shadow-lg"
                    style={{
                      width: `${displayWidth}%`,
                      clipPath: isLast
                        ? 'polygon(5% 0, 95% 0, 100% 100%, 0% 100%)'
                        : 'polygon(2% 0, 98% 0, 95% 100%, 5% 100%)',
                      borderRadius: index === 0 ? '8px 8px 0 0' : isLast ? '0 0 8px 8px' : '0',
                      background: color,
                    }}
                  >
                    <div className="flex items-center gap-2 z-10">
                      <span className="font-semibold text-xs md:text-sm text-white">{stage.name}</span>
                      {stage.source === 'sales' && (
                        <Badge variant="outline" className="text-[9px] bg-white/20 text-white border-white/30">
                          Ventas
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold text-base md:text-lg tabular-nums text-white z-10 mt-0.5">
                      {formatNumber(stage.value)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{stage.name}: {stage.value.toLocaleString()}</p>
                  {convRate && <p className="text-xs text-muted-foreground">Tasa: {(convRate.rate * 100).toFixed(2)}% desde {convRate.from}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      })}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border w-full grid grid-cols-2 md:grid-cols-3 gap-3">
        {overallRate && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">Conversión Total</p>
              <p className="text-xs md:text-sm font-bold truncate">{overallRate}%</p>
            </div>
          </div>
        )}
        {spend > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">Gasto Total</p>
              <p className="text-xs md:text-sm font-bold truncate">{formatCurrency(spend, currency)}</p>
            </div>
          </div>
        )}
        {stages.find(s => s.id === 'sales') && spend > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Target className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">Costo por Venta</p>
              <p className="text-xs md:text-sm font-bold truncate">
                {formatCurrency(spend / (stages.find(s => s.id === 'sales')?.value || 1), currency)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============= SANKEY DIAGRAM =============
const SankeyDiagram = ({
  nodes,
  links,
}: {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number; sourceName?: string; targetName?: string }[];
}) => {
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);

  if (nodes.length < 2 || links.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Se necesitan al menos 2 etapas con datos para visualizar el flujo.</p>
      </div>
    );
  }

  const width = 800;
  const height = 400;
  const nodeWidth = 20;
  const nodePadding = 30;

  // Calculate node positions and heights
  const maxValue = Math.max(...links.map(l => l.value));
  const nodeHeights = nodes.map((_, idx) => {
    const incomingValue = links.filter(l => l.target === idx).reduce((sum, l) => sum + l.value, 0);
    const outgoingValue = links.filter(l => l.source === idx).reduce((sum, l) => sum + l.value, 0);
    const maxNodeValue = Math.max(incomingValue, outgoingValue);
    return maxNodeValue > 0 ? (maxNodeValue / maxValue) * (height - nodePadding * 2) : 0;
  });

  // Position nodes in columns
  const columns = Math.ceil(Math.sqrt(nodes.length));
  const columnWidth = (width - nodeWidth) / Math.max(columns - 1, 1);
  const nodePositions = nodes.map((node, idx) => {
    const col = Math.floor(idx / Math.ceil(nodes.length / columns));
    const rowInCol = idx % Math.ceil(nodes.length / columns);
    return {
      x: col * columnWidth,
      y: height / 2 - nodeHeights[idx] / 2 + rowInCol * 20,
      height: Math.max(nodeHeights[idx], 30),
    };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[350px] md:h-[400px]"
        style={{ minWidth: '600px' }}
      >
        {/* Draw links */}
        {links.map((link, idx) => {
          const sourcePos = nodePositions[link.source];
          const targetPos = nodePositions[link.target];
          if (!sourcePos || !targetPos) return null;

          const sourceX = sourcePos.x + nodeWidth;
          const sourceY = sourcePos.y + sourcePos.height / 2;
          const targetX = targetPos.x;
          const targetY = targetPos.y + targetPos.height / 2;

          const controlX = (sourceX + targetX) / 2;
          const color = funnelColors[link.source % funnelColors.length];
          const isHovered = hoveredLink === idx;

          return (
            <g key={idx}>
              <path
                d={`M ${sourceX} ${sourceY} C ${controlX} ${sourceY}, ${controlX} ${targetY}, ${targetX} ${targetY}`}
                stroke={color}
                strokeWidth={Math.max(2, (link.value / maxValue) * 20)}
                strokeOpacity={isHovered ? 0.6 : 0.3}
                fill="none"
                onMouseEnter={() => setHoveredLink(idx)}
                onMouseLeave={() => setHoveredLink(null)}
                className="cursor-pointer transition-all duration-200"
              />
              {isHovered && (
                <foreignObject x={controlX - 60} y={(sourceY + targetY) / 2 - 20} width="120" height="40">
                  <div className="bg-popover p-1.5 rounded shadow-lg border border-border text-[10px] text-center">
                    <p className="font-medium truncate">{formatNumber(link.value)}</p>
                    {link.sourceName && link.targetName && (
                      <p className="text-muted-foreground truncate">{link.sourceName} → {link.targetName}</p>
                    )}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Draw nodes */}
        {nodes.map((node, idx) => {
          const pos = nodePositions[idx];
          if (!pos) return null;
          const color = funnelColors[idx % funnelColors.length];

          return (
            <g key={idx}>
              <rect
                x={pos.x}
                y={pos.y}
                width={nodeWidth}
                height={pos.height}
                fill={color}
                rx={4}
                ry={4}
              />
              <text
                x={pos.x + nodeWidth + 5}
                y={pos.y + pos.height / 2}
                dominantBaseline="middle"
                className="fill-foreground text-[10px] md:text-xs font-medium"
              >
                {node.name.length > 15 ? node.name.slice(0, 15) + '…' : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============= PROJECTION CALCULATOR =============
const ProjectionCalculator = ({
  stages,
  conversionRates,
  calculateProjection,
  spend,
  currency,
}: {
  stages: { id: string; name: string; value: number }[];
  conversionRates: { from: string; to: string; rate: number }[];
  calculateProjection: (stageId: string, value: number) => { stage: string; projected: number }[];
  spend: number;
  currency: string;
}) => {
  const [targetStage, setTargetStage] = useState(stages[stages.length - 1]?.id || '');
  const [targetValue, setTargetValue] = useState('');
  const [projections, setProjections] = useState<{ stage: string; projected: number }[]>([]);

  const handleCalculate = useCallback(() => {
    const val = parseInt(targetValue);
    if (!val || !targetStage) return;
    const result = calculateProjection(targetStage, val);
    setProjections(result);
  }, [targetStage, targetValue, calculateProjection]);

  if (stages.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Se necesitan al menos 2 etapas con datos para hacer proyecciones.</p>
      </div>
    );
  }

  // Cost per impression for budget estimation
  const costPerImpression = stages[0]?.value > 0 && spend > 0 ? spend / stages[0].value : 0;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <p className="text-sm font-medium">Calculadora de Proyecciones</p>
        <p className="text-xs text-muted-foreground">
          Basado en las tasas de conversión históricas del período seleccionado, calcula cuánto necesitas en cada etapa.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={targetStage} onValueChange={setTargetStage}>
            <SelectTrigger className="flex-1 h-9 text-xs">
              <SelectValue placeholder="Etapa objetivo" />
            </SelectTrigger>
            <SelectContent>
              {stages.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Meta (cantidad)"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="flex-1 h-9 text-xs"
          />

          <Button size="sm" className="h-9" onClick={handleCalculate} disabled={!targetValue || !targetStage}>
            <Calculator className="h-3.5 w-3.5 mr-1" />
            Calcular
          </Button>
        </div>
      </div>

      {projections.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Proyección basada en tasas históricas:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {projections.map((proj, idx) => {
              const isTarget = stages[idx]?.id === targetStage;
              const actualValue = stages[idx]?.value || 0;
              const diff = proj.projected - actualValue;

              return (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border",
                    isTarget ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] md:text-xs text-muted-foreground truncate">{proj.stage}</span>
                    {isTarget && <Badge className="text-[8px] px-1.5">Meta</Badge>}
                  </div>
                  <p className="text-sm md:text-base font-bold">{formatNumber(proj.projected)}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">Actual: {formatNumber(actualValue)}</span>
                    {diff !== 0 && (
                      <span className={cn("text-[10px] font-medium", diff > 0 ? "text-amber-600" : "text-emerald-600")}>
                        ({diff > 0 ? '+' : ''}{formatNumber(diff)})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Budget estimation */}
          {costPerImpression > 0 && projections[0]?.projected > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mt-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Presupuesto Estimado</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(projections[0].projected * costPerImpression, currency)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Basado en costo por impresión de {formatCurrency(costPerImpression, currency)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Historical Conversion Rates Table */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Tasas de conversión históricas:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {conversionRates.map((cr, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <span className="text-[10px] md:text-xs truncate flex-1">{cr.from}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] md:text-xs truncate flex-1">{cr.to}</span>
              <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                {(cr.rate * 100).toFixed(1)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============= UTM TRACKER =============
const UTMTracker = ({ clientId }: { clientId: string | null }) => {
  const { records, isLoading, createUTM, deleteUTM, buildUTMUrl } = useUTMTracking(clientId);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<UTMInput>({
    campaign_name: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    destination_url: '',
  });

  const previewUrl = useMemo(() => {
    if (!form.destination_url) return '';
    return buildUTMUrl(form.destination_url, form);
  }, [form, buildUTMUrl]);

  const handleCreate = async () => {
    if (!form.campaign_name || !form.utm_source || !form.utm_medium || !form.utm_campaign || !form.destination_url) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    try {
      await createUTM.mutateAsync(form);
      toast.success('UTM creado exitosamente');
      setForm({
        campaign_name: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        destination_url: '',
      });
      setIsCreating(false);
    } catch {
      toast.error('Error al crear UTM');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copiada al portapapeles');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Genera URLs con parámetros UTM para rastrear el origen de tus ventas.</p>
        <Button size="sm" variant="outline" onClick={() => setIsCreating(!isCreating)} className="h-8 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Nuevo UTM
        </Button>
      </div>

      {/* Creation Form */}
      {isCreating && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground font-medium">Nombre interno *</label>
              <Input
                placeholder="Ej: Black Friday IG"
                value={form.campaign_name}
                onChange={(e) => setForm(f => ({ ...f, campaign_name: e.target.value }))}
                className="h-8 text-xs mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium">URL destino *</label>
              <Input
                placeholder="https://tusitio.com/landing"
                value={form.destination_url}
                onChange={(e) => setForm(f => ({ ...f, destination_url: e.target.value }))}
                className="h-8 text-xs mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium">utm_source *</label>
              <Input
                placeholder="instagram, facebook, google"
                value={form.utm_source}
                onChange={(e) => setForm(f => ({ ...f, utm_source: e.target.value }))}
                className="h-8 text-xs mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium">utm_medium *</label>
              <Input
                placeholder="cpc, social, email"
                value={form.utm_medium}
                onChange={(e) => setForm(f => ({ ...f, utm_medium: e.target.value }))}
                className="h-8 text-xs mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium">utm_campaign *</label>
              <Input
                placeholder="black_friday_2026"
                value={form.utm_campaign}
                onChange={(e) => setForm(f => ({ ...f, utm_campaign: e.target.value }))}
                className="h-8 text-xs mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium">utm_term</label>
              <Input
                placeholder="zapatos_mujer"
                value={form.utm_term || ''}
                onChange={(e) => setForm(f => ({ ...f, utm_term: e.target.value }))}
                className="h-8 text-xs mt-0.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] text-muted-foreground font-medium">utm_content</label>
              <Input
                placeholder="banner_hero, cta_bottom"
                value={form.utm_content || ''}
                onChange={(e) => setForm(f => ({ ...f, utm_content: e.target.value }))}
                className="h-8 text-xs mt-0.5"
              />
            </div>
          </div>

          {/* Preview URL */}
          {previewUrl && (
            <div className="p-2 bg-background rounded border border-border">
              <label className="text-[10px] text-muted-foreground font-medium">Vista previa:</label>
              <p className="text-xs font-mono break-all text-primary mt-0.5">{previewUrl}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsCreating(false)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createUTM.isPending} className="h-8 text-xs">
              {createUTM.isPending ? 'Guardando...' : 'Guardar UTM'}
            </Button>
          </div>
        </div>
      )}

      {/* Records List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay UTMs creados aún</p>
          <p className="text-xs">Crea tu primer enlace UTM para rastrear campañas.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {records.map(record => (
            <div key={record.id} className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{record.campaign_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{record.full_url}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">source: {record.utm_source}</Badge>
                    <Badge variant="outline" className="text-[9px]">medium: {record.utm_medium}</Badge>
                    <Badge variant="outline" className="text-[9px]">campaign: {record.utm_campaign}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(record.full_url)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(record.full_url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-destructive/10"
                    onClick={() => deleteUTM.mutate(record.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============= MAIN COMPONENT =============
export const AdvancedFunnelModule = ({ clientId, hasAdAccount }: AdvancedFunnelModuleProps) => {
  const [datePreset, setDatePreset] = useState<DatePresetKey>('last_30d');
  const [customRange, setCustomRange] = useState<DateRange>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('all');

  const {
    stages,
    conversionRates,
    sankeyNodes,
    sankeyLinks,
    campaigns,
    isLoading,
    refetch,
    calculateProjection,
    spend,
    currency,
  } = useFunnelAnalytics(clientId, hasAdAccount, datePreset, customRange, selectedCampaignId);

  const handleRefresh = async () => {
    await refetch();
    toast.success('Datos actualizados');
  };

  if (!hasAdAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Filter className="h-5 w-5" />
            Funnel Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Conecta una cuenta de Meta Ads para visualizar el funnel.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Filter className="h-5 w-5" />
              Funnel Analytics
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePresetKey)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(datePresetLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {datePreset === 'custom' && (
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      {customRange.from && customRange.to
                        ? `${format(customRange.from, 'dd/MM', { locale: es })} - ${format(customRange.to, 'dd/MM', { locale: es })}`
                        : 'Seleccionar fechas'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={customRange.from && customRange.to ? { from: customRange.from, to: customRange.to } : undefined}
                      onSelect={(range) => {
                        if (range) {
                          setCustomRange(range);
                          if (range.from && range.to) setIsCalendarOpen(false);
                        }
                      }}
                      numberOfMonths={2}
                      locale={es}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}

              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Campaña" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las campañas</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="h-8">
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-8">
            {[100, 80, 60, 40, 20].map((w, i) => (
              <Skeleton key={i} className="h-14" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="funnel" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="funnel" className="text-xs">
                <ArrowDown className="h-3 w-3 mr-1" />
                Embudo
              </TabsTrigger>
              <TabsTrigger value="sankey" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Flujo
              </TabsTrigger>
              <TabsTrigger value="calculator" className="text-xs">
                <Calculator className="h-3 w-3 mr-1" />
                Proyección
              </TabsTrigger>
              <TabsTrigger value="utm" className="text-xs">
                <Link className="h-3 w-3 mr-1" />
                UTM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="funnel" className="mt-4">
              <FunnelVisual
                stages={stages}
                conversionRates={conversionRates}
                spend={spend || 0}
                currency={currency || 'USD'}
              />
            </TabsContent>

            <TabsContent value="sankey" className="mt-4">
              <SankeyDiagram nodes={sankeyNodes} links={sankeyLinks} />
            </TabsContent>

            <TabsContent value="calculator" className="mt-4">
              <ProjectionCalculator
                stages={stages}
                conversionRates={conversionRates}
                calculateProjection={calculateProjection}
                spend={spend || 0}
                currency={currency || 'USD'}
              />
            </TabsContent>

            <TabsContent value="utm" className="mt-4">
              <UTMTracker clientId={clientId} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
