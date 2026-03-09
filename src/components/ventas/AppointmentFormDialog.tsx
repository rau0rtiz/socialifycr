import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AppointmentInput, SetterAppointment } from '@/hooks/use-setter-appointments';
import { useAllAds, AllAdItem } from '@/hooks/use-ads-data';
import { Image as ImageIcon, X, Plus } from 'lucide-react';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AppointmentInput) => void;
  clientId?: string;
  hasAdAccount?: boolean;
  isSubmitting?: boolean;
  editing?: SetterAppointment | null;
  existingSetters?: string[];
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Agendada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'completed', label: 'Realizada' },
  { value: 'no_show', label: 'No Show' },
  { value: 'sold', label: 'Venta' },
  { value: 'cancelled', label: 'Cancelada' },
];

const SOURCE_OPTIONS = [
  { value: 'ads', label: 'Publicidad' },
  { value: 'organic', label: 'Orgánico' },
  { value: 'referral', label: 'Referencia' },
  { value: 'other', label: 'Otro' },
];

export const AppointmentFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  clientId,
  hasAdAccount = false,
  isSubmitting,
  editing,
  existingSetters = [],
}: AppointmentFormDialogProps) => {
  const [leadName, setLeadName] = useState('');
  const [leadGoal, setLeadGoal] = useState('');
  const [setterName, setSetterName] = useState('');
  const [showNewSetter, setShowNewSetter] = useState(false);
  const [newSetterName, setNewSetterName] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [status, setStatus] = useState('scheduled');
  const [source, setSource] = useState('ads');
  const [selectedAd, setSelectedAd] = useState<AllAdItem | null>(null);
  const [notes, setNotes] = useState('');

  const shouldFetchAds = source === 'ads' && hasAdAccount;
  const { data: adsResult, isLoading: adsLoading } = useAllAds(
    shouldFetchAds ? clientId || null : null,
    shouldFetchAds,
  );
  const adsList = adsResult?.ads || [];

  useEffect(() => {
    if (open) {
      if (editing) {
        setLeadName(editing.lead_name);
        setLeadGoal((editing as any).lead_goal || '');
        setSetterName(editing.setter_name || '');
        setEstimatedValue(editing.estimated_value ? String(editing.estimated_value) : '');
        setCurrency(editing.currency as 'CRC' | 'USD');
        setStatus(editing.status);
        setSource(editing.source || 'ads');
        setNotes(editing.notes || '');
        if (editing.ad_id) {
          setSelectedAd({
            id: editing.ad_id,
            name: editing.ad_name || '',
            campaignId: editing.ad_campaign_id || '',
            campaignName: editing.ad_campaign_name || '',
            effectiveStatus: 'ACTIVE',
            thumbnailUrl: null,
            spend: 0,
          });
        } else {
          setSelectedAd(null);
        }
      } else {
        setLeadName('');
        setLeadGoal('');
        setSetterName('');
        setEstimatedValue('');
        setCurrency('CRC');
        setStatus('scheduled');
        setSource('ads');
        setSelectedAd(null);
        setNotes('');
      }
      setShowNewSetter(false);
      setNewSetterName('');
    }
  }, [open, editing]);

  const handleAddSetter = () => {
    if (newSetterName.trim()) {
      setSetterName(newSetterName.trim());
      setShowNewSetter(false);
      setNewSetterName('');
    }
  };

  const handleSubmit = () => {
    if (!leadName.trim()) return;
    onSubmit({
      lead_name: leadName.trim(),
      lead_goal: leadGoal.trim() || undefined,
      appointment_date: new Date().toISOString(),
      setter_name: setterName || undefined,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : 0,
      currency,
      status: status as any,
      source,
      ad_campaign_id: selectedAd?.campaignId || undefined,
      ad_campaign_name: selectedAd?.campaignName || undefined,
      ad_id: selectedAd?.id || undefined,
      ad_name: selectedAd?.name || undefined,
      notes: notes.trim() || undefined,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {editing ? 'Editar Lead' : 'Nuevo Lead'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Registra un lead para trackear el pipeline de ventas high-ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* Lead name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre del Cliente *</Label>
            <Input
              placeholder="Nombre completo del lead"
              value={leadName}
              onChange={e => setLeadName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Lead goal */}
          <div className="space-y-1.5">
            <Label className="text-xs">Meta del Cliente</Label>
            <Input
              placeholder="Ej: Generar 50 leads mensuales, Escalar ventas..."
              value={leadGoal}
              onChange={e => setLeadGoal(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Seller (setter) dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs">Vendedor Asignado</Label>
            {showNewSetter ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre del vendedor"
                  value={newSetterName}
                  onChange={e => setNewSetterName(e.target.value)}
                  className="h-8 text-xs flex-1"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSetter(); }}
                />
                <Button size="sm" className="h-8 text-xs" onClick={handleAddSetter} disabled={!newSetterName.trim()}>
                  Agregar
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowNewSetter(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={setterName || '_none'} onValueChange={v => setSetterName(v === '_none' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" className="text-xs">Sin asignar</SelectItem>
                    {existingSetters.map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewSetter(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Nuevo
                </Button>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Valor Estimado</Label>
              <Input
                type="number"
                placeholder="0"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
                className="h-8 text-xs"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={v => setCurrency(v as any)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC" className="text-xs">CRC</SelectItem>
                  <SelectItem value="USD" className="text-xs">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source & Ad */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fuente</Label>
            <Select value={source} onValueChange={v => { setSource(v); setSelectedAd(null); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {source === 'ads' && hasAdAccount && (
            <div className="space-y-1.5">
              <Label className="text-xs">Anuncio vinculado</Label>
              {adsLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : selectedAd ? (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{selectedAd.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{selectedAd.campaignName}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedAd(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="max-h-32 overflow-y-auto border border-border rounded-md">
                  {adsList.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">Sin anuncios activos</p>
                  ) : (
                    adsList.map(ad => (
                      <button
                        key={ad.id}
                        onClick={() => setSelectedAd(ad)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left border-b border-border last:border-0 transition-colors"
                      >
                        {ad.thumbnailUrl ? (
                          <img src={ad.thumbnailUrl} className="w-8 h-8 rounded object-cover flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{ad.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{ad.campaignName}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas</Label>
            <Textarea
              placeholder="Notas adicionales..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!leadName.trim() || isSubmitting}
            className="text-xs"
          >
            {isSubmitting ? 'Guardando...' : editing ? 'Guardar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};