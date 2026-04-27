import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, Pencil, Check, X } from 'lucide-react';
import { parseReferenceUrl, PLATFORM_META } from '@/lib/embed-url';
import { ReferenceEmbed } from './ReferenceEmbed';
import { useDeleteAdReference, useUpdateAdReference, type AdFrameworkReference } from '@/hooks/use-ad-references';

interface Props {
  reference: AdFrameworkReference;
}

export const ReferenceCard = ({ reference }: Props) => {
  const parsed = parseReferenceUrl(reference.url);
  const meta = PLATFORM_META[parsed.platform];
  const del = useDeleteAdReference();
  const update = useUpdateAdReference();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reference.notes ?? '');

  const handleSave = async () => {
    await update.mutateAsync({ id: reference.id, framework_id: reference.framework_id, notes: draft });
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm('¿Eliminar esta referencia?')) {
      del.mutate({ id: reference.id, framework_id: reference.framework_id });
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col group">
      <ReferenceEmbed parsed={parsed} url={reference.url} />

      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ borderColor: meta.color, color: meta.color }}
          >
            {meta.label}
          </Badge>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Abrir original">
              <a href={reference.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            {!editing && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)} title="Editar nota">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete} title="Eliminar">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-1.5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="¿Por qué te sirve esta referencia?"
              rows={3}
              autoFocus
              className="text-xs resize-none"
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditing(false); setDraft(reference.notes ?? ''); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-7 px-2" onClick={handleSave} disabled={update.isPending}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : reference.notes ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{reference.notes}</p>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground/60 italic hover:text-muted-foreground text-left"
          >
            + Agregar nota
          </button>
        )}
      </div>
    </Card>
  );
};
