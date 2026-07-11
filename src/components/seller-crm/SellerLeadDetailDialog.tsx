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
import { Phone, DollarSign, MessageCircle, Sparkles, Copy, Store, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
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
  const [tab, setTab] = useState<'info' | 'sale'>('info');
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

  useEffect(() => {
    if (open) {
      setTab('info');
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
    if (newStatus === 'venta') { setTab('sale'); return; }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[calc(100vw-1rem)] sm:w-full max-h-[95vh] sm:max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
            {lead.full_name || 'Lead'}
            {status === 'venta' && <Badge variant="default">Venta</Badge>}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {lead.client_name ? `${lead.client_name} · ` : ''}{formatDate(lead.created_time || lead.created_at)}
          </DialogDescription>
        </DialogHeader>

        {/* Status selector — always on top */}
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs shrink-0">Estado:</Label>
          <Select value={status} onValueChange={(v) => handleStatusChange(v as InstantFormLeadStatus)}>
            <SelectTrigger className="h-10 sm:h-9 flex-1 sm:flex-none sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cleanPhone && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto sm:ml-auto">
              <Button size="sm" variant="outline" className="h-10 sm:h-9 flex-1 sm:flex-none" onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}>
                <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
              <Button size="sm" variant="outline" className="h-10 sm:h-9 px-3" onClick={() => window.location.href = `tel:${cleanPhone}`}>
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === 'info' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setTab('info')}
          >Info del lead</button>
          <button
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === 'sale' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setTab('sale')}
          ><DollarSign className="inline h-3.5 w-3.5 mr-1" />Registrar venta</button>
        </div>


        {tab === 'info' && (
          <div className="space-y-3 text-sm">
            {(lead as any).store_visit_at && (
              <div className="flex items-start gap-2 rounded-md border border-[hsl(var(--status-visita))]/40 bg-[hsl(var(--status-visita))]/10 p-2.5">
                <Store className="h-4 w-4 text-[hsl(var(--status-visita))] mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Visita agendada</p>
                  <p className="font-semibold text-[hsl(var(--status-visita))]">{formatDate((lead as any).store_visit_at)}</p>
                  {(lead as any).store_visit_notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{(lead as any).store_visit_notes}</p>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => setVisitDialogOpen(true)}>
                  Reagendar
                </Button>
              </div>
            )}
            {cleanPhone && (
              <div className="flex items-center gap-2 rounded-md bg-muted/30 p-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer" className="hover:underline">{lead.phone}</a>
              </div>
            )}
            {(lead.campaign_name || lead.ad_name || lead.form_name) && (
              <div className="rounded-md bg-muted/30 p-2 text-xs space-y-0.5">
                {lead.campaign_name && <div><span className="text-muted-foreground">Campaña:</span> {lead.campaign_name}</div>}
                {lead.ad_name && <div><span className="text-muted-foreground">Anuncio:</span> {lead.ad_name}</div>}
                {lead.form_name && <div><span className="text-muted-foreground">Formulario:</span> {lead.form_name}</div>}
              </div>
            )}
            {answers.length > 0 && (
              <div className="rounded-md bg-muted/30 p-2">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Respuestas del formulario</p>
                <div className="space-y-1 text-xs">
                  {answers.map(([k, v]) => (
                    <div key={k} className="flex flex-col sm:flex-row gap-0.5 sm:gap-2">
                      <span className="text-muted-foreground capitalize sm:min-w-[120px]">{k.replace(/_/g, ' ')}:</span>
                      <span className="font-medium break-words">{String(v)}</span>
                    </div>
                  ))}

                </div>
              </div>
            )}
            {isComfortex && (
              <div className="rounded-md border border-dashed p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">Mensaje WhatsApp (IA)</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={handleGenerateMessage}
                    disabled={generating}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {generating ? 'Generando…' : generatedMessage ? 'Regenerar' : 'Generar mensaje'}
                  </Button>
                </div>
                {generatedMessage && (
                  <>
                    <Textarea
                      value={generatedMessage}
                      onChange={(e) => setGeneratedMessage(e.target.value)}
                      rows={8}
                      className="text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="secondary" className="flex-1 h-9" onClick={handleCopyMessage}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                      </Button>
                      {cleanPhone && (
                        <Button
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1" /> Abrir WhatsApp
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'sale' && (
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
            <Button onClick={handleRegisterSale} disabled={registerSale.isPending || !subtotal} className="w-full" size="lg">
              {registerSale.isPending ? 'Guardando...' : `Registrar venta — ${formatCRC(total)}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
