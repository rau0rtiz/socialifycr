import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Phone, DollarSign, MessageCircle, Sparkles, Copy, Store, CalendarIcon, Repeat, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  useRegisterSaleFromInstantFormLead,
  type InstantFormLeadStatus,
} from '@/hooks/use-instant-form-leads';
import { useUpdateSellerLeadStatus, type SellerLead } from '@/hooks/use-seller-leads';

const IVA_OPTIONS = [
  { value: '0', label: '0% (exento)' },
  { value: '1', label: '1%' },
  { value: '2', label: '2%' },
  { value: '4', label: '4%' },
  { value: '13', label: '13% (general)' },
];

const STATUS_OPTIONS: { value: InstantFormLeadStatus; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'visita_tienda', label: 'Visita a la tienda' },
  { value: 'venta', label: 'Venta' },
  { value: 'perdido', label: 'Perdido' },
];

const formatCRC = (n: number) => '₡' + new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(n);
const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

interface Props {
  lead: SellerLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SellerLeadDetailDialog = ({ lead, open, onOpenChange }: Props) => {
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [embroidery, setEmbroidery] = useState(false);
  const [subtotalStr, setSubtotalStr] = useState('');
  const [ivaPct, setIvaPct] = useState('13');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');

  // Visit scheduler state
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState('10:00');
  const [visitNotes, setVisitNotes] = useState('');
  const [savingVisit, setSavingVisit] = useState(false);

  const registerSale = useRegisterSaleFromInstantFormLead(lead?.client_id || null);
  const updateStatus = useUpdateSellerLeadStatus();
  const qc = useQueryClient();

  // Previous submissions (recontact history) — same client + same phone, other form_ids
  const normalizedPhone = (lead?.phone || '').replace(/\D/g, '');
  const [historyOpen, setHistoryOpen] = useState(true);
  // Previous submissions from same phone in this client (recontact history)
  const { data: historyFull = [] } = useQuery({
    queryKey: ['lead-recontact-history-full', lead?.client_id, normalizedPhone, lead?.id],
    enabled: open && !!lead?.is_recontact && !!lead?.client_id && normalizedPhone.length >= 6,
    staleTime: 60_000,
    queryFn: async () => {
      // Match phones with the same trailing digits (handles +506, 506, spaces, dashes).
      const last8 = normalizedPhone.slice(-8);
      const { data, error } = await supabase
        .from('instant_form_leads')
        .select('id, form_id, form_name, phone, created_time, created_at, custom_answers, campaign_name, ad_name, lead_status')
        .eq('client_id', lead!.client_id)
        .neq('id', lead!.id)
        .ilike('phone', `%${last8}%`)
        .order('created_time', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      // Final normalization check to avoid false positives from partial digit matches.
      return (data || []).filter((r: any) => {
        const n = (r.phone || '').replace(/\D/g, '');
        return n.endsWith(last8) && n.length >= 7;
      });
    },
  });

  useEffect(() => {
    if (open) {
      setSaleDialogOpen(false);
      setQuantity('1');
      setEmbroidery(false);
      setSubtotalStr('');
      setIvaPct('13');
      setNotes('');
      setGeneratedMessage((lead as any)?.ai_message || '');
      // Preload existing visit info if any
      const existingVisit = (lead as any)?.store_visit_at as string | null | undefined;
      if (existingVisit) {
        const d = new Date(existingVisit);
        setVisitDate(d);
        setVisitTime(
          new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', hour12: false })
            .format(d)
        );
      } else {
        setVisitDate(undefined);
        setVisitTime('10:00');
      }
      setVisitNotes((lead as any)?.store_visit_notes || '');
    }
  }, [open, lead?.id]);

  const subtotal = useMemo(() => {
    const n = parseFloat(subtotalStr.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isFinite(n) && n > 0 ? n : 0;
  }, [subtotalStr]);
  const taxRate = parseInt(ivaPct, 10) / 100;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  if (!lead) return null;
  const answers = Object.entries(lead.custom_answers || {}).filter(([, v]) => v !== '' && v != null);
  const cleanPhone = (lead.phone || '').replace(/\D/g, '');
  const status = (lead.lead_status || 'new') as InstantFormLeadStatus;

  const handleRegisterSale = async () => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (!subtotal) { toast.error('Ingresá un subtotal válido'); return; }
    try {
      await registerSale.mutateAsync({ lead: lead as any, quantity: qty, embroidery, subtotal, tax_rate: taxRate, notes: notes || undefined });
      toast.success('Venta registrada', { description: formatCRC(total) });
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Error al registrar venta', { description: e.message });
    }
  };

  const handleStatusChange = async (newStatus: InstantFormLeadStatus) => {
    if (newStatus === 'venta') { setSaleDialogOpen(true); return; }
    if (newStatus === 'visita_tienda') { setVisitDialogOpen(true); return; }
    try {
      await updateStatus.mutateAsync({ leadId: lead.id, status: newStatus });
      toast.success(`Estado: ${STATUS_OPTIONS.find(o => o.value === newStatus)?.label}`);
    } catch (e: any) {
      toast.error('No se pudo actualizar', { description: e.message });
    }
  };

  const handleSaveVisit = async () => {
    if (!visitDate) { toast.error('Elegí una fecha para la visita'); return; }
    const [hh, mm] = (visitTime || '10:00').split(':').map((n) => parseInt(n, 10) || 0);
    // Build a UTC ISO from CR-local date + time (CR is UTC-6, no DST)
    const y = visitDate.getFullYear();
    const mo = visitDate.getMonth();
    const d = visitDate.getDate();
    // Local wall time in CR → convert to UTC by adding 6h
    const utcMs = Date.UTC(y, mo, d, hh + 6, mm, 0, 0);
    const iso = new Date(utcMs).toISOString();
    setSavingVisit(true);
    try {
      const { error } = await supabase
        .from('instant_form_leads')
        .update({
          lead_status: 'visita_tienda',
          store_visit_at: iso,
          store_visit_notes: visitNotes.trim() || null,
        } as any)
        .eq('id', lead.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['seller-leads'] });
      qc.invalidateQueries({ queryKey: ['instant-form-leads'] });
      toast.success('Visita agendada', { description: format(visitDate, "d MMM yyyy", { locale: es }) + ' · ' + visitTime });
      setVisitDialogOpen(false);
    } catch (e: any) {
      toast.error('No se pudo agendar la visita', { description: e.message });
    } finally {
      setSavingVisit(false);
    }
  };

  const isComfortex = (lead.client_name || '').toLowerCase().includes('comfortex')
    || lead.client_id === 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7';

  const handleGenerateMessage = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-comfortex-reply', {
        body: { leadId: lead.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setGeneratedMessage((data as any)?.message || '');
      // Refresh cached leads so the stored ai_message stays in sync everywhere.
      qc.invalidateQueries({ queryKey: ['seller-leads'] });
      qc.invalidateQueries({ queryKey: ['instant-form-leads', lead.client_id] });
      toast.success('Mensaje generado');
    } catch (e: any) {
      toast.error('No se pudo generar el mensaje', { description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      toast.success('Mensaje copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const STATUS_BAR: Record<string, string> = {
    new: 'bg-[hsl(var(--status-new))]',
    contactado: 'bg-[hsl(var(--status-contactado))]',
    seguimiento: 'bg-[hsl(var(--status-seguimiento))]',
    visita_tienda: 'bg-[hsl(var(--status-visita))]',
    venta: 'bg-[hsl(var(--status-venta))]',
    perdido: 'bg-[hsl(var(--status-perdido))]',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[calc(100vw-1rem)] sm:w-full max-h-[95vh] sm:max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Left status accent bar */}
        <div className={cn('absolute top-0 left-0 w-1.5 h-full rounded-l-2xl', STATUS_BAR[status] || STATUS_BAR.new)} aria-hidden />

        <div className="px-5 sm:px-7 pt-6 pb-2">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight pr-8">
              {lead.full_name || 'Lead'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
              {lead.client_name && <><span className="font-medium">{lead.client_name}</span><span className="w-1 h-1 rounded-full bg-muted-foreground/40" /></>}
              <span>{formatDate(lead.created_time || lead.created_at)}</span>
              {lead.is_recontact && (
                <><span className="w-1 h-1 rounded-full bg-muted-foreground/40" /><span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold"><Repeat className="h-3 w-3" />Recontacto</span></>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 sm:px-7 pb-6 space-y-5">
          {/* Estado + acciones rápidas */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Estado del lead</Label>
              <Select value={status} onValueChange={(v) => handleStatusChange(v as InstantFormLeadStatus)}>
                <SelectTrigger className="h-11 font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cleanPhone && (
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1 sm:flex-none font-semibold" onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}>
                  <MessageCircle className="h-4 w-4 mr-1.5 text-emerald-500" /> WhatsApp
                </Button>
                <Button variant="outline" className="h-11 w-11 p-0 shrink-0" onClick={() => window.location.href = `tel:${cleanPhone}`} aria-label="Llamar">
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* CTA principal */}
          <Button
            size="lg"
            onClick={() => setSaleDialogOpen(true)}
            className="w-full h-12 bg-[hsl(var(--status-venta))] hover:bg-[hsl(var(--status-venta))]/90 text-white font-bold tracking-wide uppercase text-[13px] rounded-xl shadow-[0_10px_20px_-8px_hsl(var(--status-venta)/0.5)] active:scale-[0.98] transition-transform"
          >
            <DollarSign className="h-5 w-5 mr-2" /> Registrar venta
          </Button>

          {/* Visita agendada */}
          {(lead as any).store_visit_at && (
            <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--status-visita))]/30 bg-[hsl(var(--status-visita))]/8 p-3.5">
              <div className="p-2 rounded-lg bg-background border shadow-sm shrink-0">
                <Store className="h-4 w-4 text-[hsl(var(--status-visita))]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--status-visita))]/80">Visita agendada</p>
                <p className="text-sm font-bold text-[hsl(var(--status-visita))] mt-0.5">{formatDate((lead as any).store_visit_at)}</p>
                {(lead as any).store_visit_notes && (
                  <p className="text-xs text-muted-foreground mt-1">{(lead as any).store_visit_notes}</p>
                )}
              </div>
              <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0" onClick={() => setVisitDialogOpen(true)}>
                Reagendar
              </Button>
            </div>
          )}

          {/* Origen: teléfono + campaña */}
          {(cleanPhone || lead.campaign_name || lead.ad_name || lead.form_name) && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              {cleanPhone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background border shadow-sm shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer" className="text-sm font-bold tracking-tight hover:underline">{lead.phone}</a>
                </div>
              )}
              {(lead.campaign_name || lead.ad_name || lead.form_name) && (
                <div className="space-y-0 text-[11px]">
                  {lead.campaign_name && (
                    <div className="flex justify-between gap-3 py-2 border-b border-border/60">
                      <span className="text-muted-foreground font-semibold uppercase tracking-wider">Campaña</span>
                      <span className="font-bold text-right truncate">{lead.campaign_name}</span>
                    </div>
                  )}
                  {lead.ad_name && (
                    <div className="flex justify-between gap-3 py-2 border-b border-border/60">
                      <span className="text-muted-foreground font-semibold uppercase tracking-wider">Anuncio</span>
                      <span className="font-bold text-right truncate">{lead.ad_name}</span>
                    </div>
                  )}
                  {lead.form_name && (
                    <div className="flex justify-between gap-3 py-2">
                      <span className="text-muted-foreground font-semibold uppercase tracking-wider">Formulario</span>
                      <span className="font-bold text-right truncate">{lead.form_name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Respuestas del formulario */}
          {answers.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground pl-1">Respuestas del formulario</h3>
              <div className="space-y-2">
                {answers.map(([k, v]) => {
                  const isUrgency = /urgenc|pronto|cu[aá]ndo|cuando/i.test(k);
                  return (
                    <div
                      key={k}
                      className={cn(
                        'px-4 py-3 rounded-xl border flex items-center justify-between gap-3',
                        isUrgency
                          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30'
                          : 'bg-card border-border/80'
                      )}
                    >
                      <span className={cn('text-xs sm:text-sm font-medium capitalize truncate', isUrgency ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-muted-foreground')}>
                        {k.replace(/_/g, ' ')}
                      </span>
                      <span className={cn('text-xs sm:text-sm font-bold text-right break-words', isUrgency && 'text-amber-900 dark:text-amber-300 uppercase tracking-tight')}>
                        {String(v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historial de recontacto */}
          {lead.is_recontact && historyFull.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full flex items-center gap-2 text-left"
              >
                {historyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <Repeat className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Recontacto · {historyFull.length} formulario{historyFull.length === 1 ? '' : 's'} previo{historyFull.length === 1 ? '' : 's'}
                </span>
              </button>
              {historyOpen && (
                <div className="mt-2.5 space-y-2">
                  {historyFull.map((h: any) => {
                    const prevAnswers = Object.entries(h.custom_answers || {}).filter(([, v]) => v !== '' && v != null);
                    return (
                      <div key={h.id} className="rounded-lg bg-background/70 border p-2.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold">{h.form_name || 'Formulario'}</span>
                          <span className="text-muted-foreground text-[11px]">{formatDate(h.created_time || h.created_at)}</span>
                        </div>
                        {(h.campaign_name || h.ad_name) && (
                          <div className="text-[11px] text-muted-foreground">
                            {h.campaign_name && <>Campaña: {h.campaign_name}</>}
                            {h.campaign_name && h.ad_name && ' · '}
                            {h.ad_name && <>Anuncio: {h.ad_name}</>}
                          </div>
                        )}
                        {prevAnswers.length > 0 && (
                          <div className="space-y-0.5 pt-1.5 border-t">
                            {prevAnswers.map(([k, v]) => (
                              <div key={k} className="flex flex-col sm:flex-row gap-0.5 sm:gap-2">
                                <span className="text-muted-foreground capitalize sm:min-w-[120px]">{k.replace(/_/g, ' ')}:</span>
                                <span className="font-medium break-words">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Asistente IA */}
          {isComfortex && (
            <div className="rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/20 dark:to-indigo-950/20 border-b border-blue-100/60 dark:border-blue-900/30">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">Asistente IA · WhatsApp</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] font-bold uppercase tracking-wider rounded-full border-blue-200/70 dark:border-blue-800/60 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  onClick={handleGenerateMessage}
                  disabled={generating}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {generating ? 'Generando…' : generatedMessage ? 'Regenerar' : 'Generar'}
                </Button>
              </div>
              {generatedMessage ? (
                <div className="p-4 space-y-3">
                  <Textarea
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    rows={7}
                    className="text-[13px] leading-relaxed resize-y bg-muted/30 border-border/60"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1 h-9 font-semibold" onClick={handleCopyMessage}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar
                    </Button>
                    {cleanPhone && (
                      <Button
                        size="sm"
                        className="flex-1 h-9 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Abrir WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Generá una sugerencia inteligente basada en el formulario.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Nested: Register sale */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-full max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[hsl(var(--status-venta))]" />
              Registrar venta
            </DialogTitle>
            <DialogDescription className="text-xs">
              {lead.full_name || 'Lead'}{lead.client_name ? ` · ${lead.client_name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cantidad de camisas *</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={embroidery} onCheckedChange={(v) => setEmbroidery(!!v)} />
                  Lleva bordado
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Subtotal (CRC) *</Label>
                <Input type="text" inputMode="decimal" placeholder="0" value={subtotalStr} onChange={(e) => setSubtotalStr(e.target.value)} autoFocus />
              </div>
              <div>
                <Label className="text-xs">IVA</Label>
                <Select value={ivaPct} onValueChange={setIvaPct}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IVA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/20">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatCRC(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>IVA ({ivaPct}%)</span><span className="tabular-nums">{formatCRC(taxAmount)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t"><span>Total</span><span className="tabular-nums">{formatCRC(total)}</span></div>
            </div>
            <div>
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea placeholder="Detalles, talla, color, etc." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setSaleDialogOpen(false)} disabled={registerSale.isPending}>Cancelar</Button>
              <Button onClick={handleRegisterSale} disabled={registerSale.isPending || !subtotal} size="lg">
                {registerSale.isPending ? 'Guardando...' : `Registrar — ${formatCRC(total)}`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>


      {/* Nested: Visit scheduler */}
      <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-[hsl(var(--status-visita))]" />
              Agendar visita a la tienda
            </DialogTitle>
            <DialogDescription className="text-xs">
              {lead.full_name || 'Lead'} · Se guarda la fecha y hora en el lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Fecha *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal h-10', !visitDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {visitDate ? format(visitDate, 'd MMM yyyy', { locale: es }) : <span>Fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={visitDate}
                      onSelect={setVisitDate}
                      initialFocus
                      locale={es}
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Hora *</Label>
                <Input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea
                placeholder="Ej: viene con su esposa, prefiere la sucursal de Escazú..."
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setVisitDialogOpen(false)} disabled={savingVisit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVisit} disabled={savingVisit || !visitDate}>
              {savingVisit ? 'Guardando…' : 'Guardar visita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
