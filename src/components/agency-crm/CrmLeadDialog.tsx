import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, CheckCircle2, XCircle, Upload, FileText, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AgencyCrmLead,
  CRM_STATUS_OPTIONS,
  CrmLeadInput,
  CURRENCY_OPTIONS,
  LOST_REASON_OPTIONS,
  LostReason,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_SCHEME_OPTIONS,
  SaleReceipt,
  useAgencyCrmLeads,
} from '@/hooks/use-agency-crm-leads';

import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const baseSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(120),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Correo inválido'),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead?: AgencyCrmLead | null;
}

export const CrmLeadDialog = ({ open, onOpenChange, lead }: Props) => {
  const { createLead, updateLead, deleteLead } = useAgencyCrmLeads();
  const { toast } = useToast();
  const [form, setForm] = useState<CrmLeadInput>({
    name: '',
    email: '',
    phone: '',
    status: 'nuevo',
    notes: '',
    sale_package: '',
    sale_includes: '',
    sale_amount: null,
    sale_currency: 'USD',
    sale_payment_scheme: '',
    lost_reason: null,
    lost_objection: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: lead?.name || '',
        email: lead?.email || '',
        phone: lead?.phone || '',
        status: lead?.status || 'nuevo',
        notes: lead?.notes || '',
        sale_package: lead?.sale_package || '',
        sale_includes: lead?.sale_includes || '',
        sale_amount: lead?.sale_amount ?? null,
        sale_currency: lead?.sale_currency || 'USD',
        sale_payment_scheme: lead?.sale_payment_scheme || '',
        lost_reason: (lead?.lost_reason as LostReason) || null,
        lost_objection: lead?.lost_objection || '',
      });
    }
  }, [open, lead]);

  const handleSave = async () => {
    const parsed = baseSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Datos inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    if (form.status === 'cliente') {
      if (!form.sale_package?.trim()) {
        toast({ title: 'Falta paquete', description: 'Indica qué paquete se vendió', variant: 'destructive' });
        return;
      }
      if (!form.sale_amount || form.sale_amount <= 0) {
        toast({ title: 'Falta monto', description: 'Ingresa el monto de la venta', variant: 'destructive' });
        return;
      }
    }
    if (form.status === 'perdido' && !form.lost_reason) {
      toast({ title: 'Falta motivo', description: 'Selecciona el motivo de la pérdida', variant: 'destructive' });
      return;
    }
    try {
      if (lead) {
        await updateLead.mutateAsync({ id: lead.id, patch: form, prevStatus: lead.status });
        toast({ title: 'Lead actualizado' });
      } else {
        await createLead.mutateAsync(form);
        toast({ title: 'Lead creado' });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    try {
      await deleteLead.mutateAsync(lead.id);
      toast({ title: 'Lead eliminado' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar lead' : 'Nuevo lead'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@dominio.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+506 ..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.status === 'cliente' && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Detalle de la venta
              </div>
              <div className="space-y-2">
                <Label>Paquete vendido *</Label>
                <Input
                  value={form.sale_package || ''}
                  onChange={(e) => setForm({ ...form, sale_package: e.target.value })}
                  placeholder="Ej: Setup + Mensualidad Pro"
                />
              </div>
              <div className="space-y-2">
                <Label>¿Qué incluye?</Label>
                <Textarea
                  rows={3}
                  value={form.sale_includes || ''}
                  onChange={(e) => setForm({ ...form, sale_includes: e.target.value })}
                  placeholder="Servicios, entregables, alcance..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={form.sale_amount ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, sale_amount: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={form.sale_currency || 'USD'}
                    onValueChange={(v) => setForm({ ...form, sale_currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Esquema de pago</Label>
                <Select
                  value={form.sale_payment_scheme || ''}
                  onValueChange={(v) => setForm({ ...form, sale_payment_scheme: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SCHEME_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {form.status === 'perdido' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
                <XCircle className="h-4 w-4" /> Objeción de compra
              </div>
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select
                  value={form.lost_reason || ''}
                  onValueChange={(v) => setForm({ ...form, lost_reason: v as LostReason })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LOST_REASON_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Detalle de la objeción</Label>
                <Textarea
                  rows={4}
                  value={form.lost_objection || ''}
                  onChange={(e) => setForm({ ...form, lost_objection: e.target.value })}
                  placeholder="¿Qué dijo el prospecto? ¿Qué objeción presentó?"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Información adicional</Label>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Contexto, próximos pasos, notas..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {lead ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este lead?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={createLead.isPending || updateLead.isPending}>
              {lead ? 'Guardar cambios' : 'Crear lead'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
