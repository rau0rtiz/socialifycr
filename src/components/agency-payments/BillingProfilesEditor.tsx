import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Star, Loader2, Mail, Phone, MapPin, IdCard } from 'lucide-react';
import { useBillingProfiles, BillingProfileDraft } from '@/hooks/use-billing-profiles';

const emptyDraft = (): BillingProfileDraft => ({
  label: '',
  billing_name: '',
  billing_tax_id: '',
  billing_email: '',
  billing_phone: '',
  billing_address: '',
  is_default: false,
});

interface Props {
  paymentClientId?: string | null;
}

export const BillingProfilesEditor = ({ paymentClientId }: Props) => {
  const { profiles, isLoading, save, remove, makeDefault } = useBillingProfiles(paymentClientId);
  const [draft, setDraft] = useState<BillingProfileDraft | null>(null);

  const set = (patch: Partial<BillingProfileDraft>) =>
    setDraft(d => (d ? { ...d, ...patch } : d));

  if (!paymentClientId) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Guardá el cliente primero para agregar fichas de facturación.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Datos de facturación
        </p>
        {!draft && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setDraft(emptyDraft())}>
            <Plus className="h-3.5 w-3.5" /> Agregar ficha
          </Button>
        )}
      </div>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {profiles.map(p => (
            <Card key={p.id} className="p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate">{p.label}</span>
                {p.is_default && (
                  <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                    <Star className="h-3 w-3" /> Predeterminada
                  </Badge>
                )}
              </div>
              {p.billing_name && <p className="text-[11px] truncate">{p.billing_name}</p>}
              {p.billing_tax_id && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <IdCard className="h-3 w-3" /> {p.billing_tax_id}
                </p>
              )}
              {p.billing_email && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" /> {p.billing_email}
                </p>
              )}
              {p.billing_phone && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {p.billing_phone}
                </p>
              )}
              {p.billing_address && (
                <p className="text-[11px] text-muted-foreground flex items-start gap-1 line-clamp-2">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {p.billing_address}
                </p>
              )}
              <div className="flex items-center gap-1 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => setDraft({ ...p })}
                >
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                {!p.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => makeDefault.mutate(p.id)}
                  >
                    <Star className="h-3 w-3" /> Usar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 ml-auto"
                  onClick={() => {
                    if (confirm(`¿Eliminar la ficha "${p.label}"?`)) remove.mutate(p.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
          {profiles.length === 0 && !draft && (
            <p className="text-[11px] text-muted-foreground">Sin fichas guardadas.</p>
          )}
        </div>
      )}

      {draft && (
        <Card className="p-3 space-y-3 border-primary/40">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Nombre de la ficha</Label>
              <Input
                className="mt-1.5 h-9"
                value={draft.label || ''}
                onChange={e => set({ label: e.target.value })}
                placeholder="Ej: Empresa, Personal, Sucursal Heredia"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Razón social / Nombre</Label>
              <Input className="mt-1.5 h-9" value={draft.billing_name || ''} onChange={e => set({ billing_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Cédula</Label>
              <Input className="mt-1.5 h-9" value={draft.billing_tax_id || ''} onChange={e => set({ billing_tax_id: e.target.value })} placeholder="3-101-000000" />
            </div>
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input className="mt-1.5 h-9" value={draft.billing_phone || ''} onChange={e => set({ billing_phone: e.target.value })} placeholder="8888-8888" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Correo</Label>
              <Input type="email" className="mt-1.5 h-9" value={draft.billing_email || ''} onChange={e => set({ billing_email: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Dirección</Label>
              <Textarea className="mt-1.5 min-h-[60px] text-sm" value={draft.billing_address || ''} onChange={e => set({ billing_address: e.target.value })} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!draft.is_default}
                onChange={e => set({ is_default: e.target.checked })}
              />
              Usar como ficha predeterminada
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={save.isPending}
              onClick={async () => {
                await save.mutateAsync(draft);
                setDraft(null);
              }}
            >
              {save.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Guardar ficha
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
