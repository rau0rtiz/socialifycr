import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { produccionesBasePath } from '@/lib/host-mode';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Plus, Folder, Search, Trash2, FileText, Film,
  Calendar, MapPin, User as UserIcon, Loader2, ImagePlus,
  LayoutGrid, List, GripVertical,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useProductionSheets, useCreateSheet, useUpdateSheet, useReorderSheets,
  type SheetStatus, type ProductionSheet,
} from '@/hooks/use-production-sheets';

import {
  useProductionFolders, useCreateFolder, useDeleteFolder, useRenameFolder,
  useMoveSheet, useMoveFolder,
} from '@/hooks/use-production-folders';
import { SheetThumbnailUploader } from '@/components/producciones/SheetThumbnailUploader';

const STATUS_LABEL: Record<SheetStatus, string> = {
  draft: 'Borrador',
  in_production: 'En producción',
  done: 'Terminada',
  sent_to_clickup: 'Enviada a ClickUp',
};

const STATUS_TONE: Record<SheetStatus, string> = {
  draft: 'bg-white/10 text-white border-white/20',
  in_production: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  done: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  sent_to_clickup: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
};

const useClients = () =>
  useQuery({
    queryKey: ['producciones-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, logo_url')
        .eq('producciones_hidden', false)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; logo_url: string | null }[];
    },
  });

export default function Producciones() {
  const navigate = useNavigate();
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const currentFolderId = folderPath.length ? folderPath[folderPath.length - 1].id : null;
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  

  const { data: sheets = [], isLoading } = useProductionSheets();
  const { data: clients = [], refetch: refetchClients } = useClients();
  const { data: folders = [] } = useProductionFolders(clientFilter);
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const renameFolder = useRenameFolder();
  const moveSheet = useMoveSheet();
  const moveFolder = useMoveFolder();

  // Drag state: { kind: 'sheet'|'folder', id }
  const [dragging, setDragging] = useState<{ kind: 'sheet' | 'folder'; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // folder id or 'root'
  const [dropBeforeSheetId, setDropBeforeSheetId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>(() => (localStorage.getItem('producciones-view') as any) || 'grid');
  const reorderSheets = useReorderSheets();

  useEffect(() => { localStorage.setItem('producciones-view', view); }, [view]);

  const isDescendant = (folderId: string, maybeAncestorId: string): boolean => {
    let cur = folders.find(f => f.id === folderId);
    while (cur?.parent_id) {
      if (cur.parent_id === maybeAncestorId) return true;
      cur = folders.find(f => f.id === cur!.parent_id);
    }
    return false;
  };

  const handleDropOnFolder = async (targetFolderId: string | null) => {
    if (!dragging || !clientFilter) return;
    if (dragging.kind === 'sheet') {
      await moveSheet.mutateAsync({ id: dragging.id, folder_id: targetFolderId });
      toast.success('Sheet movido');
    } else {
      if (dragging.id === targetFolderId) return;
      if (targetFolderId && isDescendant(targetFolderId, dragging.id)) {
        toast.error('No se puede mover una carpeta dentro de sí misma');
        return;
      }
      await moveFolder.mutateAsync({ id: dragging.id, parent_id: targetFolderId, client_id: clientFilter });
      toast.success('Carpeta movida');
    }
    setDragging(null);
    setDropTarget(null);
  };

  const handleDropOnSheet = async (targetSheetId: string) => {
    if (!dragging || dragging.kind !== 'sheet' || dragging.id === targetSheetId) {
      setDropBeforeSheetId(null);
      return;
    }
    // Reorder within current filtered list
    const list = filteredSheets.map(s => s.id).filter(id => id !== dragging.id);
    const targetIdx = list.indexOf(targetSheetId);
    if (targetIdx === -1) { setDropBeforeSheetId(null); return; }
    list.splice(targetIdx, 0, dragging.id);
    const items = list.map((id, i) => ({ id, sort_order: (i + 1) * 10 }));
    setDragging(null);
    setDropBeforeSheetId(null);
    await reorderSheets.mutateAsync(items);
  };

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.name])),
    [clients],
  );
  const clientLogoMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.logo_url])),
    [clients],
  );

  const sheetsByClient = useMemo(() => {
    const map: Record<string, ProductionSheet[]> = {};
    for (const s of sheets) (map[s.client_id] ||= []).push(s);
    return map;
  }, [sheets]);

  // sub-folders at current folder level
  const subFolders = useMemo(
    () => folders.filter(f => (f.parent_id || null) === currentFolderId),
    [folders, currentFolderId],
  );

  // count sheets per folder (recursive)
  const folderSheetCount = useMemo(() => {
    const childrenMap: Record<string, string[]> = {};
    for (const f of folders) (childrenMap[f.parent_id || 'root'] ||= []).push(f.id);
    const count = (folderId: string): number => {
      const direct = sheets.filter(s => s.folder_id === folderId).length;
      const children = childrenMap[folderId] || [];
      return direct + children.reduce((acc, id) => acc + count(id), 0);
    };
    const result: Record<string, number> = {};
    for (const f of folders) result[f.id] = count(f.id);
    return result;
  }, [folders, sheets]);

  const filteredSheets = useMemo(() => {
    const q = search.toLowerCase();
    return sheets
      .filter(s => !clientFilter || s.client_id === clientFilter)
      .filter(s => {
        if (!clientFilter) return true;
        if (search) return true; // when searching, show across folders inside client
        return (s.folder_id || null) === currentFolderId;
      })
      .filter(s =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q) ||
        (s.producer_name || '').toLowerCase().includes(q),
      );
  }, [sheets, clientFilter, currentFolderId, search]);

  // reset folder path when leaving client
  useEffect(() => { setFolderPath([]); }, [clientFilter]);

  const handleCreateFolder = async () => {
    if (!clientFilter) return;
    const name = window.prompt('Nombre de la nueva carpeta:');
    if (!name?.trim()) return;
    await createFolder.mutateAsync({
      client_id: clientFilter,
      parent_id: currentFolderId,
      name: name.trim(),
    });
  };

  const handleDeleteFolder = async (folderId: string, name: string) => {
    if (!clientFilter) return;
    const count = folderSheetCount[folderId] || 0;
    if (!confirm(
      count > 0
        ? `Eliminar "${name}" y sus ${count} sheet(s) quedarán sin carpeta. ¿Continuar?`
        : `¿Eliminar la carpeta "${name}"?`
    )) return;
    await deleteFolder.mutateAsync({ id: folderId, client_id: clientFilter });
  };

  const handleRenameFolder = async (folderId: string, current: string) => {
    const name = window.prompt('Nuevo nombre:', current);
    if (!name?.trim() || name.trim() === current) return;
    await renameFolder.mutateAsync({ id: folderId, name: name.trim() });
  };

  return (
    <DashboardLayout>
      <div className="noeval-scope min-h-screen">
        <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="noeval-slate relative overflow-hidden rounded-2xl p-6 md:p-9">
            <div className="noeval-stripe absolute inset-x-0 top-0 h-3" />
            <div className="flex items-start justify-between gap-4 mt-4">
              <div>
                <div className="flex items-center gap-3 text-noeval-taupe text-[11px] tracking-[0.42em] uppercase font-medium">
                  <span className="w-2 h-2 rounded-full bg-noeval-accent animate-pulse" />
                  Plan de producción
                </div>
                <h1 className="font-serif font-semibold text-4xl md:text-6xl uppercase tracking-[0.08em] text-noeval-cream mt-3 leading-none">
                  Producciones
                  <span className="font-script normal-case text-noeval-accent text-[0.5em] ml-2">
                    sheets
                  </span>
                </h1>
                <p className="text-noeval-taupe mt-3 text-sm max-w-xl">
                  Drive de hojas de producción por cliente. Guarda, edita, asigna equipo y envía a ClickUp cuando esté listo.
                </p>
              </div>
              <Button
                onClick={() => setCreating(true)}
                className="bg-noeval-cream text-noeval-ink hover:bg-white shrink-0"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nuevo sheet
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-noeval-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, locación o encargado..."
                className="pl-9 bg-noeval-surface border-noeval-line"
              />
            </div>
            {clientFilter && (
              <Button variant="outline" onClick={() => setClientFilter(null)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Todas las carpetas
              </Button>
            )}
          </div>

          {/* Folders (clients) */}
          {!clientFilter && !search && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-2xl text-noeval-ink">Carpetas de clientes</h2>
                <Button size="sm" variant="outline" onClick={() => setCreatingClient(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo cliente
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {clients.map((c) => {
                  const count = sheetsByClient[c.id]?.length || 0;
                  return (
                    <ClientFolderCard
                      key={c.id}
                      client={c}
                      count={count}
                      onOpen={() => setClientFilter(c.id)}
                      onLogoUpdated={() => refetchClients()}
                      onDelete={async () => {
                        if (!confirm(`¿Quitar la carpeta de "${c.name}" de Producciones?\n\nNo elimina al cliente, solo lo oculta de esta vista.`)) return;
                        const { error } = await supabase
                          .from('clients')
                          .update({ producciones_hidden: true } as any)
                          .eq('id', c.id);
                        if (error) return toast.error(error.message);
                        toast.success('Carpeta ocultada');
                        refetchClients();
                      }}
                    />
                  );
                })}
                <button
                  onClick={() => setCreatingClient(true)}
                  className="aspect-square rounded-2xl bg-noeval-ink/5 border-2 border-dashed border-noeval-ink/25 hover:border-noeval-accent hover:bg-noeval-accent/5 transition-all flex flex-col items-center justify-center text-noeval-muted hover:text-noeval-accent"
                >
                  <Plus className="h-9 w-9 mb-1.5" />
                  <span className="text-xs tracking-[0.2em] uppercase font-medium">Nuevo cliente</span>
                </button>
              </div>
            </div>
          )}

          {clientFilter && !search && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm flex-wrap">
                <button
                  onClick={() => setFolderPath([])}
                  onDragOver={(e) => { if (dragging) { e.preventDefault(); setDropTarget('root'); } }}
                  onDragLeave={() => setDropTarget(prev => prev === 'root' ? null : prev)}
                  onDrop={(e) => { e.preventDefault(); handleDropOnFolder(null); }}
                  className={`font-serif text-xl text-noeval-ink hover:text-noeval-accent transition px-2 py-0.5 rounded ${dropTarget === 'root' ? 'bg-noeval-accent/20 ring-2 ring-noeval-accent' : ''}`}
                >
                  {clientMap[clientFilter]}
                </button>
                {folderPath.map((f, i) => (
                  <span key={f.id} className="flex items-center gap-1.5">
                    <span className="text-noeval-muted">/</span>
                    <button
                      onClick={() => setFolderPath(folderPath.slice(0, i + 1))}
                      onDragOver={(e) => { if (dragging) { e.preventDefault(); setDropTarget(f.id); } }}
                      onDragLeave={() => setDropTarget(prev => prev === f.id ? null : prev)}
                      onDrop={(e) => { e.preventDefault(); handleDropOnFolder(f.id); }}
                      className={`font-serif text-xl text-noeval-ink hover:text-noeval-accent transition px-2 py-0.5 rounded ${dropTarget === f.id ? 'bg-noeval-accent/20 ring-2 ring-noeval-accent' : ''}`}
                    >
                      {f.name}
                    </button>
                  </span>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={handleCreateFolder}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nueva carpeta
              </Button>
            </div>
          )}

          {/* Sub-folders (inside a client, not searching) */}
          {clientFilter && !search && subFolders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {subFolders.map((f) => {
                const count = folderSheetCount[f.id] || 0;
                return (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={(e) => { setDragging({ kind: 'folder', id: f.id }); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                    onDragOver={(e) => { if (dragging && dragging.id !== f.id) { e.preventDefault(); setDropTarget(f.id); } }}
                    onDragLeave={() => setDropTarget(prev => prev === f.id ? null : prev)}
                    onDrop={(e) => { e.preventDefault(); handleDropOnFolder(f.id); }}
                    className={`group relative aspect-[4/5] overflow-hidden rounded-2xl border cursor-grab active:cursor-grabbing transition-all hover:shadow-xl ${dropTarget === f.id ? 'border-noeval-accent ring-2 ring-noeval-accent' : 'border-noeval-line'} ${dragging?.id === f.id ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => setFolderPath([...folderPath, { id: f.id, name: f.name }])}
                      className="absolute inset-0 text-left w-full h-full"
                    >
                      {/* Dark backdrop with folder motif */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] via-noeval-ink to-black" />
                      <div className="absolute -right-6 -bottom-6 opacity-10">
                        <Folder className="h-40 w-40 text-noeval-accent" strokeWidth={1} />
                      </div>
                      {/* Top row */}
                      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-noeval-accent/15 border border-noeval-accent/30">
                          <Folder className="h-5 w-5 text-noeval-accent" />
                        </div>
                        <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[10px]">
                          {count}
                        </Badge>
                      </div>
                      {/* Bottom label */}
                      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                        <div className="text-[9px] tracking-[0.3em] uppercase text-white/50 mb-1">Carpeta</div>
                        <div className="font-serif text-base sm:text-lg text-white leading-tight line-clamp-2 pr-8">
                          {f.name}
                        </div>
                      </div>
                    </button>
                    <div className="absolute bottom-2 right-2 flex gap-0.5 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRenameFolder(f.id, f.name); }}
                        title="Renombrar"
                        className="p-1.5 rounded-md bg-black/50 backdrop-blur text-white hover:bg-black/70"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id, f.name); }}
                        title="Eliminar carpeta"
                        className="p-1.5 rounded-md bg-black/50 backdrop-blur text-white hover:bg-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sheets list */}
          <div>
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                {!clientFilter && (
                  <h2 className="font-serif text-2xl text-noeval-ink">
                    {search ? 'Resultados' : 'Sheets recientes'}
                  </h2>
                )}
                {clientFilter && !search && (
                  <h3 className="font-serif text-lg text-noeval-muted">Sheets</h3>
                )}
              </div>
              <div className="flex items-center rounded-lg border border-noeval-line bg-noeval-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  title="Vista de cuadrícula"
                  className={`p-1.5 rounded-md transition ${view === 'grid' ? 'bg-noeval-ink text-noeval-cream' : 'text-noeval-muted hover:text-noeval-ink'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  title="Vista de lista"
                  className={`p-1.5 rounded-md transition ${view === 'list' ? 'bg-noeval-ink text-noeval-cream' : 'text-noeval-muted hover:text-noeval-ink'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="text-noeval-muted text-sm">Cargando…</div>
            ) : filteredSheets.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-noeval-ink/20 bg-noeval-ink/5 p-10 text-center">
                <Film className="h-10 w-10 mx-auto text-noeval-muted mb-2" />
                <p className="text-noeval-muted text-sm">
                  No hay sheets {clientFilter ? 'en esta carpeta' : 'aún'}. Crea uno nuevo para empezar.
                </p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {filteredSheets.map((s) => (
                  <div
                    key={s.id}
                    draggable={!!clientFilter}
                    onDragStart={(e) => { setDragging({ kind: 'sheet', id: s.id }); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragging(null); setDropTarget(null); setDropBeforeSheetId(null); }}
                    onDragOver={(e) => {
                      if (dragging?.kind === 'sheet' && dragging.id !== s.id) {
                        e.preventDefault();
                        setDropBeforeSheetId(s.id);
                      }
                    }}
                    onDragLeave={() => setDropBeforeSheetId(prev => prev === s.id ? null : prev)}
                    onDrop={(e) => { e.preventDefault(); handleDropOnSheet(s.id); }}
                    onClick={() => navigate(`${produccionesBasePath()}/${s.id}`)}
                    className={`group relative aspect-[4/5] overflow-hidden rounded-2xl border bg-noeval-ink hover:shadow-xl transition-all cursor-pointer ${dropBeforeSheetId === s.id ? 'border-noeval-accent ring-2 ring-noeval-accent' : 'border-noeval-line'} ${dragging?.id === s.id ? 'opacity-50' : ''}`}
                  >
                    {/* Thumbnail or placeholder */}
                    {s.thumbnail_url ? (
                      <img
                        src={s.thumbnail_url}
                        alt={s.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-noeval-slate to-noeval-ink flex flex-col items-center justify-center text-noeval-taupe/60">
                        <Film className="h-10 w-10 mb-2" />
                        <span className="text-[10px] tracking-[0.3em] uppercase">Sin portada</span>
                      </div>
                    )}

                    {/* Bottom gradient overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

                    {/* Top overlay: drag + logo + upload */}
                    <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {clientFilter ? (
                          <div className="opacity-60 lg:opacity-0 lg:group-hover:opacity-80 transition-opacity">
                            <GripVertical className="h-4 w-4 text-white/80 drop-shadow" />
                          </div>
                        ) : null}
                        <ClientMark
                          name={clientMap[s.client_id]}
                          logo={clientLogoMap[s.client_id]}
                          size="md"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <SheetThumbnailUploader
                          sheetId={s.id}
                          clientId={s.client_id}
                          currentUrl={s.thumbnail_url}
                          variant="compact"
                        />
                      </div>
                    </div>

                    {/* Bottom content */}
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
                      <Badge variant="outline" className={`text-[9px] mb-2 ${STATUS_TONE[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </Badge>
                      <div className="font-serif text-base sm:text-lg leading-tight line-clamp-2 drop-shadow">
                        {s.title}
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-[10px] sm:text-[11px] text-white/80">
                        <div className="flex items-center gap-1.5 truncate">
                          <Folder className="h-3 w-3 shrink-0" /> {clientMap[s.client_id] || '—'}
                        </div>
                        {s.shoot_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {format(parseISO(s.shoot_date), "d MMM yyyy", { locale: es })}
                          </div>
                        )}
                        {s.location && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0" /> {s.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-noeval-ink border border-noeval-ink rounded-2xl overflow-hidden divide-y divide-white/10">
                {filteredSheets.map((s) => (
                  <div
                    key={s.id}
                    draggable={!!clientFilter}
                    onDragStart={(e) => { setDragging({ kind: 'sheet', id: s.id }); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragging(null); setDropTarget(null); setDropBeforeSheetId(null); }}
                    onDragOver={(e) => {
                      if (dragging?.kind === 'sheet' && dragging.id !== s.id) {
                        e.preventDefault();
                        setDropBeforeSheetId(s.id);
                      }
                    }}
                    onDragLeave={() => setDropBeforeSheetId(prev => prev === s.id ? null : prev)}
                    onDrop={(e) => { e.preventDefault(); handleDropOnSheet(s.id); }}
                    onClick={() => navigate(`${produccionesBasePath()}/${s.id}`)}
                    className={`group flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition cursor-pointer ${dropBeforeSheetId === s.id ? 'bg-noeval-accent/15 border-l-4 border-l-noeval-accent' : ''} ${dragging?.id === s.id ? 'opacity-50' : ''}`}
                  >
                    {clientFilter && (
                      <GripVertical className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0" />
                    )}
                    <div className="w-10 h-[50px] rounded-md overflow-hidden bg-black/60 shrink-0 border border-white/10">
                      {s.thumbnail_url ? (
                        <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-4 w-4 text-noeval-accent/60" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <ClientMark
                          name={clientMap[s.client_id]}
                          logo={clientLogoMap[s.client_id]}
                          size="sm"
                        />
                        <div className="font-medium text-noeval-cream text-sm truncate">{s.title}</div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-white/60 mt-0.5">
                        <span className="flex items-center gap-1"><Folder className="h-3 w-3" />{clientMap[s.client_id] || '—'}</span>
                        {s.shoot_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(parseISO(s.shoot_date), "d MMM yyyy", { locale: es })}</span>}
                        {s.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{s.location}</span>}
                        {s.producer_name && <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{s.producer_name}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_TONE[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      {creating && (
        <CreateSheetDialog
          clients={clients}
          defaultClientId={clientFilter}
          defaultFolderId={currentFolderId}
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); navigate(`${produccionesBasePath()}/${id}`); }}
        />
      )}


      {creatingClient && (
        <CreateClientDialog
          onClose={() => setCreatingClient(false)}
          onCreated={async (id) => {
            setCreatingClient(false);
            await refetchClients();
            setClientFilter(id);
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ---------- Create client dialog ----------
function CreateClientDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Nombre requerido');
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: name.trim(),
        industry: industry.trim() || null,
        primary_color: '24 100% 57%',
        accent_color: '24 100% 57%',
      })
      .select('id')
      .single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Cliente creado');
    onCreated(data.id);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="noeval-scope max-w-md p-0 overflow-hidden border-noeval-line">
        <div className="noeval-slate relative p-6">
          <div className="noeval-stripe absolute inset-x-0 top-0 h-2" />
          <div className="text-noeval-taupe text-[10px] tracking-[0.42em] uppercase font-medium mt-3">
            Nuevo cliente
          </div>
          <h2 className="font-serif text-3xl text-noeval-cream uppercase tracking-[0.06em] mt-1">
            Carpeta
            <span className="font-script normal-case text-noeval-accent text-[0.55em] ml-2">nueva</span>
          </h2>
        </div>
        <div className="p-6 space-y-4 bg-noeval-cream">
          <div>
            <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Nombre</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Petshop2go"
              className="mt-1 bg-white border-noeval-line text-noeval-ink"
            />
          </div>
          <div>
            <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Industria</Label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Opcional"
              className="mt-1 bg-white border-noeval-line text-noeval-ink"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="bg-noeval-ink text-noeval-cream hover:bg-noeval-ink/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Crear cliente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Create sheet dialog ----------
function CreateSheetDialog({
  clients, defaultClientId, defaultFolderId, onClose, onCreated,
}: {
  clients: { id: string; name: string }[];
  defaultClientId: string | null;
  defaultFolderId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [shootDate, setShootDate] = useState('');
  const [location, setLocation] = useState('');
  const create = useCreateSheet();
  const update = useUpdateSheet();

  const handleCreate = async () => {
    if (!clientId) return toast.error('Selecciona un cliente');
    const sheet = await create.mutateAsync({
      client_id: clientId,
      title: title.trim() || undefined,
      folder_id: clientId === defaultClientId ? defaultFolderId : null,
    });
    if (shootDate || location) {
      await update.mutateAsync({
        id: sheet.id,
        shoot_date: shootDate || null,
        location: location || null,
      } as any);
    }
    onCreated(sheet.id);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="noeval-scope max-w-lg p-0 overflow-hidden border-noeval-line">
        {/* Claqueta header */}
        <div className="noeval-slate relative p-6">
          <div className="noeval-stripe absolute inset-x-0 top-0 h-2" />
          <div className="flex items-center gap-2 text-noeval-taupe text-[10px] tracking-[0.42em] uppercase font-medium mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-noeval-accent animate-pulse" />
            Scene · Take · Roll
          </div>
          <h2 className="font-serif text-4xl text-noeval-cream uppercase tracking-[0.06em] mt-2 leading-none">
            Nueva producción
            <span className="block font-script normal-case text-noeval-accent text-[0.4em] mt-1 tracking-normal">
              claqueta inicial
            </span>
          </h2>
        </div>

        {/* Body */}
        <div className="bg-noeval-cream p-6 space-y-4">
          <div>
            <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1 bg-white border-noeval-line text-noeval-ink">
                <SelectValue placeholder="Selecciona cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Título / Proyecto</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Campaña Diciembre — Día 1"
              className="mt-1 bg-white border-noeval-line text-noeval-ink font-serif text-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Fecha</Label>
              <Input
                type="date"
                value={shootDate}
                onChange={(e) => setShootDate(e.target.value)}
                className="mt-1 bg-white border-noeval-line text-noeval-ink"
              />
            </div>
            <div>
              <Label className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Locación</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Estudio SJO"
                className="mt-1 bg-white border-noeval-line text-noeval-ink"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-noeval-line">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={create.isPending}
              className="bg-noeval-ink text-noeval-cream hover:bg-noeval-ink/90"
            >
              {create.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Marcar claqueta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Client folder card with logo upload ----------
function ClientFolderCard({
  client, count, onOpen, onLogoUpdated, onDelete,
}: {
  client: { id: string; name: string; logo_url: string | null };
  count: number;
  onOpen: () => void;
  onLogoUpdated: () => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Máx 5MB');
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${client.id}/producciones/client-logos/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('content-images')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('content-images').getPublicUrl(path);
      const { error: updErr } = await supabase
        .from('clients')
        .update({ logo_url: data.publicUrl })
        .eq('id', client.id);
      if (updErr) throw updErr;
      toast.success('Logo actualizado');
      onLogoUpdated();
    } catch (e: any) {
      toast.error(e.message || 'Error al subir logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-noeval-line bg-noeval-ink hover:shadow-xl transition-all">
      <button onClick={onOpen} className="absolute inset-0 text-left w-full h-full">
        {/* Dark backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#242424] via-noeval-ink to-black" />

        {/* Logo hero — soft-blurred fill + crisp centered logo */}
        {client.logo_url && (
          <>
            <img
              src={client.logo_url}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl scale-110"
            />
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <img
                src={client.logo_url}
                alt={client.name}
                loading="lazy"
                className="max-h-[55%] max-w-[75%] object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] group-hover:scale-[1.05] transition-transform duration-500"
              />
            </div>
          </>
        )}
        {!client.logo_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-serif text-5xl uppercase tracking-wide text-white/25">
              {client.name.slice(0, 2)}
            </div>
          </div>
        )}

        {/* Vignette bottom */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* Count chip */}
        <Badge variant="outline" className="absolute top-3 right-3 bg-white/10 border-white/20 text-white text-[10px] backdrop-blur">
          {count}
        </Badge>

        {/* Client name */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <div className="text-[9px] tracking-[0.3em] uppercase text-noeval-accent mb-1">Cliente</div>
          <div className="font-serif text-base sm:text-lg text-white leading-tight truncate">
            {client.name}
          </div>
          <div className="text-[10px] text-white/60 mt-0.5">
            {count === 0 ? 'Sin sheets' : count === 1 ? '1 sheet' : `${count} sheets`}
          </div>
        </div>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />

      {/* Action buttons — overlay */}
      <div className="absolute top-3 left-3 flex gap-1 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          title={client.logo_url ? 'Cambiar logo' : 'Subir logo'}
          disabled={uploading}
          className="p-1.5 rounded-md bg-black/60 backdrop-blur border border-white/10 text-white hover:bg-black/80 transition"
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <ImagePlus className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="absolute bottom-3 right-3 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Eliminar carpeta"
          className="p-1.5 rounded-md bg-black/60 backdrop-blur border border-white/10 text-white hover:bg-destructive transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------- Client mini-favicon ----------
function ClientMark({
  name,
  logo,
  size = 'md',
}: {
  name?: string;
  logo?: string | null;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-4 w-4 text-[8px]' : 'h-6 w-6 text-[9px]';
  const initials = (name || '?')
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      title={name}
      className={`${dim} shrink-0 rounded-full overflow-hidden bg-black/60 border border-white/20 flex items-center justify-center text-white/80 font-semibold shadow-sm`}
    >
      {logo ? (
        <img src={logo} alt={name || ''} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}



