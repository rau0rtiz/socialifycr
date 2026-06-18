import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Plus, Folder, Search, Trash2, Send, Check, FileText, Film,
  Calendar, MapPin, Clock, User as UserIcon, GripVertical, Settings, ExternalLink, Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useProductionSheets, useProductionSheet, useCreateSheet, useUpdateSheet,
  useDeleteSheet, useUpsertChild, useDeleteChild,
  type SheetStatus, type ProductionSheet,
} from '@/hooks/use-production-sheets';
import { ClickUpConfigDialog } from '@/components/producciones/ClickUpConfigDialog';

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
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

export default function Producciones() {
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [configClient, setConfigClient] = useState<{ id: string; name: string } | null>(null);

  const { data: sheets = [], isLoading } = useProductionSheets();
  const { data: clients = [] } = useClients();

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.name])),
    [clients],
  );

  // sheet counts per client
  const sheetsByClient = useMemo(() => {
    const map: Record<string, ProductionSheet[]> = {};
    for (const s of sheets) {
      (map[s.client_id] ||= []).push(s);
    }
    return map;
  }, [sheets]);

  const filteredSheets = useMemo(() => {
    const q = search.toLowerCase();
    return sheets
      .filter(s => !clientFilter || s.client_id === clientFilter)
      .filter(s =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q) ||
        (s.producer_name || '').toLowerCase().includes(q),
      );
  }, [sheets, clientFilter, search]);

  return (
    <DashboardLayout>
      <div className="noeval-scope min-h-screen">
        <div className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-6">
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
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const c = clients.find(x => x.id === clientFilter);
                    if (c) setConfigClient(c);
                  }}
                >
                  <Settings className="h-4 w-4 mr-1.5" /> ClickUp
                </Button>
                <Button variant="outline" onClick={() => setClientFilter(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Todas las carpetas
                </Button>
              </>
            )}
          </div>

          {/* Folders (clients) */}
          {!clientFilter && !search && (
            <div>
              <h2 className="font-serif text-2xl text-noeval-ink mb-3">Carpetas de clientes</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {clients.map((c) => {
                  const count = sheetsByClient[c.id]?.length || 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setClientFilter(c.id)}
                      className="group text-left bg-noeval-surface border border-noeval-line rounded-xl p-4 hover:border-noeval-accent transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <Folder className="h-8 w-8 text-noeval-accent" />
                        <Badge variant="outline" className="border-noeval-line text-noeval-muted">
                          {count}
                        </Badge>
                      </div>
                      <div className="mt-3 font-medium text-noeval-ink truncate">{c.name}</div>
                      <div className="text-xs text-noeval-muted mt-1">
                        {count === 0 ? 'Sin sheets' : count === 1 ? '1 sheet' : `${count} sheets`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sheets list */}
          <div>
            <h2 className="font-serif text-2xl text-noeval-ink mb-3">
              {clientFilter ? clientMap[clientFilter] : search ? 'Resultados' : 'Sheets recientes'}
            </h2>
            {isLoading ? (
              <div className="text-noeval-muted text-sm">Cargando…</div>
            ) : filteredSheets.length === 0 ? (
              <Card className="p-8 text-center bg-noeval-surface border-noeval-line">
                <Film className="h-10 w-10 mx-auto text-noeval-muted mb-2" />
                <p className="text-noeval-muted text-sm">
                  No hay sheets {clientFilter ? 'en esta carpeta' : 'aún'}. Crea uno nuevo para empezar.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSheets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setEditingId(s.id)}
                    className="text-left bg-noeval-surface border border-noeval-line rounded-xl p-4 hover:border-noeval-accent hover:shadow-md transition-all"
                  >
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
                  </button>
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
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); setEditingId(id); }}
        />
      )}

      {editingId && (
        <SheetEditor
          sheetId={editingId}
          clientName={clientMap[sheets.find(s => s.id === editingId)?.client_id || ''] || ''}
          onClose={() => setEditingId(null)}
        />
      )}
    </DashboardLayout>
  );
}

// ---------- Create dialog ----------
function CreateSheetDialog({
  clients, defaultClientId, onClose, onCreated,
}: {
  clients: { id: string; name: string }[];
  defaultClientId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(defaultClientId || '');
  const create = useCreateSheet();

  const handleCreate = async () => {
    if (!clientId) return toast.error('Selecciona un cliente');
    const sheet = await create.mutateAsync({ client_id: clientId, title: title.trim() || undefined });
    onCreated(sheet.id);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo production sheet</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecciona cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Campaña Diciembre" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={create.isPending}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Editor ----------
function SheetEditor({ sheetId, clientName, onClose }: { sheetId: string; clientName: string; onClose: () => void }) {
  const { data, isLoading } = useProductionSheet(sheetId);
  const update = useUpdateSheet();
  const del = useDeleteSheet();
  const upsertTeam = useUpsertChild('production_sheet_team');
  const delTeam = useDeleteChild('production_sheet_team');
  const upsertShot = useUpsertChild('production_sheet_shots');
  const delShot = useDeleteChild('production_sheet_shots');
  const upsertWardrobe = useUpsertChild('production_sheet_wardrobe');
  const delWardrobe = useDeleteChild('production_sheet_wardrobe');

  const [local, setLocal] = useState<Partial<ProductionSheet>>({});
  useEffect(() => {
    if (data?.sheet) setLocal(data.sheet);
  }, [data?.sheet]);

  // Debounced auto-save for header fields
  useEffect(() => {
    if (!data?.sheet) return;
    const t = setTimeout(() => {
      const patch: any = {};
      (['title', 'shoot_date', 'location', 'call_time', 'producer_name', 'status', 'notes'] as const).forEach((k) => {
        if (local[k] !== data.sheet[k]) patch[k] = local[k];
      });
      if (Object.keys(patch).length) update.mutate({ id: sheetId, ...patch });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este sheet? Esta acción no se puede deshacer.')) return;
    await del.mutateAsync(sheetId);
    onClose();
  };

  const handleSendClickUp = () => {
    toast.info('Configura ClickUp primero', {
      description: 'La integración con ClickUp se habilita después de añadir tu API token.',
    });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto noeval-scope">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-noeval-ink">
            {clientName} · {local.title || 'Sheet'}
          </SheetTitle>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="py-8 text-center text-noeval-muted">Cargando…</div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* HEADER / Claqueta */}
            <Section title="Claqueta">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Título">
                  <Input value={local.title || ''} onChange={(e) => setLocal({ ...local, title: e.target.value })} />
                </Field>
                <Field label="Estado">
                  <Select
                    value={local.status as string}
                    onValueChange={(v) => setLocal({ ...local, status: v as SheetStatus })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as SheetStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fecha de rodaje">
                  <Input type="date" value={local.shoot_date || ''} onChange={(e) => setLocal({ ...local, shoot_date: e.target.value || null })} />
                </Field>
                <Field label="Hora de llamado">
                  <Input value={local.call_time || ''} onChange={(e) => setLocal({ ...local, call_time: e.target.value })} placeholder="08:00 AM" />
                </Field>
                <Field label="Locación">
                  <Input value={local.location || ''} onChange={(e) => setLocal({ ...local, location: e.target.value })} />
                </Field>
                <Field label="Encargado de producción">
                  <Input value={local.producer_name || ''} onChange={(e) => setLocal({ ...local, producer_name: e.target.value })} />
                </Field>
              </div>
            </Section>

            {/* TEAM */}
            <Section
              title="Equipo y roles"
              action={
                <Button size="sm" variant="outline" onClick={() => upsertTeam.mutate({
                  sheet_id: sheetId, role: '', name: '', sort_order: data.team.length,
                })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                </Button>
              }
            >
              <div className="space-y-2">
                {data.team.length === 0 && <EmptyHint>Sin miembros aún</EmptyHint>}
                {data.team.map((m) => (
                  <div key={m.id} className="grid grid-cols-[auto,1fr,1fr,1.5fr,auto] gap-2 items-center bg-noeval-surface border border-noeval-line rounded-md p-2">
                    <GripVertical className="h-4 w-4 text-noeval-muted" />
                    <Input defaultValue={m.role} placeholder="Rol (Director, DP...)" onBlur={(e) => e.target.value !== m.role && upsertTeam.mutate({ ...m, role: e.target.value })} />
                    <Input defaultValue={m.name} placeholder="Nombre" onBlur={(e) => e.target.value !== m.name && upsertTeam.mutate({ ...m, name: e.target.value })} />
                    <Input defaultValue={m.clickup_user_email || ''} placeholder="email@clickup (opcional)" onBlur={(e) => e.target.value !== (m.clickup_user_email || '') && upsertTeam.mutate({ ...m, clickup_user_email: e.target.value || null })} />
                    <Button size="icon" variant="ghost" onClick={() => delTeam.mutate({ id: m.id, sheet_id: sheetId })}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </Section>

            {/* SHOT LIST */}
            <Section
              title="Shot list"
              action={
                <Button size="sm" variant="outline" onClick={() => upsertShot.mutate({
                  sheet_id: sheetId, description: '', done: false, sort_order: data.shots.length,
                })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                </Button>
              }
            >
              <div className="space-y-2">
                {data.shots.length === 0 && <EmptyHint>Aún sin tomas</EmptyHint>}
                {data.shots.map((shot, idx) => (
                  <div key={shot.id} className="bg-noeval-surface border border-noeval-line rounded-md p-3 space-y-2">
                    <div className="grid grid-cols-[auto,80px,80px,1fr,100px,auto] gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => upsertShot.mutate({ ...shot, done: !shot.done })}
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center ${shot.done ? 'bg-noeval-accent border-noeval-accent text-white' : 'border-noeval-line bg-white'}`}
                      >
                        {shot.done && <Check className="h-3 w-3" strokeWidth={4} />}
                      </button>
                      <Input defaultValue={shot.scene_label || ''} placeholder="Esc." onBlur={(e) => e.target.value !== (shot.scene_label || '') && upsertShot.mutate({ ...shot, scene_label: e.target.value || null })} />
                      <Input defaultValue={shot.shot_number || ''} placeholder={`#${idx + 1}`} onBlur={(e) => e.target.value !== (shot.shot_number || '') && upsertShot.mutate({ ...shot, shot_number: e.target.value || null })} />
                      <Input defaultValue={shot.description} placeholder="Descripción de la toma" onBlur={(e) => e.target.value !== shot.description && upsertShot.mutate({ ...shot, description: e.target.value })} className={shot.done ? 'line-through text-noeval-muted' : ''} />
                      <Input defaultValue={shot.shot_type || ''} placeholder="Tipo" onBlur={(e) => e.target.value !== (shot.shot_type || '') && upsertShot.mutate({ ...shot, shot_type: e.target.value || null })} />
                      <Button size="icon" variant="ghost" onClick={() => delShot.mutate({ id: shot.id, sheet_id: sheetId })}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Textarea defaultValue={shot.notes || ''} placeholder="Notas de la toma…" rows={2} onBlur={(e) => e.target.value !== (shot.notes || '') && upsertShot.mutate({ ...shot, notes: e.target.value || null })} className="text-xs" />
                  </div>
                ))}
              </div>
            </Section>

            {/* WARDROBE */}
            <Section
              title="Wardrobe & Props"
              action={
                <Button size="sm" variant="outline" onClick={() => upsertWardrobe.mutate({
                  sheet_id: sheetId, item: '', done: false, sort_order: data.wardrobe.length,
                })}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                </Button>
              }
            >
              <div className="space-y-2">
                {data.wardrobe.length === 0 && <EmptyHint>Sin items</EmptyHint>}
                {data.wardrobe.map((w) => (
                  <div key={w.id} className="grid grid-cols-[auto,1fr,auto] gap-2 items-center bg-noeval-surface border border-noeval-line rounded-md p-2">
                    <button
                      type="button"
                      onClick={() => upsertWardrobe.mutate({ ...w, done: !w.done })}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center ${w.done ? 'bg-noeval-accent border-noeval-accent text-white' : 'border-noeval-line bg-white'}`}
                    >
                      {w.done && <Check className="h-3 w-3" strokeWidth={4} />}
                    </button>
                    <Input defaultValue={w.item} placeholder="Ej: Camisa blanca, props mesa…" onBlur={(e) => e.target.value !== w.item && upsertWardrobe.mutate({ ...w, item: e.target.value })} className={w.done ? 'line-through text-noeval-muted' : ''} />
                    <Button size="icon" variant="ghost" onClick={() => delWardrobe.mutate({ id: w.id, sheet_id: sheetId })}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </Section>

            {/* NOTES */}
            <Section title="Notas libres">
              <Textarea
                value={local.notes || ''}
                onChange={(e) => setLocal({ ...local, notes: e.target.value })}
                placeholder="Tratamiento, referencias, instrucciones especiales…"
                rows={6}
                className="bg-noeval-surface border-noeval-line"
              />
            </Section>

            {/* ACTIONS */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-noeval-line">
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cerrar</Button>
                <Button
                  onClick={handleSendClickUp}
                  className="bg-noeval-ink text-noeval-cream hover:bg-noeval-ink/90"
                  title="Configura ClickUp para habilitar"
                >
                  <Send className="h-4 w-4 mr-1.5" /> Enviar a ClickUp
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------- UI primitives ----------
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif text-lg text-noeval-ink">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-noeval-muted">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-noeval-muted italic px-1">{children}</div>;
}
