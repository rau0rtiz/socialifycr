import { useMemo, useState } from 'react';
import { Plus, Target, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MoldVariantCard } from '../MoldVariantCard';
import {
  useCreateAdVariant, useDeleteAdVariant, type AdVariant,
} from '@/hooks/use-ad-variants';
import { useUpsertDimension, useDeleteDimension, type AdFrameworkDimension, type AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';

interface Props {
  framework: AdFrameworkWithDimensions;
  campaignId: string;
  variants: AdVariant[];
  onOpenVariant: (id: string) => void;
}

/**
 * Awareness mold: 5 vertical columns (one per awareness level), each with its
 * core_messages as collapsible groups, and variants under each message.
 */
export const AwarenessView = ({ framework, campaignId, variants, onOpenVariant }: Props) => {
  const levels = useMemo(
    () => framework.dimensions.filter((d) => d.dimension_type === 'awareness_level').sort((a, b) => a.position - b.position),
    [framework.dimensions],
  );
  const messages = useMemo(
    () => framework.dimensions.filter((d) => d.dimension_type === 'core_message'),
    [framework.dimensions],
  );
  const contentTypes = useMemo(
    () => framework.dimensions.filter((d) => d.dimension_type === 'content_type'),
    [framework.dimensions],
  );

  if (levels.length === 0) {
    return (
      <Card className="p-12 text-center space-y-3">
        <Target className="h-10 w-10 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Configura los niveles de awareness desde "Editar dimensiones".</p>
      </Card>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
      {levels.map((level) => (
        <LevelColumn
          key={level.id}
          framework={framework}
          level={level}
          campaignId={campaignId}
          messages={messages.filter((m) => (m.metadata as any)?.level_id === level.id)}
          variants={variants.filter((v) => v.awareness_level_id === level.id)}
          contentTypes={contentTypes}
          onOpenVariant={onOpenVariant}
        />
      ))}
    </div>
  );
};

const LevelColumn = ({
  framework, level, campaignId, messages, variants, contentTypes, onOpenVariant,
}: {
  framework: AdFrameworkWithDimensions;
  level: AdFrameworkDimension;
  campaignId: string;
  messages: AdFrameworkDimension[];
  variants: AdVariant[];
  contentTypes: AdFrameworkDimension[];
  onOpenVariant: (id: string) => void;
}) => {
  const upsertDim = useUpsertDimension();
  const deleteDim = useDeleteDimension();
  const createVariant = useCreateAdVariant();
  const deleteVariant = useDeleteAdVariant();
  const [newMsg, setNewMsg] = useState('');

  const accent = level.color ?? 'hsl(var(--primary))';
  const stats = useMemo(() => {
    const total = variants.length;
    const ready = variants.filter((v) => v.status === 'ready' || v.status === 'published').length;
    return { total, ready, pct: total > 0 ? Math.round((ready / total) * 100) : 0 };
  }, [variants]);

  const handleAddMessage = () => {
    if (!newMsg.trim()) return;
    upsertDim.mutate({
      framework_id: framework.id,
      dimension_type: 'core_message',
      label: newMsg.trim(),
      metadata: { level_id: level.id },
      position: messages.length,
    } as any);
    setNewMsg('');
  };

  return (
    <section
      className="shrink-0 w-[300px] rounded-lg border-2 bg-card flex flex-col max-h-[calc(100vh-260px)]"
      style={{ borderColor: accent + '50' }}
    >
      <div className="px-3 py-2.5 border-b" style={{ borderLeft: `4px solid ${accent}` }}>
        <h3 className="font-semibold text-sm">{level.label}</h3>
        <div className="flex items-center gap-2 mt-1.5">
          <Progress value={stats.pct} className="h-1 flex-1" />
          <span className="text-[10px] tabular-nums text-muted-foreground font-mono">
            {stats.ready}/{stats.total}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {messages.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic text-center py-2">
            Sin mensajes centrales
          </p>
        )}

        {messages.map((msg) => (
          <MessageGroup
            key={msg.id}
            framework={framework}
            level={level}
            message={msg}
            campaignId={campaignId}
            variants={variants.filter((v) => v.core_message_id === msg.id)}
            contentTypes={contentTypes}
            onOpenVariant={onOpenVariant}
            onDelete={() => deleteDim.mutate({ id: msg.id, framework_id: framework.id })}
            onCreateVariant={(ctId) => createVariant.mutate({
              campaign_id: campaignId,
              awareness_level_id: level.id,
              core_message_id: msg.id,
              format_id: ctId,
              position: variants.filter((v) => v.core_message_id === msg.id).length,
            })}
            onDeleteVariant={(vid) => deleteVariant.mutate({ id: vid, campaign_id: campaignId })}
          />
        ))}

        {/* Add new message */}
        <div className="flex gap-1 mt-2 pt-2 border-t border-dashed">
          <Input
            placeholder="Nuevo mensaje central..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddMessage(); }}
            className="h-7 text-xs"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleAddMessage} disabled={!newMsg.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

const MessageGroup = ({
  framework, level, message, campaignId, variants, contentTypes, onOpenVariant, onDelete, onCreateVariant, onDeleteVariant,
}: {
  framework: AdFrameworkWithDimensions;
  level: AdFrameworkDimension;
  message: AdFrameworkDimension;
  campaignId: string;
  variants: AdVariant[];
  contentTypes: AdFrameworkDimension[];
  onOpenVariant: (id: string) => void;
  onDelete: () => void;
  onCreateVariant: (contentTypeId: string | null) => void;
  onDeleteVariant: (id: string) => void;
}) => {
  const [open, setOpen] = useState(true);
  const ctMap = useMemo(() => {
    const m: Record<string, AdFrameworkDimension> = {};
    contentTypes.forEach((c) => { m[c.id] = c; });
    return m;
  }, [contentTypes]);

  return (
    <div className="bg-muted/20 rounded-md p-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1 px-1 py-0.5 hover:text-primary transition-colors"
      >
        <ChevronDown className={cn('h-3 w-3 transition-transform', !open && '-rotate-90')} />
        <span className="text-[11px] font-semibold flex-1 text-left truncate">{message.label}</span>
        <span className="text-[9px] text-muted-foreground tabular-nums">{variants.length}</span>
      </button>

      {open && (
        <div className="space-y-1.5 mt-1.5">
          {variants.map((v) => (
            <MoldVariantCard
              key={v.id}
              variant={v}
              contentTypeLabel={v.format_id ? ctMap[v.format_id]?.label : undefined}
              compact
              onClick={() => onOpenVariant(v.id)}
              onDelete={() => onDeleteVariant(v.id)}
            />
          ))}

          {contentTypes.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] gap-1 border border-dashed">
                  <Plus className="h-3 w-3" /> Variante
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {contentTypes.map((ct) => (
                  <DropdownMenuItem key={ct.id} onClick={() => onCreateVariant(ct.id)}>
                    {ct.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => onCreateVariant(null)} className="text-muted-foreground">
                  Sin tipo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] gap-1 border border-dashed" onClick={() => onCreateVariant(null)}>
              <Plus className="h-3 w-3" /> Variante
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
