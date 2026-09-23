import { useMemo, useState } from 'react';
import { Play, Plus, Trash2, ExternalLink, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseReferenceUrl, PLATFORM_META } from '@/lib/embed-url';
import { ReferenceEmbed } from '@/components/ad-frameworks/ReferenceEmbed';
import {
  useAddShotReference,
  useDeleteShotReference,
  type ShotReference,
} from '@/hooks/use-shot-references';

interface Props {
  sheetId: string;
  shotId: string;
  references: ShotReference[];
  /** compact = solo chips, sin botón de agregar (vista colapsada) */
  compact?: boolean;
}

export function ShotReferences({ sheetId, shotId, references, compact = false }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [playing, setPlaying] = useState<ShotReference | null>(null);
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const add = useAddShotReference();
  const del = useDeleteShotReference();

  const preview = useMemo(() => {
    const t = url.trim();
    if (!t || !/^https?:\/\//i.test(t)) return null;
    return parseReferenceUrl(t);
  }, [url]);

  const handleAdd = async () => {
    if (!url.trim()) return;
    await add.mutateAsync({ sheet_id: sheetId, shot_id: shotId, url: url.trim(), notes });
    setUrl('');
    setNotes('');
    setAddOpen(false);
  };

  if (compact && references.length === 0) return null;

  return (
    <div className={compact ? 'mt-3 pt-3 border-t border-noeval-line/40' : 'bg-noeval-cream/50 rounded-xl p-3 border border-noeval-line/60'}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted flex items-center gap-1.5">
          <Link2 className="h-3 w-3" /> Referencias
          {references.length > 0 && <span className="font-bold">· {references.length}</span>}
        </div>
        {!compact && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="no-print inline-flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-noeval-accent hover:underline font-semibold"
          >
            <Plus className="h-3 w-3" /> Agregar
          </button>
        )}
      </div>

      {references.length === 0 ? (
        <p className="text-xs text-noeval-muted/70 italic">
          Pegá links de Instagram, TikTok o YouTube como referencia de esta pieza.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {references.map((r) => {
            const parsed = parseReferenceUrl(r.url);
            const meta = PLATFORM_META[parsed.platform];
            return (
              <span
                key={r.id}
                className="group inline-flex items-center gap-1.5 text-[11px] font-medium pl-2 pr-1 py-1 rounded-lg bg-noeval-cream border border-noeval-line/80 text-noeval-ink"
              >
                <button
                  type="button"
                  onClick={() => setPlaying(r)}
                  className="inline-flex items-center gap-1.5"
                  title="Ver / reproducir"
                >
                  <Play className="h-3 w-3" style={{ color: meta.color }} />
                  <span style={{ color: meta.color }} className="uppercase tracking-wider text-[9px] font-bold">
                    {meta.label}
                  </span>
                  {r.notes && <span className="text-noeval-muted max-w-[140px] truncate">{r.notes}</span>}
                </button>
                {!compact && (
                  <button
                    type="button"
                    onClick={() => del.mutate({ id: r.id, sheet_id: sheetId })}
                    className="no-print text-noeval-muted/50 hover:text-destructive p-0.5"
                    title="Eliminar referencia"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Mini player */}
      <Dialog open={!!playing} onOpenChange={(v) => !v && setPlaying(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Referencia</DialogTitle>
            {playing?.notes && <DialogDescription>{playing.notes}</DialogDescription>}
          </DialogHeader>
          {playing && <ReferenceEmbed parsed={parseReferenceUrl(playing.url)} url={playing.url} />}
          <DialogFooter className="sm:justify-between gap-2">
            <a
              href={playing?.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Abrir original <ExternalLink className="h-3 w-3" />
            </a>
            <Button variant="outline" onClick={() => setPlaying(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva referencia</DialogTitle>
            <DialogDescription>
              Instagram (reel o post), TikTok, YouTube, Facebook, Vimeo o Loom. El link se envía también a ClickUp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="shotref-url">URL</Label>
              <Input
                id="shotref-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                autoFocus
              />
            </div>
            {preview && (preview.embedUrl || preview.platform === 'twitter') && (
              <div className="max-w-[240px] mx-auto">
                <ReferenceEmbed parsed={preview} url={url.trim()} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="shotref-notes">Nota (opcional)</Label>
              <Textarea
                id="shotref-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Qué imitamos de esta referencia?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!url.trim() || add.isPending}>
              {add.isPending ? 'Guardando…' : 'Guardar referencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
