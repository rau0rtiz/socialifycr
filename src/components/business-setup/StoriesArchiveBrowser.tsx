import { useMemo, useState } from 'react';
import { useStories } from '@/hooks/use-stories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Search, Image as ImageIcon, ExternalLink, Archive, Database } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  clientId: string;
}

export const StoriesArchiveBrowser = ({ clientId }: Props) => {
  const {
    archivedStories,
    allArchivedStories,
    isLoading,
    isLoadingAllArchived,
    hasMoreArchived,
    fetchAllArchived,
    refetch,
  } = useStories(clientId);

  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const source = showAll && allArchivedStories.length > 0 ? allArchivedStories : archivedStories;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((s) => {
      const sd = s.scannedData || {};
      return [
        sd.customer_name,
        sd.brand,
        sd.garment_type,
        sd.notes,
        format(parseISO(s.timestamp), 'dd MMM yyyy', { locale: es }),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [source, query]);

  const persisted = source.filter((s) => s.persistentThumbnailUrl).length;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('capture-stories', { body: {} });
      if (error) throw error;
      toast.success('Sincronización iniciada');
      refetch();
    } catch (err) {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-story-thumbnails', {
        body: { client_id: clientId },
      });
      if (error) throw error;
      toast.success(`Thumbnails persistidos: ${data?.succeeded || 0}/${data?.processed || 0}`);
      refetch();
    } catch (err) {
      toast.error('Error en backfill');
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Archive className="h-5 w-5 text-pink-500" />
              Base de Historias
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Archivo permanente de todas las historias capturadas. Los thumbnails se guardan en
              storage para no perderse cuando expiran las URLs de Meta.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1.5">
              <Database className="h-3 w-3" />
              {persisted}/{source.length} con foto persistente
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente, marca, tipo, fecha..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar ahora
          </Button>
          <Button variant="outline" size="sm" onClick={handleBackfill} disabled={backfilling}>
            {backfilling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            Persistir thumbnails
          </Button>
          {hasMoreArchived && !showAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAll(true);
                if (allArchivedStories.length === 0) fetchAllArchived();
              }}
              disabled={isLoadingAllArchived}
            >
              {isLoadingAllArchived ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Cargar todas
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No hay historias que coincidan.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((s) => {
              const img = s.persistentThumbnailUrl || s.thumbnailUrl || s.mediaUrl;
              const sd = s.scannedData || {};
              return (
                <div
                  key={s.id}
                  className="group relative rounded-lg overflow-hidden border border-border bg-muted/30 aspect-[9/16]"
                >
                  {img ? (
                    <img
                      src={img}
                      alt="story"
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 text-white text-[10px] space-y-0.5">
                    <div className="font-medium">
                      {format(parseISO(s.timestamp), 'dd MMM yyyy', { locale: es })}
                    </div>
                    <div className="opacity-90">
                      👁 {s.reach.toLocaleString()} · 💬 {s.replies}
                    </div>
                    {(sd.brand || sd.customer_name) && (
                      <div className="opacity-90 truncate">
                        {[sd.brand, sd.customer_name].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-1 right-1 flex gap-1">
                    {s.persistentThumbnailUrl && (
                      <span title="Foto persistente">
                        <Database className="h-3.5 w-3.5 text-emerald-400 drop-shadow" />
                      </span>
                    )}
                    {s.permalink && (
                      <a
                        href={s.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/50 rounded p-0.5 text-white hover:bg-black/70"
                        title="Ver en Instagram"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
