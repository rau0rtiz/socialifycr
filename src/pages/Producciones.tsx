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

const STATUS_LABEL: Record<SheetStatus, string> = {
  draft: 'Borrador',
  in_production: 'En producción',
  done: 'Terminada',
  sent_to_clickup: 'Enviada a ClickUp',
};

const STATUS_TONE: Record<SheetStatus, string> = {
  draft: 'bg-noeval-taupe/30 text-noeval-ink border-noeval-line',
  in_production: 'bg-amber-100 text-amber-900 border-amber-300',
  done: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  sent_to_clickup: 'bg-purple-100 text-purple-900 border-purple-300',
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                  className="bg-noeval-surface/50 border-2 border-dashed border-noeval-line rounded-xl p-4 hover:border-noeval-accent hover:bg-noeval-surface transition-all flex flex-col items-center justify-center min-h-[160px] text-noeval-muted hover:text-noeval-accent"
                >
                  <Plus className="h-8 w-8 mb-1.5" />
                  <span className="text-sm font-medium">Nuevo cliente</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                    className={`group relative bg-noeval-surface border rounded-xl p-4 transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${dropTarget === f.id ? 'border-noeval-accent ring-2 ring-noeval-accent bg-noeval-accent/5' : 'border-noeval-line hover:border-noeval-accent'} ${dragging?.id === f.id ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => setFolderPath([...folderPath, { id: f.id, name: f.name }])}
                      className="text-left w-full"
                    >
                      <div className="flex items-start justify-between">
                        <Folder className="h-7 w-7 text-noeval-accent" />
                        <Badge variant="outline" className="border-noeval-line text-noeval-muted text-[10px]">
                          {count}
                        </Badge>
                      </div>
                      <div className="mt-3 font-medium text-noeval-ink truncate pr-12">{f.name}</div>
                    </button>
                    <div className="absolute bottom-3 right-3 flex gap-0.5 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRenameFolder(f.id, f.name); }}
                        title="Renombrar"
                        className="p-1 rounded hover:bg-noeval-taupe/40"
                      >
                        <FileText className="h-3.5 w-3.5 text-noeval-muted" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id, f.name); }}
                        title="Eliminar carpeta"
                        className="p-1 rounded hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
              <Card className="p-8 text-center bg-noeval-surface border-noeval-line">
                <Film className="h-10 w-10 mx-auto text-noeval-muted mb-2" />
                <p className="text-noeval-muted text-sm">
                  No hay sheets {clientFilter ? 'en esta carpeta' : 'aún'}. Crea uno nuevo para empezar.
                </p>
              </Card>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                    className={`group relative text-left bg-noeval-surface border rounded-xl p-4 hover:border-noeval-accent hover:shadow-md transition-all cursor-pointer ${dropBeforeSheetId === s.id ? 'border-noeval-accent ring-2 ring-noeval-accent' : 'border-noeval-line'} ${dragging?.id === s.id ? 'opacity-50' : ''}`}
                  >
                    {clientFilter && (
                      <div className="absolute top-2 left-2 opacity-50 lg:opacity-0 lg:group-hover:opacity-60 transition-opacity">
                        <GripVertical className="h-4 w-4 text-noeval-muted" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <FileText className="h-5 w-5 text-noeval-accent shrink-0 mt-0.5" />
                      <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 font-serif text-lg text-noeval-ink leading-tight line-clamp-2">
                      {s.title}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-noeval-muted">
                      <div className="flex items-center gap-1.5">
                        <Folder className="h-3 w-3" /> {clientMap[s.client_id] || '—'}
                      </div>
                      {s.shoot_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(s.shoot_date), "d MMM yyyy", { locale: es })}
                        </div>
                      )}
                      {s.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" /> {s.location}
                        </div>
                      )}
                      {s.producer_name && (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="h-3 w-3" /> {s.producer_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-noeval-surface border border-noeval-line rounded-xl overflow-hidden divide-y divide-noeval-line">
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
                    className={`group flex items-center gap-3 px-3 py-2.5 hover:bg-noeval-cream/40 transition cursor-pointer ${dropBeforeSheetId === s.id ? 'bg-noeval-accent/10 border-l-4 border-l-noeval-accent' : ''} ${dragging?.id === s.id ? 'opacity-50' : ''}`}
                  >
                    {clientFilter && (
                      <GripVertical className="h-4 w-4 text-noeval-muted/40 group-hover:text-noeval-muted shrink-0" />
                    )}
                    <FileText className="h-4 w-4 text-noeval-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-noeval-ink text-sm truncate">{s.title}</div>
                      <div className="flex items-center gap-3 text-[11px] text-noeval-muted mt-0.5">
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
    <div className="group relative bg-noeval-surface border border-noeval-line rounded-xl overflow-hidden hover:border-noeval-accent transition-all hover:shadow-md flex flex-col">
      <button onClick={onOpen} className="text-left w-full flex-1 flex flex-col">
        {client.logo_url ? (
          <div className="relative aspect-square w-full bg-white overflow-hidden">
            <img
              src={client.logo_url}
              alt={client.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <Badge variant="outline" className="absolute top-2 right-2 bg-white/90 border-noeval-line text-noeval-muted text-[10px]">
              {count}
            </Badge>
          </div>
        ) : (
          <div className="relative aspect-square w-full p-4 flex flex-col">
            <div className="flex items-start justify-between">
              <Folder className="h-10 w-10 text-noeval-accent" />
              <Badge variant="outline" className="border-noeval-line text-noeval-muted">
                {count}
              </Badge>
            </div>
            <div className="mt-auto pt-3 font-serif text-xl text-noeval-ink truncate">
              {client.name}
            </div>
          </div>
        )}
        {client.logo_url && (
          <div className="px-3 py-2 border-t border-noeval-line bg-noeval-surface flex items-center justify-between gap-2">
            <span className="font-medium text-sm text-noeval-ink truncate">{client.name}</span>
            <span className="text-[10px] text-noeval-muted shrink-0">
              {count === 0 ? 'Sin sheets' : count === 1 ? '1 sheet' : `${count} sheets`}
            </span>
          </div>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />

      <div className="absolute top-2 left-2 flex gap-1 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          title={client.logo_url ? 'Cambiar logo' : 'Subir logo'}
          disabled={uploading}
          className="h-7 w-7 rounded-md bg-white/95 border border-noeval-line flex items-center justify-center hover:bg-white shadow-sm"
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-noeval-muted" />
            : <ImagePlus className="h-3.5 w-3.5 text-noeval-ink" />}
        </button>
      </div>

      <div className="absolute bottom-2 right-2 flex gap-1 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Eliminar carpeta"
          className="p-1 rounded bg-white/95 border border-noeval-line shadow-sm hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
}


