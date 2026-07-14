import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { produccionesBasePath } from '@/lib/host-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, Trash2, Send, Check, Film, Printer, ExternalLink, Loader2,
  ChevronDown, ChevronUp, Copy, Sparkles, Share2, Link2, Globe, Mail,
  Pencil, Lock, FileText, GripVertical, ArrowUp, ArrowDown,
  Play, Square, Timer, RotateCcw,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useProductionSheet, useUpdateSheet, useDeleteSheet,
  useUpsertChild, useDeleteChild, useReorderShots,
  type ProductionSheet, type SheetShot,
} from '@/hooks/use-production-sheets';
import { SendToClickUpDialog } from '@/components/producciones/SendToClickUpDialog';
import { SendSummaryEmailDialog } from '@/components/producciones/SendSummaryEmailDialog';
import { GenerateShotsDialog } from '@/components/producciones/GenerateShotsDialog';
import { PieceCard } from '@/components/producciones/PieceCard';

const CONTENT_TYPES = [
  { value: 'reel', label: 'Reel', icon: '🎬' },
  { value: 'story', label: 'Story', icon: '📱' },
  { value: 'post', label: 'Post', icon: '🖼️' },
  { value: 'foto', label: 'Foto', icon: '📷' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'short', label: 'Short', icon: '▶️' },
  { value: 'otro', label: 'Otro', icon: '🎞️' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'multi', label: 'Multi-plataforma' },
];

function typeMeta(t?: string | null) {
  return CONTENT_TYPES.find(x => x.value === t) || { value: 'otro', label: 'Pieza', icon: '🎞️' };
}

// Convert ISO timestamp to <input type="datetime-local"> value in LOCAL time
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '—';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return '—';
  const totalSec = Math.floor((end - start) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatLiveDuration(startIso: string | null, now: number): string {
  if (!startIso) return '00:00:00';
  const start = new Date(startIso).getTime();
  if (isNaN(start) || now < start) return '00:00:00';
  const totalSec = Math.floor((now - start) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}


export default function ProduccionSheet() {
  const { sheetId = '' } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useProductionSheet(sheetId);
  const update = useUpdateSheet();
  const del = useDeleteSheet();
  const upsertShot = useUpsertChild('production_sheet_shots');
  const delShot = useDeleteChild('production_sheet_shots');
  const reorderShots = useReorderShots();

  const [local, setLocal] = useState<Partial<ProductionSheet>>({});
  const [clientName, setClientName] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'recorded'>('all');
  const [dragShotId, setDragShotId] = useState<string | null>(null);
  const [dropBeforeShotId, setDropBeforeShotId] = useState<string | null>(null);
  const [confirmDeleteShot, setConfirmDeleteShot] = useState<SheetShot | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [clickupOpen, setClickupOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Live tick for recording timer
  const [nowTick, setNowTick] = useState(() => Date.now());
  const isRecording = !!local.recording_started_at && !local.recording_ended_at;
  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRecording]);


  const shareToken = data?.sheet?.public_share_token || null;
  const shareEnabled = !!data?.sheet?.public_share_enabled;
  // Always build the share URL against the public custom domain so it is not
  // gated by Lovable preview auth (id-preview--*.lovable.app blocks anon).
  const publicHost = (() => {
    if (typeof window === 'undefined') return 'https://app.socialifycr.com';
    const host = window.location.hostname.toLowerCase();
    // If we're already on a real public domain, use the current origin
    if (host === 'app.socialifycr.com' || host === 'produ.socialifycr.com' || host === 'socialifycr.lovable.app') {
      return window.location.origin;
    }
    // Preview / lovableproject / localhost → point at the published app
    return 'https://app.socialifycr.com';
  })();
  const shareUrl = shareToken
    ? `${publicHost}/produccion-publica/${shareToken}`
    : '';

  const handleToggleShare = async (enabled: boolean) => {
    const patch: any = { id: sheetId, public_share_enabled: enabled };
    if (enabled && !shareToken) {
      patch.public_share_token = (globalThis.crypto?.randomUUID?.() ||
        // Fallback (very old browsers)
        `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
    }
    await update.mutateAsync(patch);
    toast.success(enabled ? 'Link público activado' : 'Link público desactivado');
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
      toast.success('Link copiado');
    } catch {
      toast.error('No pude copiar — copialo manualmente');
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerar el link invalidará el actual. ¿Continuar?')) return;
    const newToken = globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    await update.mutateAsync({ id: sheetId, public_share_token: newToken, public_share_enabled: true } as any);
    toast.success('Nuevo link generado');
  };

  useEffect(() => { if (data?.sheet) setLocal(data.sheet); }, [data?.sheet]);

  // Load client name
  useEffect(() => {
    if (!data?.sheet?.client_id) return;
    supabase.from('clients').select('name').eq('id', data.sheet.client_id).maybeSingle()
      .then(({ data: c }) => setClientName(c?.name || ''));
  }, [data?.sheet?.client_id]);

  // Auto-save header fields
  useEffect(() => {
    if (!data?.sheet) return;
    const t = setTimeout(() => {
      const patch: any = {};
      (['title', 'shoot_date', 'location', 'producer_name', 'notes', 'recording_started_at', 'recording_ended_at'] as const).forEach((k) => {
        if (local[k] !== data.sheet[k]) patch[k] = local[k];
      });
      if (Object.keys(patch).length) update.mutate({ id: sheetId, ...patch });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const shots = data?.shots || [];
  const visibleShots = useMemo(() => shots.filter(s => !pendingDeleteIds.has(s.id)), [shots, pendingDeleteIds]);
  const total = visibleShots.length;
  const recorded = visibleShots.filter(s => s.done).length;
  const pct = total ? Math.round((recorded / total) * 100) : 0;

  const filteredShots = useMemo(() => {
    if (filter === 'pending') return visibleShots.filter(s => !s.done);
    if (filter === 'recorded') return visibleShots.filter(s => s.done);
    return visibleShots;
  }, [visibleShots, filter]);

  const handleAddPiece = () => {
    upsertShot.mutate({
      sheet_id: sheetId,
      concept: '',
      description: '',
      content_type: 'reel',
      platform: 'instagram',
      done: false,
      is_draft: true,
      sort_order: shots.length,
    });
  };

  const handleDuplicate = (shot: SheetShot) => {
    const { id, ...rest } = shot;
    upsertShot.mutate({
      ...rest,
      done: false,
      recorded_at: null,
      clickup_task_id: null,
      clickup_url: null,
      sent_to_clickup_at: null,
      sort_order: shots.length,
      concept: (shot.concept || shot.description) + ' (copia)',
    });
  };

  const handleToggleRecorded = (shot: SheetShot) => {
    upsertShot.mutate({
      ...shot,
      done: !shot.done,
      recorded_at: shot.done ? null : new Date().toISOString(),
    });
  };

  const sheetSent = data?.sheet?.status === 'sent_to_clickup' || !!data?.sheet?.sent_to_clickup_at;

  const handleSendClickUp = () => {
    if (sheetSent) {
      if (!confirm('Esta hoja ya fue enviada a ClickUp. ¿Seguro que querés reenviar? Las tasks existentes se actualizarán y las nuevas piezas se crearán.')) return;
    }
    setClickupOpen(true);
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este sheet? Esta acción no se puede deshacer.')) return;
    await del.mutateAsync(sheetId);
    navigate(produccionesBasePath());
  };

  const recordedShots = visibleShots.filter(s => s.done);
  const pendingToSend = recordedShots.filter(s => !s.clickup_task_id).length;
  const alreadySent = recordedShots.filter(s => s.clickup_task_id).length;


  return (
    <DashboardLayout>
      <div className="noeval-scope min-h-screen">
        {isLoading || !data ? (
          <div className="py-24 text-center text-noeval-muted">Cargando…</div>
        ) : (
          <div className="print-area">
            <div className="max-w-5xl lg:max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-24 md:pb-6">

              {/* Top bar (no print) */}
              <div className="no-print flex items-center justify-between gap-3">
                <button
                  onClick={() => navigate(produccionesBasePath())}
                  className="inline-flex items-center gap-1.5 text-sm text-noeval-muted hover:text-noeval-ink transition"
                >
                  <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Volver a Producciones</span><span className="sm:hidden">Volver</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-noeval-muted truncate hidden md:block">
                    Producciones › {clientName || '—'} › <span className="text-noeval-ink">{local.title || 'Sin título'}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShareOpen(true)}
                    className={`gap-1.5 ${shareEnabled ? 'border-noeval-accent text-noeval-accent hover:bg-noeval-accent/10' : ''}`}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Compartir</span>
                    {shareEnabled && <span className="h-1.5 w-1.5 rounded-full bg-noeval-accent" />}
                  </Button>
                </div>
              </div>

              {/* SHARE DIALOG */}
              <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Compartir con clientes
                    </DialogTitle>
                    <DialogDescription>
                      Activá el link público para que cualquier persona con el enlace pueda ver esta hoja en modo lectura — sin necesidad de cuenta.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <div className="text-sm font-medium">Link público</div>
                      <div className="text-xs text-muted-foreground">
                        {shareEnabled ? 'Activo — cualquiera con el link puede ver la hoja' : 'Desactivado'}
                      </div>
                    </div>
                    <Switch
                      checked={shareEnabled}
                      onCheckedChange={handleToggleShare}
                      disabled={update.isPending}
                    />
                  </div>

                  {shareEnabled && shareUrl && (
                    <div className="space-y-2">
                      <Label className="text-xs">URL para compartir</Label>
                      <div className="flex items-center gap-2">
                        <Input value={shareUrl} readOnly className="text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
                        <Button size="sm" onClick={handleCopyShareUrl} className="shrink-0">
                          {shareCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-noeval-muted hover:text-noeval-ink inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Abrir vista pública
                        </a>
                        <button
                          onClick={handleRegenerateToken}
                          className="text-xs text-muted-foreground hover:text-destructive transition"
                        >
                          Regenerar link
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                        Quien tenga el link ve título, fecha, locación, equipo, piezas, vestuario y notas. No puede editar nada. Desactivá el switch para revocar el acceso al instante.
                      </p>
                    </div>
                  )}
                </DialogContent>
              </Dialog>


              {/* HEADER — Editorial paper */}
              <div className="noeval-paper-hero relative overflow-hidden rounded-2xl p-5 sm:p-8 md:p-10">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-noeval-accent" />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-noeval-muted text-[10px] tracking-[0.42em] uppercase font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-noeval-accent animate-pulse" />
                    <span className="truncate text-noeval-ink/60">Hoja de contenido · {clientName}</span>
                  </div>
                  <span className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted/70 font-medium">
                    Producción de redes sociales
                  </span>
                </div>

                <input
                  value={local.title || ''}
                  onChange={(e) => setLocal({ ...local, title: e.target.value })}
                  placeholder="Título de la producción"
                  className="mt-3 w-full bg-transparent font-serif text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight text-noeval-ink placeholder:text-noeval-muted/30 outline-none border-0"
                />

                <div className="noeval-hero-rule h-px w-full mt-5 opacity-15" />

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                  <InlineField label="Fecha">
                    <input
                      type="date"
                      value={local.shoot_date || ''}
                      onChange={(e) => setLocal({ ...local, shoot_date: e.target.value || null })}
                      className="bg-transparent text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-1 w-full text-sm h-10 sm:h-auto"
                    />
                  </InlineField>
                  <InlineField label="Locación">
                    <input
                      value={local.location || ''}
                      onChange={(e) => setLocal({ ...local, location: e.target.value })}
                      placeholder="—"
                      className="bg-transparent text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-1 w-full text-sm h-10 sm:h-auto placeholder:text-noeval-muted/40"
                    />
                  </InlineField>
                  <InlineField label="Responsable">
                    <input
                      value={local.producer_name || ''}
                      onChange={(e) => setLocal({ ...local, producer_name: e.target.value })}
                      placeholder="—"
                      className="bg-transparent text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-1 w-full text-sm h-10 sm:h-auto placeholder:text-noeval-muted/40"
                    />
                  </InlineField>
                </div>

                {/* CRONÓMETRO DE GRABACIÓN */}
                <div className="mt-6 rounded-2xl border border-noeval-line bg-[color:var(--noeval-cream)]/60 p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 shrink-0 rounded-full border flex items-center justify-center ${isRecording ? 'border-noeval-accent text-noeval-accent bg-noeval-accent/5' : 'border-noeval-line text-noeval-muted'}`}>
                        <Timer className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] tracking-[0.4em] uppercase text-noeval-muted font-semibold">Cronómetro de grabación</div>
                        <div className="font-serif text-2xl sm:text-3xl text-noeval-ink tracking-tight tabular-nums leading-tight mt-0.5">
                          {isRecording
                            ? formatLiveDuration(local.recording_started_at || null, nowTick)
                            : (local.recording_started_at && local.recording_ended_at)
                              ? formatDuration(local.recording_started_at, local.recording_ended_at)
                              : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                      <InlineField label="Inicio de grabación">
                        <input
                          type="datetime-local"
                          value={isoToLocalInput(local.recording_started_at || null)}
                          onChange={(e) => setLocal({ ...local, recording_started_at: localInputToIso(e.target.value) })}
                          className="bg-transparent text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-1 w-full text-sm h-10 sm:h-auto"
                        />
                      </InlineField>
                      <InlineField label="Fin de grabación">
                        <input
                          type="datetime-local"
                          value={isoToLocalInput(local.recording_ended_at || null)}
                          onChange={(e) => setLocal({ ...local, recording_ended_at: localInputToIso(e.target.value) })}
                          className="bg-transparent text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-1 w-full text-sm h-10 sm:h-auto"
                        />
                      </InlineField>
                    </div>

                    <div className="flex items-center gap-2 no-print">
                      {!local.recording_started_at && (
                        <Button
                          size="sm"
                          onClick={() => setLocal({ ...local, recording_started_at: new Date().toISOString(), recording_ended_at: null })}
                          className="bg-noeval-accent hover:bg-noeval-accent/90 text-white gap-1.5 rounded-full"
                        >
                          <Play className="h-4 w-4" /> Iniciar
                        </Button>
                      )}
                      {isRecording && (
                        <Button
                          size="sm"
                          onClick={() => setLocal({ ...local, recording_ended_at: new Date().toISOString() })}
                          className="bg-noeval-ink hover:bg-noeval-ink/90 text-white gap-1.5 rounded-full"
                        >
                          <Square className="h-4 w-4" /> Terminar
                        </Button>
                      )}
                      {local.recording_started_at && local.recording_ended_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocal({ ...local, recording_started_at: null, recording_ended_at: null })}
                          className="gap-1.5 rounded-full border-noeval-line text-noeval-muted hover:text-noeval-ink"
                        >
                          <RotateCcw className="h-4 w-4" /> Reiniciar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>



                {/* Progress */}
                <div className="mt-7 flex flex-col md:flex-row md:items-end gap-4">
                  <div>
                    <div className="text-[10px] tracking-[0.4em] uppercase text-noeval-muted">Grabadas</div>
                    <div className="font-serif text-4xl sm:text-5xl md:text-6xl text-noeval-ink leading-none mt-1 tracking-tighter">
                      <span className="text-noeval-accent">{recorded}</span>
                      <span className="text-noeval-ink/25"> / {total}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="progress-track h-2">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted mt-1.5">
                      {pct}% completado
                    </div>
                  </div>
                </div>
              </div>


              {/* TABLERO DE PIEZAS */}
              <section>
                {/* Section title */}
                <div className="mb-4 flex items-end justify-between gap-3 flex-wrap no-print">
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] tracking-[0.4em] uppercase border border-noeval-accent text-noeval-accent px-2.5 py-1 font-semibold">
                      Piezas
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-noeval-ink mt-2 tracking-tight">Contenido a grabar</h2>
                  </div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted font-semibold hidden sm:block">
                    {total} pieza{total !== 1 ? 's' : ''} · {recorded} grabada{recorded !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Editorial toolbar — filters + actions */}
                <div className="mb-4 no-print bg-noeval-surface border border-noeval-ink rounded-2xl flex flex-col md:flex-row md:items-stretch md:justify-between overflow-hidden">
                  {/* Filters as bordered pills */}
                  <div className="flex divide-x divide-noeval-line border-b md:border-b-0 md:border-r border-noeval-line">
                    {(['all', 'pending', 'recorded'] as const).map((f) => {
                      const active = filter === f;
                      const label = f === 'all' ? `Todas · ${total}` : f === 'pending' ? `Pendientes · ${total - recorded}` : `Grabadas · ${recorded}`;
                      return (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition whitespace-nowrap ${
                            active ? 'bg-noeval-ink text-noeval-cream' : 'text-noeval-ink/70 hover:bg-noeval-paper hover:text-noeval-ink'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions cluster */}
                  <div className="flex divide-x divide-noeval-line">
                    <button
                      onClick={() => setAiOpen(true)}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-noeval-ink hover:bg-noeval-accent hover:text-white transition"
                      title="Generar piezas con IA"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Generar IA</span><span className="sm:hidden">IA</span>
                    </button>
                    <button
                      onClick={handleSendClickUp}
                      disabled={recordedShots.length === 0 && !sheetSent}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-noeval-ink hover:bg-noeval-ink hover:text-noeval-cream transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-noeval-ink"
                      title={sheetSent ? 'Reenviar a ClickUp' : 'Enviar grabadas a ClickUp'}
                    >
                      <Send className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ClickUp</span>
                      {pendingToSend > 0 && (
                        <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-noeval-accent text-white text-[9px] font-bold">
                          {pendingToSend}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setEmailOpen(true)}
                      disabled={recordedShots.length === 0}
                      className="hidden sm:flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-noeval-ink hover:bg-noeval-ink hover:text-noeval-cream transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-noeval-ink"
                      title="Enviar resumen por correo"
                    >
                      <Mail className="h-3.5 w-3.5" /> Correo
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="hidden sm:flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-noeval-ink hover:bg-noeval-ink hover:text-noeval-cream transition"
                      title="Imprimir / PDF"
                    >
                      <Printer className="h-3.5 w-3.5" /> PDF
                    </button>
                    <button
                      onClick={handleAddPiece}
                      className="flex items-center gap-1.5 px-3 sm:px-5 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest bg-noeval-accent text-white hover:bg-noeval-ink transition"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Nueva pieza
                    </button>
                  </div>
                </div>


                {filteredShots.length === 0 ? (
                  <button
                    onClick={handleAddPiece}
                    className="w-full py-16 text-center bg-noeval-surface border-2 border-dashed border-noeval-ink/20 rounded-2xl hover:border-noeval-accent hover:bg-noeval-accent/5 transition group"
                  >
                    <div className="mx-auto w-12 h-12 rounded-full border border-noeval-ink/20 flex items-center justify-center mb-3 group-hover:border-noeval-accent group-hover:bg-noeval-accent group-hover:text-white transition">
                      <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted font-bold">
                      {total === 0 ? 'Crear la primera pieza' : 'Sin piezas con este filtro'}
                    </p>
                  </button>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filter !== 'all' && (
                      <div className="col-span-full text-[10px] tracking-[0.25em] uppercase text-noeval-muted/70">
                        Cambiá el filtro a <em>Todas</em> para reordenar.
                      </div>
                    )}
                    {filteredShots.map((shot) => {
                      const canDrag = filter === 'all';
                      const isDragging = dragShotId === shot.id;
                      const showDropLine = dropBeforeShotId === shot.id && dragShotId && dragShotId !== shot.id;
                      return (
                        <div
                          key={shot.id}
                          onDragOver={(e) => {
                            if (!canDrag || !dragShotId || dragShotId === shot.id) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDropBeforeShotId(shot.id);
                          }}
                          onDragLeave={() => {
                            if (dropBeforeShotId === shot.id) setDropBeforeShotId(null);
                          }}
                          onDrop={(e) => {
                            if (!canDrag || !dragShotId || dragShotId === shot.id) {
                              setDropBeforeShotId(null);
                              return;
                            }
                            e.preventDefault();
                            const list = shots.map(s => s.id).filter(id => id !== dragShotId);
                            const targetIdx = list.indexOf(shot.id);
                            if (targetIdx === -1) { setDropBeforeShotId(null); setDragShotId(null); return; }
                            list.splice(targetIdx, 0, dragShotId);
                            const items = list.map((id, i) => ({ id, sort_order: (i + 1) * 10 }));
                            setDragShotId(null);
                            setDropBeforeShotId(null);
                            reorderShots.mutate({ sheet_id: sheetId, items });
                          }}
                          className={`relative transition ${isDragging ? 'opacity-40' : ''}`}
                        >
                          {showDropLine && (
                            <div className="absolute -top-2 left-0 right-0 h-1 bg-noeval-accent rounded-full z-10 pointer-events-none" />
                          )}
                          <PieceCard
                            shot={shot}
                            index={shots.indexOf(shot)}
                            canDrag={canDrag}
                            canMoveUp={canDrag && shots.indexOf(shot) > 0}
                            canMoveDown={canDrag && shots.indexOf(shot) < shots.length - 1}
                            onMove={(dir) => {
                              const idx = shots.indexOf(shot);
                              const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
                              if (targetIdx < 0 || targetIdx >= shots.length) return;
                              const list = shots.map(s => s.id);
                              [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
                              const items = list.map((id, i) => ({ id, sort_order: (i + 1) * 10 }));
                              reorderShots.mutate({ sheet_id: sheetId, items });
                            }}
                            onDragStart={() => setDragShotId(shot.id)}
                            onDragEnd={() => { setDragShotId(null); setDropBeforeShotId(null); }}
                            onChange={(patch) => upsertShot.mutate({ ...shot, ...patch })}
                            onToggleRecorded={() => handleToggleRecorded(shot)}
                            onDuplicate={() => handleDuplicate(shot)}
                            onDelete={() => setConfirmDeleteShot(shot)}
                          />
                        </div>
                      );
                    })}
                    {/* Drop zone at end */}
                    {filter === 'all' && dragShotId && (
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!dragShotId) return;
                          const list = shots.map(s => s.id).filter(id => id !== dragShotId);
                          list.push(dragShotId);
                          const items = list.map((id, i) => ({ id, sort_order: (i + 1) * 10 }));
                          setDragShotId(null);
                          setDropBeforeShotId(null);
                          reorderShots.mutate({ sheet_id: sheetId, items });
                        }}
                        className="col-span-full h-12 rounded-xl border-2 border-dashed border-noeval-accent/40 bg-noeval-accent/5 flex items-center justify-center text-[10px] tracking-[0.3em] uppercase text-noeval-accent"
                      >
                        Soltar al final
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* NOTAS GENERALES (editable, no se imprime) */}
              <section className="noeval-paper-hero rounded-2xl p-6 md:p-8 relative overflow-hidden no-print">
                <div className="text-[10px] tracking-[0.4em] uppercase text-noeval-muted flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-noeval-accent" />
                  Notas generales
                </div>
                <h3 className="font-serif text-2xl text-noeval-ink mt-1 mb-3 tracking-tight">Apuntes del día</h3>
                <Textarea
                  value={local.notes || ''}
                  onChange={(e) => setLocal({ ...local, notes: e.target.value })}
                  placeholder="Tratamiento, referencias, instrucciones especiales, ajustes de último minuto…"
                  rows={5}
                  className="bg-[color:var(--noeval-paper)]/60 border-noeval-line text-noeval-ink placeholder:text-noeval-muted/50 resize-none"
                />
              </section>

              {/* HOJA DEL DÍA (resumen autogenerado) */}
              <section className="bg-noeval-cream border border-noeval-line rounded-2xl p-4 sm:p-6 md:p-9 daily-sheet">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-5 no-print">
                  <div>
                    <span className="inline-block text-[10px] tracking-[0.4em] uppercase border border-noeval-ink text-noeval-ink rounded-full px-3 py-1">
                      Registro
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl text-noeval-ink mt-2">Hoja del día</h2>
                    <p className="text-sm text-noeval-muted mt-1">
                      Resumen de lo grabado hoy. Listo para imprimir o exportar.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setEmailOpen(true)} disabled={recordedShots.length === 0} className="border-noeval-ink text-noeval-ink hover:bg-noeval-ink hover:text-noeval-cream">
                      <Mail className="h-4 w-4 mr-1.5" /> Enviar por correo
                    </Button>
                    <Button variant="outline" onClick={() => window.print()} className="border-noeval-ink text-noeval-ink hover:bg-noeval-ink hover:text-noeval-cream">
                      <Printer className="h-4 w-4 mr-1.5" /> Imprimir / PDF
                    </Button>
                  </div>
                </div>

                {/* Print header */}
                <div className="hidden print:block mb-6 pb-4 border-b-2 border-noeval-ink">
                  <div className="text-[10px] tracking-[0.4em] uppercase text-noeval-muted">Hoja de producción</div>
                  <h1 className="font-serif text-4xl text-noeval-ink mt-1">{local.title || 'Sin título'}</h1>
                  <div className="text-sm text-noeval-muted mt-1">{clientName}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5 text-sm">
                  <div>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Fecha</div>
                    <input
                      type="date"
                      value={local.shoot_date || ''}
                      onChange={(e) => setLocal({ ...local, shoot_date: e.target.value || null })}
                      className="no-print mt-0.5 w-full bg-transparent font-serif text-lg text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-1"
                    />
                    <div className="hidden print:block font-serif text-lg text-noeval-ink mt-0.5">
                      {local.shoot_date ? format(parseISO(local.shoot_date), "d 'de' MMMM, yyyy", { locale: es }) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Locación</div>
                    <input
                      value={local.location || ''}
                      onChange={(e) => setLocal({ ...local, location: e.target.value })}
                      placeholder="—"
                      className="no-print mt-0.5 w-full bg-transparent font-serif text-lg text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-1 placeholder:text-noeval-muted/50"
                    />
                    <div className="hidden print:block font-serif text-lg text-noeval-ink mt-0.5">{local.location || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-noeval-muted">Responsable</div>
                    <input
                      value={local.producer_name || ''}
                      onChange={(e) => setLocal({ ...local, producer_name: e.target.value })}
                      placeholder="—"
                      className="no-print mt-0.5 w-full bg-transparent font-serif text-lg text-noeval-ink outline-none border-b border-noeval-line focus:border-noeval-accent pb-1 placeholder:text-noeval-muted/50"
                    />
                    <div className="hidden print:block font-serif text-lg text-noeval-ink mt-0.5">{local.producer_name || '—'}</div>
                  </div>
                </div>


                {recordedShots.length === 0 ? (
                  <div className="text-center py-8 text-noeval-muted text-sm border-2 border-dashed border-noeval-line rounded-xl">
                    Aún no hay piezas grabadas. Marca tarjetas como grabadas arriba.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-[10px] tracking-[0.4em] uppercase text-noeval-muted">
                      {recordedShots.length} pieza{recordedShots.length !== 1 ? 's' : ''} grabada{recordedShots.length !== 1 ? 's' : ''}
                    </div>
                    {recordedShots.map((s, i) => {
                      const meta = typeMeta(s.content_type);
                      return (
                        <div key={s.id} className="flex gap-3 items-start border-l-4 border-noeval-accent bg-white px-4 py-3 rounded-r-lg">
                          <div className="font-serif text-xl text-noeval-muted shrink-0 w-10">{String(i + 1).padStart(2, '0')}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap text-[11px] tracking-[0.2em] uppercase">
                              <span className="bg-noeval-ink text-noeval-cream rounded-full px-2 py-0.5">{meta.icon} {meta.label}</span>
                              {s.platform && <span className="text-noeval-muted">· {PLATFORMS.find(p => p.value === s.platform)?.label || s.platform}</span>}
                              {s.recorded_at && (
                                <span className="text-noeval-muted ml-auto">
                                  {format(parseISO(s.recorded_at), 'HH:mm')}
                                </span>
                              )}
                            </div>
                            <div className="font-serif text-lg text-noeval-ink mt-1">{s.concept || s.description || '(sin concepto)'}</div>
                            {s.hook && <div className="text-sm text-noeval-muted mt-1"><strong className="text-noeval-ink">Hook:</strong> {s.hook}</div>}
                            {s.script && (
                              <div className="mt-2 pt-2 border-t border-noeval-line/60">
                                <div className="text-[9px] tracking-[0.3em] uppercase text-noeval-muted mb-0.5">📝 Guion</div>
                                <div className="text-sm text-noeval-ink whitespace-pre-wrap leading-relaxed">{s.script}</div>
                              </div>
                            )}
                            {s.cta && <div className="text-sm text-noeval-muted mt-1"><strong className="text-noeval-ink">CTA:</strong> {s.cta}</div>}
                            {s.tech_notes && (
                              <div className="mt-2 pt-2 border-t border-noeval-line/60">
                                <div className="text-[9px] tracking-[0.3em] uppercase text-noeval-muted mb-0.5">🎥 Notas técnicas</div>
                                <div className="text-sm text-noeval-ink whitespace-pre-wrap">{s.tech_notes}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {local.notes && (
                  <div className="mt-6 pt-4 border-t border-noeval-line">
                    <div className="text-[10px] tracking-[0.4em] uppercase text-noeval-muted mb-2">Notas del día</div>
                    <div className="text-sm text-noeval-ink whitespace-pre-wrap">{local.notes}</div>
                  </div>
                )}
              </section>

              {/* FOOTER ACTIONS */}
              <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-noeval-line">
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive self-start">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar sheet
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {sheetSent && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-semibold">
                      ✓ Completado
                    </span>
                  )}
                  {alreadySent > 0 && !sheetSent && (
                    <span className="text-xs text-noeval-muted">
                      {alreadySent} ya enviada{alreadySent !== 1 ? 's' : ''} a ClickUp
                    </span>
                  )}
                  <Button
                    onClick={handleSendClickUp}
                    disabled={recordedShots.length === 0 && !sheetSent}
                    className={`${sheetSent ? 'bg-noeval-ink/10 text-noeval-ink hover:bg-noeval-ink/20 border border-noeval-line' : 'bg-noeval-accent text-white hover:bg-noeval-accent/90'} disabled:opacity-50 w-full sm:w-auto`}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    {sheetSent
                      ? 'Reenviar a ClickUp'
                      : `Enviar ${pendingToSend > 0 ? `${pendingToSend} pieza${pendingToSend !== 1 ? 's' : ''}` : 'grabadas'} a ClickUp`}
                  </Button>
                </div>

              </div>
            </div>

            {/* MOBILE FAB · Nueva pieza */}
            <button
              onClick={handleAddPiece}
              className="no-print sm:hidden fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-noeval-accent text-white shadow-lg shadow-noeval-accent/40 flex items-center justify-center active:scale-95 transition"
              aria-label="Nueva pieza"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {data?.sheet && (
        <>
          <SendToClickUpDialog
            sheetId={sheetId}
            sheetTitle={data.sheet.title || ''}
            defaults={{
              spaceId: data.sheet.clickup_space_id,
              spaceName: data.sheet.clickup_space_name,
              listId: data.sheet.clickup_list_id,
              listName: data.sheet.clickup_list_name,
            }}
            open={clickupOpen}
            onClose={() => setClickupOpen(false)}
          />
          <SendSummaryEmailDialog
            open={emailOpen}
            onClose={() => setEmailOpen(false)}
            sheetId={sheetId}
            defaultSubject={`Resumen de producción · ${data.sheet.title || clientName}`}
          />
          <GenerateShotsDialog
            open={aiOpen}
            onOpenChange={setAiOpen}
            sheetId={sheetId}
            existingCount={shots.length}
            onInsert={async (newShots, replace) => {
              if (replace) {
                await Promise.all(shots.map((s) => delShot.mutateAsync({ id: s.id, sheet_id: sheetId })));
              }
              const base = replace ? 0 : shots.length;
              for (let i = 0; i < newShots.length; i++) {
                const s = newShots[i];
                await upsertShot.mutateAsync({
                  sheet_id: sheetId,
                  concept: s.concept,
                  description: s.description,
                  hook: s.hook,
                  script: s.script,
                  cta: s.cta,
                  tech_notes: s.tech_notes,
                  duration_estimate: s.duration_estimate,
                  content_type: s.content_type,
                  platform: s.platform,
                  done: false,
                  is_draft: false,
                  sort_order: base + i,
                });
              }
            }}
          />
        </>
      )}

      {/* Confirmación de eliminación de pieza */}
      <AlertDialog open={!!confirmDeleteShot} onOpenChange={(open) => !open && setConfirmDeleteShot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pieza</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteShot
                ? `¿Eliminar "${confirmDeleteShot.concept || confirmDeleteShot.description || 'esta pieza'}"?`
                : '¿Eliminar esta pieza?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteShot(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const shotToDelete = confirmDeleteShot;
                setConfirmDeleteShot(null);
                if (!shotToDelete) return;

                // Clear any existing timeout
                if (deleteTimeoutRef.current) {
                  clearTimeout(deleteTimeoutRef.current);
                }

                // Hide from UI immediately
                setPendingDeleteIds(prev => new Set(prev).add(shotToDelete.id));

                // Show undo toast
                const undoToastId = toast(
                  `Pieza "${shotToDelete.concept || shotToDelete.description || 'sin título'}" eliminada`,
                  {
                    description: 'Se eliminará permanentemente en unos segundos.',
                    duration: 5000,
                    action: {
                      label: 'Deshacer',
                      onClick: () => {
                        if (deleteTimeoutRef.current) {
                          clearTimeout(deleteTimeoutRef.current);
                          deleteTimeoutRef.current = null;
                        }
                        setPendingDeleteIds(prev => {
                          const next = new Set(prev);
                          next.delete(shotToDelete.id);
                          return next;
                        });
                        toast.success('Eliminación cancelada');
                      },
                    },
                    onAutoClose: () => {
                      // Timer expired — actually delete
                    },
                  }
                );

                // Start actual deletion timer
                deleteTimeoutRef.current = setTimeout(() => {
                  delShot.mutate(
                    { id: shotToDelete.id, sheet_id: sheetId },
                    {
                      onSuccess: () => {
                        setPendingDeleteIds(prev => {
                          const next = new Set(prev);
                          next.delete(shotToDelete.id);
                          return next;
                        });
                      },
                      onError: () => {
                        setPendingDeleteIds(prev => {
                          const next = new Set(prev);
                          next.delete(shotToDelete.id);
                          return next;
                        });
                        toast.error('No se pudo eliminar la pieza');
                      },
                    }
                  );
                  deleteTimeoutRef.current = null;
                }, 5000);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}


function InlineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.32em] uppercase text-noeval-muted mb-1 font-semibold">{label}</div>
      {children}
    </div>
  );
}
