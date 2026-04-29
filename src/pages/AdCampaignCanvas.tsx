import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft, RefreshCw, Paperclip, Image as ImageIcon, Film, GalleryHorizontal,
  Calendar as CalendarIcon, LayoutGrid, Columns3, Plus, Check, X, Trash2, Grid3x3,
} from 'lucide-react';
import { CampaignProgressHeader } from '@/components/ad-frameworks/CampaignProgressHeader';
import { AngleSectionBoard } from '@/components/ad-frameworks/AngleSectionBoard';
import { GalleryView } from '@/components/ad-frameworks/GalleryView';
import { useAdFramework } from '@/hooks/use-ad-frameworks';
import { useAdCampaign, useSyncCampaignVariants } from '@/hooks/use-ad-campaigns';
import {
  useAdVariants,
  useUpdateAdVariant,
  useBulkUpdateVariants,
  type AdVariant,
  type VariantStatus,
  type CreativeType,
} from '@/hooks/use-ad-variants';
import { Badge } from '@/components/ui/badge';
import { VariantDetailSheet } from '@/components/ad-frameworks/VariantDetailSheet';
import { cn } from '@/lib/utils';
import {
  format as formatDate, differenceInCalendarDays, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths,
  startOfWeek, endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const CREATIVE_META: Record<CreativeType, { icon: typeof ImageIcon; label: string }> = {
  photo:    { icon: ImageIcon,         label: 'Foto' },
  reel:     { icon: Film,              label: 'Reel' },
  carousel: { icon: GalleryHorizontal, label: 'Carrusel' },
};

const STATUS_META: Record<VariantStatus, { label: string; cls: string; dotCls: string }> = {
  draft:       { label: 'Pendiente',   cls: 'bg-muted text-muted-foreground',                                                  dotCls: 'bg-muted-foreground/40' },
  in_progress: { label: 'En progreso', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',             dotCls: 'bg-amber-500' },
  ready:       { label: 'Listo',       cls: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300',     dotCls: 'bg-emerald-500' },
  published:   { label: 'Subido',      cls: 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300',                 dotCls: 'bg-blue-500' },
};

const STATUS_ORDER: VariantStatus[] = ['draft', 'in_progress', 'ready', 'published'];

type ViewMode = 'matrix' | 'kanban' | 'calendar';

const AdCampaignCanvas = () => {
  const { id, campaignId } = useParams<{ id: string; campaignId: string }>();
  const navigate = useNavigate();
  const { data: framework } = useAdFramework(id);
  const { data: campaign } = useAdCampaign(campaignId);
  const { data: variants } = useAdVariants(campaignId);
  const sync = useSyncCampaignVariants();
  const update = useUpdateAdVariant();
  const bulkUpdate = useBulkUpdateVariants();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('matrix');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const angles = useMemo(() => framework?.dimensions.filter((d) => d.dimension_type === 'angle') ?? [], [framework]);
  const formats = useMemo(() => framework?.dimensions.filter((d) => d.dimension_type === 'format') ?? [], [framework]);
  const hooks = useMemo(() => framework?.dimensions.filter((d) => d.dimension_type === 'hook') ?? [], [framework]);

  const hasHooks = hooks.length > 0;

  const variantMap = useMemo(() => {
    const m: Record<string, AdVariant> = {};
    (variants ?? []).forEach((v) => {
      const key = hasHooks ? `${v.angle_id}|${v.format_id}|${v.hook_id}` : `${v.angle_id}|${v.format_id}`;
      m[key] = v;
    });
    return m;
  }, [variants, hasHooks]);

  const selectedVariant = (variants ?? []).find((v) => v.id === selectedVariantId) ?? null;

  if (!framework || !campaign) {
    return <DashboardLayout><div className="text-muted-foreground py-12 text-center">Cargando campaña...</div></DashboardLayout>;
  }

  const expectedTotal = hasHooks
    ? angles.length * formats.length * hooks.length
    : angles.length * formats.length;
  const actualTotal = variants?.length ?? 0;
  const needsSync = actualTotal < expectedTotal;
  const missingCount = expectedTotal - actualTotal;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false); };

  const applyBulkStatus = (status: VariantStatus) => {
    if (selectedIds.size === 0 || !campaignId) return;
    bulkUpdate.mutate(
      { ids: Array.from(selectedIds), campaign_id: campaignId, patch: { status } as any },
      { onSuccess: () => clearSelection() },
    );
  };

  const applyBulkDate = (dateStr: string) => {
    if (selectedIds.size === 0 || !campaignId) return;
    bulkUpdate.mutate(
      { ids: Array.from(selectedIds), campaign_id: campaignId, patch: { due_date: dateStr || null } as any },
      { onSuccess: () => clearSelection() },
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/ad-frameworks/${id}`)} className="gap-1.5 -ml-2 mb-2">
            <ArrowLeft className="h-4 w-4" /> {framework.name}
          </Button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              {campaign.description && <p className="text-muted-foreground text-sm mt-1">{campaign.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                {actualTotal} de {expectedTotal} variantes · {angles.length} ángulos × {formats.length} formatos{hasHooks ? ` × ${hooks.length} hooks` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* View switcher */}
              <div className="inline-flex items-center rounded-md border p-0.5 bg-muted/40">
                <ViewBtn active={view === 'matrix'} onClick={() => setView('matrix')} icon={LayoutGrid} label="Matriz" />
                <ViewBtn active={view === 'kanban'} onClick={() => setView('kanban')} icon={Columns3} label="Kanban" />
                <ViewBtn active={view === 'calendar'} onClick={() => setView('calendar')} icon={CalendarIcon} label="Calendario" />
              </div>

              <Button
                variant={selectMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectMode((s) => !s); if (selectMode) setSelectedIds(new Set()); }}
                className="gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> {selectMode ? 'Salir de selección' : 'Seleccionar'}
              </Button>

              {needsSync && campaignId && (
                <Button onClick={() => sync.mutate(campaignId)} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Sincronizar
                  <Badge variant="secondary" className="ml-1 font-mono">+{missingCount}</Badge>
                </Button>
              )}
            </div>
          </div>
        </div>

        {angles.length === 0 || formats.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            El framework no tiene todas las dimensiones configuradas.
          </Card>
        ) : view === 'matrix' ? (
          <MatrixView
            angles={angles}
            formats={formats}
            hooks={hooks}
            variantMap={variantMap}
            campaignId={campaignId!}
            onOpenVariant={setSelectedVariantId}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSync={() => campaignId && sync.mutate(campaignId)}
            syncPending={sync.isPending}
          />
        ) : view === 'kanban' ? (
          <KanbanView
            variants={variants ?? []}
            framework={framework}
            onOpenVariant={setSelectedVariantId}
            onChangeStatus={(id, status) => update.mutate({ id, status })}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        ) : (
          <CalendarView
            variants={variants ?? []}
            framework={framework}
            onOpenVariant={setSelectedVariantId}
          />
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-xl rounded-full px-3 py-2 flex items-center gap-1.5">
          <Badge variant="secondary" className="font-mono">{selectedIds.size}</Badge>
          <span className="text-xs text-muted-foreground mr-2">seleccionada{selectedIds.size === 1 ? '' : 's'}</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-1.5 h-8">Estado</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STATUS_ORDER.map((s) => (
                <DropdownMenuItem key={s} onClick={() => applyBulkStatus(s)}>
                  <span className={cn('h-2 w-2 rounded-full mr-2', STATUS_META[s].dotCls)} />
                  {STATUS_META[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-1.5 h-8">
                <CalendarIcon className="h-3.5 w-3.5" /> Fecha
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="center">
              <Input type="date" onChange={(e) => applyBulkDate(e.target.value)} className="h-9" />
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => applyBulkDate('')}>
                Quitar fecha
              </Button>
            </PopoverContent>
          </Popover>

          <Button size="sm" variant="ghost" className="h-8" onClick={clearSelection}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

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

const ViewBtn = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof LayoutGrid; label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors',
      active ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
    )}
  >
    <Icon className="h-3.5 w-3.5" /> {label}
  </button>
);

// ============================================================
// MATRIX VIEW
// ============================================================
const MatrixView = ({
  angles, formats, hooks, variantMap, campaignId, onOpenVariant,
  selectMode, selectedIds, onToggleSelect, onSync, syncPending,
}: {
  angles: any[]; formats: any[]; hooks: any[];
  variantMap: Record<string, AdVariant>;
  campaignId: string;
  onOpenVariant: (id: string) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSync: () => void;
  syncPending: boolean;
}) => {
  const hasHooks = hooks.length > 0;

  // 2D mode: angles as columns/tabs, formats as rows, single cell per (angle,format)
  if (!hasHooks) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-2">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32"></th>
              {angles.map((a) => (
                <th key={a.id} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
                  <span className="inline-flex items-center gap-1.5">
                    {a.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />}
                    {a.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {formats.map((f) => (
              <tr key={f.id}>
                <td className="text-sm font-medium pr-2 w-32 align-top pt-3">{f.label}</td>
                {angles.map((angle) => {
                  const v = variantMap[`${angle.id}|${f.id}`];
                  return (
                    <td key={angle.id} className="align-top">
                      {v ? (
                        <VariantCard
                          variant={v}
                          angleColor={angle.color}
                          onClick={() => {
                            if (selectMode) onToggleSelect(v.id);
                            else onOpenVariant(v.id);
                          }}
                          selectMode={selectMode}
                          selected={selectedIds.has(v.id)}
                        />
                      ) : (
                        <button
                          onClick={onSync}
                          disabled={syncPending}
                          className="border border-dashed rounded-md p-3 text-xs text-muted-foreground italic min-h-[220px] w-full flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:text-foreground transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Crear variante
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 3D mode: tabs by angle, hooks as columns, formats as rows
  return (
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
                            <VariantCard
                              variant={v}
                              angleColor={angle.color}
                              onClick={() => {
                                if (selectMode) onToggleSelect(v.id);
                                else onOpenVariant(v.id);
                              }}
                              selectMode={selectMode}
                              selected={selectedIds.has(v.id)}
                            />
                          ) : (
                            <button
                              onClick={onSync}
                              disabled={syncPending}
                              className="border border-dashed rounded-md p-3 text-xs text-muted-foreground italic min-h-[220px] w-full flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:text-foreground transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              Crear variante
                            </button>
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
  );
};

// ============================================================
// KANBAN VIEW
// ============================================================
const KanbanView = ({
  variants, framework, onOpenVariant, onChangeStatus,
  selectMode, selectedIds, onToggleSelect,
}: {
  variants: AdVariant[];
  framework: any;
  onOpenVariant: (id: string) => void;
  onChangeStatus: (id: string, status: VariantStatus) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) => {
  const byStatus: Record<VariantStatus, AdVariant[]> = {
    draft: [], in_progress: [], ready: [], published: [],
  };
  variants.forEach((v) => { byStatus[v.status].push(v); });

  // sort each column by due_date asc (nulls last)
  STATUS_ORDER.forEach((s) => {
    byStatus[s].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s];
        const items = byStatus[s];
        return (
          <div key={s} className="bg-muted/30 rounded-lg p-2">
            <div className="flex items-center justify-between px-1.5 py-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', meta.dotCls)} />
                <span className="text-xs font-semibold uppercase tracking-wider">{meta.label}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic text-center py-4">Vacío</p>
              ) : items.map((v) => {
                const angle = framework.dimensions.find((d: any) => d.id === v.angle_id);
                return (
                  <KanbanCard
                    key={v.id}
                    variant={v}
                    angleColor={angle?.color}
                    angleLabel={angle?.label}
                    framework={framework}
                    onOpen={() => {
                      if (selectMode) onToggleSelect(v.id);
                      else onOpenVariant(v.id);
                    }}
                    onChangeStatus={(st) => onChangeStatus(v.id, st)}
                    selectMode={selectMode}
                    selected={selectedIds.has(v.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const KanbanCard = ({
  variant, angleColor, angleLabel, framework, onOpen, onChangeStatus,
  selectMode, selected,
}: {
  variant: AdVariant;
  angleColor?: string | null;
  angleLabel?: string;
  framework: any;
  onOpen: () => void;
  onChangeStatus: (s: VariantStatus) => void;
  selectMode: boolean;
  selected: boolean;
}) => {
  const format = framework.dimensions.find((d: any) => d.id === variant.format_id);
  const hook = framework.dimensions.find((d: any) => d.id === variant.hook_id);
  return (
    <Card
      onClick={onOpen}
      className={cn(
        'p-2.5 cursor-pointer hover:shadow-md transition-all border-l-4 space-y-1.5',
        selected && 'ring-2 ring-primary',
      )}
      style={angleColor ? { borderLeftColor: angleColor } : {}}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {angleLabel && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4" style={angleColor ? { borderColor: angleColor, color: angleColor } : {}}>{angleLabel}</Badge>}
          {format && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{format.label}</Badge>}
          {hook && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{hook.label}</Badge>}
        </div>
        {selectMode && <Checkbox checked={selected} className="shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()} onCheckedChange={onOpen as any} />}
      </div>
      {variant.hook_text ? (
        <p className="text-xs font-medium line-clamp-2">{variant.hook_text}</p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sin hook escrito</p>
      )}
      <div className="flex items-center justify-between gap-1.5 pt-1">
        <DueChip dueDate={variant.due_date} status={variant.status} compact />
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
              Mover →
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {STATUS_ORDER.filter((s) => s !== variant.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onChangeStatus(s)}>
                <span className={cn('h-2 w-2 rounded-full mr-2', STATUS_META[s].dotCls)} />
                {STATUS_META[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

// ============================================================
// CALENDAR VIEW
// ============================================================
const CalendarView = ({
  variants, framework, onOpenVariant,
}: {
  variants: AdVariant[];
  framework: any;
  onOpenVariant: (id: string) => void;
}) => {
  const [refMonth, setRefMonth] = useState(new Date());
  const monthStart = startOfMonth(refMonth);
  const monthEnd = endOfMonth(refMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const byDay: Record<string, AdVariant[]> = {};
  variants.forEach((v) => {
    if (!v.due_date) return;
    const key = v.due_date;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(v);
  });

  const noDate = variants.filter((v) => !v.due_date);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize">{formatDate(refMonth, "MMMM yyyy", { locale: es })}</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setRefMonth(subMonths(refMonth, 1))}>←</Button>
          <Button variant="outline" size="sm" onClick={() => setRefMonth(new Date())}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => setRefMonth(addMonths(refMonth, 1))}>→</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => <div key={d} className="text-center py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = formatDate(day, 'yyyy-MM-dd');
          const items = byDay[key] ?? [];
          const isCurrentMonth = day >= monthStart && day <= monthEnd;
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={cn(
                'min-h-[100px] border rounded p-1 text-xs',
                !isCurrentMonth && 'bg-muted/20 text-muted-foreground/50',
                isToday && 'border-primary border-2',
              )}
            >
              <div className="font-mono text-[10px] mb-1 text-right">{formatDate(day, 'd')}</div>
              <div className="space-y-1">
                {items.slice(0, 4).map((v) => {
                  const angle = framework.dimensions.find((d: any) => d.id === v.angle_id);
                  const meta = STATUS_META[v.status];
                  return (
                    <button
                      key={v.id}
                      onClick={() => onOpenVariant(v.id)}
                      className={cn('w-full text-left px-1 py-0.5 rounded text-[9px] truncate border-l-2 hover:opacity-80 transition-opacity', meta.cls)}
                      style={angle?.color ? { borderLeftColor: angle.color } : {}}
                      title={v.hook_text ?? ''}
                    >
                      {v.hook_text || `${angle?.label ?? ''}`}
                    </button>
                  );
                })}
                {items.length > 4 && (
                  <div className="text-[9px] text-muted-foreground text-center">+{items.length - 4} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {noDate.length > 0 && (
        <Card className="p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Sin fecha asignada ({noDate.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {noDate.map((v) => {
              const angle = framework.dimensions.find((d: any) => d.id === v.angle_id);
              return (
                <button
                  key={v.id}
                  onClick={() => onOpenVariant(v.id)}
                  className="text-[10px] border rounded px-1.5 py-0.5 hover:bg-muted transition-colors"
                  style={angle?.color ? { borderLeftColor: angle.color, borderLeftWidth: 3 } : {}}
                >
                  {v.hook_text || angle?.label || 'Variante'}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

// ============================================================
// SHARED: Due chip
// ============================================================
const DueChip = ({ dueDate, status, compact = false }: { dueDate: string | null; status: VariantStatus; compact?: boolean }) => {
  if (!dueDate) {
    return compact ? <span className="text-[10px] text-muted-foreground/60 italic">Sin fecha</span> : null;
  }
  const d = parseISO(dueDate);
  const days = differenceInCalendarDays(d, new Date());
  const isDone = status === 'published';
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
        ? 'Hoy'
        : `${formatDate(d, 'd MMM', { locale: es })}${compact ? '' : ` · en ${days}d`}`;
  return (
    <div className={cn('flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded w-fit', cls)}>
      <CalendarIcon className="h-2.5 w-2.5" /> {label}
    </div>
  );
};

// ============================================================
// MATRIX: VARIANT CARD with INLINE EDIT
// ============================================================
const VariantCard = ({
  variant, angleColor, onClick, selectMode, selected,
}: {
  variant: AdVariant;
  angleColor?: string | null;
  onClick: () => void;
  selectMode: boolean;
  selected: boolean;
}) => {
  const update = useUpdateAdVariant();
  const meta = STATUS_META[variant.status];
  const creative = variant.creative_type ? CREATIVE_META[variant.creative_type] : null;
  const CreativeIcon = creative?.icon;
  const slideCount = Array.isArray(variant.slides) ? variant.slides.length : 0;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all border-l-4 min-h-[220px] flex flex-col gap-2 relative',
        selected && 'ring-2 ring-primary',
      )}
      style={angleColor ? { borderLeftColor: angleColor } : {}}
    >
      {selectMode && (
        <Checkbox
          checked={selected}
          onClick={stop}
          onCheckedChange={() => onClick()}
          className="absolute top-2 right-2 z-10 bg-background"
        />
      )}

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

      {/* Inline editable fecha */}
      <Popover>
        <PopoverTrigger asChild onClick={stop}>
          <button onClick={stop} className="w-fit hover:opacity-80 transition-opacity">
            {variant.due_date ? (
              <DueChip dueDate={variant.due_date} status={variant.status} />
            ) : (
              <span className="text-[10px] text-muted-foreground/60 italic flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed">
                <CalendarIcon className="h-2.5 w-2.5" /> Asignar fecha
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" onClick={stop} align="start">
          <Input
            type="date"
            value={variant.due_date ?? ''}
            onChange={(e) => update.mutate({ id: variant.id, due_date: e.target.value || null } as any)}
            className="h-8 text-xs"
          />
          {variant.due_date && (
            <Button variant="ghost" size="sm" className="w-full mt-1 h-7 text-xs" onClick={() => update.mutate({ id: variant.id, due_date: null } as any)}>
              Quitar fecha
            </Button>
          )}
        </PopoverContent>
      </Popover>

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

      {/* Footer: CTA + estado (clickeable inline) */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        {variant.cta ? (
          <span className="text-[10px] font-medium text-primary truncate max-w-[55%]" title={variant.cta}>
            → {variant.cta}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50 italic">Sin CTA</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={stop}>
            <button onClick={stop}>
              <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 shrink-0 cursor-pointer hover:opacity-80', meta.cls)}>
                {meta.label}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={stop}>
            {STATUS_ORDER.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => update.mutate({ id: variant.id, status: s })}
                className={s === variant.status ? 'bg-muted' : ''}
              >
                <span className={cn('h-2 w-2 rounded-full mr-2', STATUS_META[s].dotCls)} />
                {STATUS_META[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

export default AdCampaignCanvas;
