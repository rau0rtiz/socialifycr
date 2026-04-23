import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientProducts } from '@/hooks/use-client-products';
import { useLeadReservations, LeadReservation, ReservationInput } from '@/hooks/use-lead-reservations';
import { toast } from 'sonner';
import { Loader2, BookmarkPlus } from 'lucide-react';
import { format, addMonths } from 'date-fns';

interface ReservationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  /** Pre-fill from a lead/appointment */
  prefill?: {
    lead_id?: string | null;
    customer_name?: string;
    customer_phone?: string | null;
    customer_email?: string | null;
    product_name?: string | null;
  };
  /** When editing an existing reservation */
  editing?: LeadReservation | null;
  onSuccess?: (reservation: LeadReservation) => void;
}

export const ReservationFormDialog = ({
  open,
  onOpenChange,
  clientId,
  prefill,
  editing,
  onSuccess,
}: ReservationFormDialogProps) => {
  const { products } = useClientProducts(clientId);
  const { create, update } = useLeadReservations(clientId);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [productId, setProductId] = useState<string>('_none');
  const [productName, setProductName] = useState('');
  const [depositAmount, setDepositAmount] = useState<number>(200);
  const [currency, setCurrency] = useState<string>('USD');
  const [reservedAt, setReservedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCustomerName(editing.customer_name);
      setCustomerPhone(editing.customer_phone || '');
      setCustomerEmail(editing.customer_email || '');
      setProductId(editing.product_id || '_none');
      setProductName(editing.product_name || '');
      setDepositAmount(Number(editing.deposit_amount));
      setCurrency(editing.currency);
      setReservedAt(editing.reserved_at);
      setNotes(editing.notes || '');
    } else {
      setCustomerName(prefill?.customer_name || '');
      setCustomerPhone(prefill?.customer_phone || '');
      setCustomerEmail(prefill?.customer_email || '');
      setProductId('_none');
      setProductName(prefill?.product_name || '');
      setDepositAmount(200);
      setCurrency('USD');
      setReservedAt(new Date().toISOString().slice(0, 10));
      setNotes('');
    }
  }, [open, editing, prefill?.customer_name, prefill?.customer_phone, prefill?.customer_email, prefill?.product_name]);

  const handleProductChange = (value: string) => {
    setProductId(value);
    if (value === '_none') {
      // keep current productName as text
    } else {
      const p = products.find((x) => x.id === value);
      if (p) {
        setProductName(p.name);
        if (p.price != null) setDepositAmount(200); // keep deposit independent of product price
        if (p.currency) {
          // Mind Coach typically uses USD, but allow override
        }
      }
    }
  };

  const expiresPreview = (() => {
    try {
      return format(addMonths(new Date(reservedAt), 3), 'dd MMM yyyy');
    } catch {
      return '';
    }
  })();

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error('Nombre del cliente es requerido');
      return;
    }
    if (!depositAmount || depositAmount <= 0) {
      toast.error('Monto del depósito inválido');
      return;
    }
    try {
      if (editing) {
        const updated = await update.mutateAsync({
          id: editing.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          customer_email: customerEmail.trim() || null,
          product_id: productId === '_none' ? null : productId,
          product_name: productName.trim() || null,
          deposit_amount: depositAmount,
          currency,
          reserved_at: reservedAt,
          notes: notes.trim() || null,
        } as any);
        toast.success('Reserva actualizada');
        onSuccess?.(updated);
      } else {
        const input: ReservationInput = {
          client_id: clientId,
          lead_id: prefill?.lead_id ?? null,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          customer_email: customerEmail.trim() || null,
          product_id: productId === '_none' ? null : productId,
          product_name: productName.trim() || null,
          deposit_amount: depositAmount,
          currency,
          reserved_at: reservedAt,
          notes: notes.trim() || null,
        };
        const created = await create.mutateAsync(input);
        toast.success('Reserva creada');
        onSuccess?.(created);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Error guardando la reserva');
    }
  };

  const isSubmitting = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookmarkPlus className="h-4 w-4 text-primary" />
            {editing ? 'Editar reserva' : 'Reservar espacio'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            El espacio queda apartado por 3 meses desde la fecha de reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Nombre del cliente *</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre completo"
              className="h-10 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Teléfono</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+506 ..."
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Correo</Label>
              <Input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                type="email"
                placeholder="cliente@..."
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Producto / Servicio reservado</Label>
            <Select value={productId} onValueChange={handleProductChange}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Sin producto vinculado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin producto vinculado</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {productId === '_none' && (
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="o escribe un nombre libre"
                className="h-9 text-xs"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Depósito</Label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="h-10 text-sm"
                min={0}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CRC">CRC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Fecha de reserva</Label>
            <Input
              type="date"
              value={reservedAt}
              onChange={(e) => setReservedAt(e.target.value)}
              className="h-10 text-sm"
            />
            {expiresPreview && (
              <p className="text-[10px] text-muted-foreground">
                Vence aprox: <span className="font-medium text-foreground">{expiresPreview}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles del acuerdo, condiciones, etc."
              className="text-sm min-h-[70px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {editing ? 'Guardar cambios' : 'Crear reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
