import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAdReferences, useCreateAdReference } from '@/hooks/use-ad-references';
import { parseReferenceUrl, PLATFORM_META } from '@/lib/embed-url';
import { ReferenceEmbed } from './ReferenceEmbed';
import { ReferenceCard } from './ReferenceCard';
import { Badge } from '@/components/ui/badge';

interface Props {
  frameworkId: string;
}

export const ReferencesPanel = ({ frameworkId }: Props) => {
  const { data: references, isLoading } = useAdReferences(frameworkId);
  const create = useCreateAdReference();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const previewParsed = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;
    return parseReferenceUrl(trimmed);
  }, [url]);

  const handleCreate = async () => {
    if (!url.trim()) return;
    await create.mutateAsync({ framework_id: frameworkId, url: url.trim(), notes: notes.trim() || undefined });
    setUrl(''); setNotes('');
    setOpen(false);
  };

  const count = references?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Referencias
          </h2>
          {count > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">{count}</Badge>
          )}
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Agregar referencia
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Cargando referencias...</Card>
      ) : count === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <Link2 className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Pegá links de YouTube, IG, TikTok, FB, LinkedIn, Vimeo o Loom para inspirarte.
          </p>
          <p className="text-xs text-muted-foreground/70">
            El sistema detecta la plataforma y genera el preview embebido automáticamente.
          </p>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 mt-2">
            <Plus className="h-4 w-4" /> Agregar primera referencia
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {references!.map((r) => (
            <ReferenceCard key={r.id} reference={r} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva referencia</DialogTitle>
            <DialogDescription>
              Pegá la URL del video o post. Compatible con YouTube, Shorts, Reels/Posts de Instagram, TikTok, Facebook, LinkedIn, X/Twitter, Vimeo y Loom.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ref-url">URL</Label>
              <Input
                id="ref-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                autoFocus
              />
              {previewParsed && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Detectado:</span>
                  <Badge
                    variant="outline"
                    style={{ borderColor: PLATFORM_META[previewParsed.platform].color, color: PLATFORM_META[previewParsed.platform].color }}
                  >
                    {PLATFORM_META[previewParsed.platform].label}
                  </Badge>
                  {previewParsed.platform === 'other' && (
                    <span className="text-amber-600 dark:text-amber-400">— se guardará como link sin preview</span>
                  )}
                </div>
              )}
            </div>

            {previewParsed && (previewParsed.embedUrl || previewParsed.platform === 'twitter') && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vista previa</Label>
                <div className="max-w-md mx-auto">
                  <ReferenceEmbed parsed={previewParsed} url={url.trim()} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ref-notes">Nota (opcional)</Label>
              <Textarea
                id="ref-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Qué te llama la atención de esta referencia?"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!url.trim() || create.isPending}>
              {create.isPending ? 'Guardando...' : 'Guardar referencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
