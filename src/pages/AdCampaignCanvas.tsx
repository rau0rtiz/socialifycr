import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, Paperclip, Image as ImageIcon, Film, GalleryHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { useAdFramework } from '@/hooks/use-ad-frameworks';
import { useAdCampaign, useSyncCampaignVariants } from '@/hooks/use-ad-campaigns';
import { useAdVariants, type AdVariant, type VariantStatus, type CreativeType } from '@/hooks/use-ad-variants';
import { Badge } from '@/components/ui/badge';
import { VariantDetailSheet } from '@/components/ad-frameworks/VariantDetailSheet';
import { cn } from '@/lib/utils';
import { format as formatDate, differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const CREATIVE_META: Record<CreativeType, { icon: typeof ImageIcon; label: string }> = {
  photo:    { icon: ImageIcon,         label: 'Foto' },
  reel:     { icon: Film,              label: 'Reel' },
  carousel: { icon: GalleryHorizontal, label: 'Carrusel' },
};

const STATUS_META: Record<VariantStatus, { label: string; cls: string }> = {
  draft:       { label: 'Pendiente',   cls: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En progreso', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300' },
  ready:       { label: 'Listo',       cls: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300' },
  published:   { label: 'Subido',      cls: 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300' },
};

const AdCampaignCanvas = () => {
  const { id, campaignId } = useParams<{ id: string; campaignId: string }>();
  const navigate = useNavigate();
  const { data: framework } = useAdFramework(id);
  const { data: campaign } = useAdCampaign(campaignId);
  const { data: variants } = useAdVariants(campaignId);
  const sync = useSyncCampaignVariants();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const angles = useMemo(() => framework?.dimensions.filter((d) => d.dimension_type === 'angle') ?? [], [framework]);
  const formats = useMemo(() => framework?.dimensions.filter((d) => d.dimension_type === 'format') ?? [], [framework]);
  const hooks = useMemo(() => framework?.dimensions.filter((d) => d.dimension_type === 'hook') ?? [], [framework]);

  const variantMap = useMemo(() => {
    const m: Record<string, AdVariant> = {};
    (variants ?? []).forEach((v) => { m[`${v.angle_id}|${v.format_id}|${v.hook_id}`] = v; });
    return m;
  }, [variants]);

  const selectedVariant = (variants ?? []).find((v) => v.id === selectedVariantId) ?? null;

  if (!framework || !campaign) {
    return <DashboardLayout><div className="text-muted-foreground py-12 text-center">Cargando campaña...</div></DashboardLayout>;
  }

  const expectedTotal = angles.length * formats.length * hooks.length;
  const actualTotal = variants?.length ?? 0;
  const needsSync = actualTotal < expectedTotal;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/ad-frameworks/${id}`)} className="gap-1.5 -ml-2 mb-2">
            <ArrowLeft className="h-4 w-4" /> {framework.name}
          </Button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              {campaign.description && <p className="text-muted-foreground text-sm mt-1">{campaign.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                {actualTotal} de {expectedTotal} variantes · {angles.length} ángulos × {formats.length} formatos × {hooks.length} hooks
              </p>
            </div>
            {needsSync && campaignId && (
              <Button variant="outline" onClick={() => sync.mutate(campaignId)} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Sincronizar variantes
              </Button>
            )}
          </div>
        </div>

        {angles.length === 0 || formats.length === 0 || hooks.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            El framework no tiene todas las dimensiones configuradas.
          </Card>
        ) : (
          <Tabs defaultValue={angles[0].id}>
            <TabsList className="flex-wrap h-auto">
              {angles.map((a) => (
                <TabsTrigger key={a.id} value={a.id} className="gap-1.5">
                  {a.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />}
                  {a.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {angles.map((angle) => (
              <TabsContent key={angle.id} value={angle.id} className="mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-2">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24"></th>
                        {hooks.map((h) => (
                          <th key={h.id} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
                            {h.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {formats.map((f) => (
                        <tr key={f.id}>
                          <td className="text-sm font-medium pr-2 w-24 align-top pt-3">{f.label}</td>
                          {hooks.map((h) => {
                            const v = variantMap[`${angle.id}|${f.id}|${h.id}`];
                            return (
                              <td key={h.id} className="align-top">
                                {v ? (
                                  <VariantCard variant={v} angleColor={angle.color} onClick={() => setSelectedVariantId(v.id)} />
                                ) : (
                                  <Card className="p-3 border-dashed text-xs text-muted-foreground italic min-h-[220px] flex items-center justify-center">
                                    Sin variante
                                  </Card>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {selectedVariant && framework && (
        <VariantDetailSheet
          variant={selectedVariant}
          framework={framework}
          open={!!selectedVariantId}
          onOpenChange={(o) => { if (!o) setSelectedVariantId(null); }}
        />
      )}
    </DashboardLayout>
  );
};

const VariantCard = ({ variant, angleColor, onClick }: { variant: AdVariant; angleColor?: string | null; onClick: () => void }) => {
  const meta = STATUS_META[variant.status];
  const creative = variant.creative_type ? CREATIVE_META[variant.creative_type] : null;
  const CreativeIcon = creative?.icon;
  const slideCount = Array.isArray(variant.slides) ? variant.slides.length : 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all border-l-4 min-h-[220px] flex flex-col gap-2',
      )}
      style={angleColor ? { borderLeftColor: angleColor } : {}}
    >
      {/* Header: tipo creativo + assets */}
      <div className="flex items-center justify-between gap-2">
        {creative && CreativeIcon ? (
          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <CreativeIcon className="h-3 w-3" /> {creative.label}
            {variant.creative_type === 'carousel' && slideCount > 0 && (
              <span className="text-muted-foreground/70">· {slideCount} slides</span>
            )}
          </div>
        ) : (
          <div className="text-[10px] font-medium text-muted-foreground/60 italic uppercase tracking-wider">Sin tipo</div>
        )}
        {variant.assets.length > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Paperclip className="h-2.5 w-2.5" /> {variant.assets.length}
          </span>
        )}
      </div>

      {/* Fecha de entrega con color coding */}
      {variant.due_date && (() => {
        const d = parseISO(variant.due_date);
        const days = differenceInCalendarDays(d, new Date());
        const isDone = variant.status === 'published';
        const cls = isDone
          ? 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300'
          : days < 0
            ? 'bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-300'
            : days <= 2
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300';
        const label = isDone
          ? `Entregado · ${formatDate(d, 'd MMM', { locale: es })}`
          : days < 0
            ? `Vencida · ${Math.abs(days)}d`
            : days === 0
              ? 'Entrega hoy'
              : `${formatDate(d, 'd MMM', { locale: es })} · en ${days}d`;
        return (
          <div className={cn('flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded w-fit', cls)}>
            <CalendarIcon className="h-2.5 w-2.5" /> {label}
          </div>
        );
      })()}

      {/* Hook */}
      <div>
        <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-0.5">Hook</div>
        <p className="text-xs line-clamp-3 font-semibold leading-snug">
          {variant.hook_text || <span className="text-muted-foreground italic font-normal">Sin hook escrito</span>}
        </p>
      </div>

      {/* Copy */}
      <div className="flex-1 min-h-0">
        <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-0.5">Copy</div>
        {variant.copy ? (
          <p className="text-[11px] text-muted-foreground line-clamp-4 leading-snug whitespace-pre-wrap">
            {variant.copy}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/50 italic">Sin copy</p>
        )}
      </div>

      {/* Footer: CTA + estado */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        {variant.cta ? (
          <span className="text-[10px] font-medium text-primary truncate max-w-[60%]" title={variant.cta}>
            → {variant.cta}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50 italic">Sin CTA</span>
        )}
        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 shrink-0', meta.cls)}>
          {meta.label}
        </Badge>
      </div>
    </Card>
  );
};

export default AdCampaignCanvas;
