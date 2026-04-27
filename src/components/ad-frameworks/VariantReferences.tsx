import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAdReferences, useCreateAdReference } from '@/hooks/use-ad-references';
import { parseReferenceUrl, PLATFORM_META } from '@/lib/embed-url';
import { ReferenceEmbed } from './ReferenceEmbed';
import { ReferenceCard } from './ReferenceCard';
import { Badge } from '@/components/ui/badge';

interface Props {
  variantId: string;
}

export const VariantReferences = ({ variantId }: Props) => {
  const { data: references, isLoading } = useAdReferences({ variant_id: variantId });
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
    await create.mutateAsync({
      variant_id: variantId,
      url: url.trim(),
      notes: notes.trim() || undefined,
    });
    setUrl(''); setNotes('');
    setOpen(false);
  };

  const count = references?.length ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-primary" />
          Referencias
          {count > 0 && <Badge variant="secondary" className="font-mono text-[10px] h-4 px-1.5">{count}</Badge>}
        </Label>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="h-7 gap-1">
          <Plus className="h-3.5 w-3.5" /> Agregar
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-3 text-center text-xs text-muted-foreground">Cargando...</Card>
      ) : count === 0 ? (
        <Card className="p-4 text-center border-dashed">
          <p className="text-xs text-muted-foreground">
            Pegá links inspiracionales para esta pieza específica.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              Esta referencia se asocia únicamente a esta pieza creativa. Compatible con YouTube, Reels/Posts de IG, TikTok, Facebook, LinkedIn, X/Twitter, Vimeo y Loom.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="vref-url">URL</Label>
              <Input
                id="vref-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/..."
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
              <Label htmlFor="vref-notes">Nota (opcional)</Label>
              <Textarea
                id="vref-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Qué te llama la atención?"
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
