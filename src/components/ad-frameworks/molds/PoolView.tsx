import { useMemo, useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MoldVariantCard } from '../MoldVariantCard';
import { useCreateAdVariant, useDeleteAdVariant, type AdVariant, type VariantStatus } from '@/hooks/use-ad-variants';
import type { AdFrameworkDimension, AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';

interface Props {
  framework: AdFrameworkWithDimensions;
  campaignId: string;
  variants: AdVariant[];
  onOpenVariant: (id: string) => void;
}

const STATUS_OPTIONS: { value: VariantStatus; label: string }[] = [
  { value: 'draft', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'ready', label: 'Listo' },
  { value: 'published', label: 'Subido' },
];

/**
 * Pool mold: flat gallery of variants with chip filters by content_type & status.
 */
export const PoolView = ({ framework, campaignId, variants, onOpenVariant }: Props) => {
  const createVariant = useCreateAdVariant();
  const deleteVariant = useDeleteAdVariant();
  const contentTypes = useMemo(
    () => framework.dimensions.filter((d) => d.dimension_type === 'content_type'),
    [framework.dimensions],
  );
  const ctMap = useMemo(() => {
    const m: Record<string, AdFrameworkDimension> = {};
    contentTypes.forEach((c) => { m[c.id] = c; });
    return m;
  }, [contentTypes]);

  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<VariantStatus>>(new Set());

  const toggleType = (id: string) => {
    setTypeFilter((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleStatus = (s: VariantStatus) => {
    setStatusFilter((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  };

  const filtered = useMemo(() => {
    return variants.filter((v) => {
      if (typeFilter.size > 0 && (!v.format_id || !typeFilter.has(v.format_id))) return false;
      if (statusFilter.size > 0 && !statusFilter.has(v.status)) return false;
      return true;
    });
  }, [variants, typeFilter, statusFilter]);

  const handleAdd = (contentTypeId: string | null) => {
    createVariant.mutate({
      campaign_id: campaignId,
      format_id: contentTypeId,
      position: variants.length,
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Tipo:</span>
        {contentTypes.length === 0 && <span className="text-xs italic text-muted-foreground">sin tipos</span>}
        {contentTypes.map((ct) => (
          <Chip key={ct.id} active={typeFilter.has(ct.id)} onClick={() => toggleType(ct.id)}>
            {ct.label}
          </Chip>
        ))}
        <span className="text-xs text-muted-foreground ml-2">Estado:</span>
        {STATUS_OPTIONS.map((s) => (
          <Chip key={s.value} active={statusFilter.has(s.value)} onClick={() => toggleStatus(s.value)}>
            {s.label}
          </Chip>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-mono">
            {filtered.length}/{variants.length}
          </Badge>
          {contentTypes.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Añadir variante
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {contentTypes.map((ct) => (
                  <DropdownMenuItem key={ct.id} onClick={() => handleAdd(ct.id)}>
                    {ct.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => handleAdd(null)} className="text-muted-foreground">
                  Sin tipo definido
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={() => handleAdd(null)}>
              <Plus className="h-3.5 w-3.5" /> Añadir variante
            </Button>
          )}
        </div>
      </Card>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          {variants.length === 0
            ? 'Pool vacío. Añade tu primera variante para empezar a producir.'
            : 'Ninguna variante coincide con los filtros activos.'}
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((v) => (
            <MoldVariantCard
              key={v.id}
              variant={v}
              contentTypeLabel={v.format_id ? ctMap[v.format_id]?.label : undefined}
              onClick={() => onOpenVariant(v.id)}
              onDelete={() => deleteVariant.mutate({ id: v.id, campaign_id: campaignId })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/50',
    )}
  >
    {children}
  </button>
);
