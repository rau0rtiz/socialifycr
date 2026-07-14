import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRegisterTiktokSale } from '@/hooks/use-tiktok-sales';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** If provided, client is fixed. Otherwise the user picks from their teams. */
  clientId?: string | null;
}

const IVA_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '1', label: '1%' },
  { value: '2', label: '2%' },
  { value: '4', label: '4%' },
  { value: '13', label: '13%' },
];

const formatCRC = (n: number) => '₡' + new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(n);

export const TikTokSaleDialog = ({ open, onOpenChange, clientId }: Props) => {
  const { user } = useAuth();
  const register = useRegisterTiktokSale(clientId || null);

  const [selectedClient, setSelectedClient] = useState<string>(clientId || '');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [subtotalStr, setSubtotalStr] = useState('');
  const [ivaPct, setIvaPct] = useState('13');
  const [notes, setNotes] = useState('');

  // If no fixed clientId, load teams user belongs to
  const { data: userClients = [] } = useQuery({
    queryKey: ['user-client-teams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as { id: string; name: string }[];
      const { data, error } = await supabase
        .from('client_team_members')
        .select('client_id, clients:client_id(id, name)')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || [])
        .map((r: any) => r.clients)
        .filter((c: any) => c && c.id) as { id: string; name: string }[];
    },
    enabled: !clientId && open && !!user?.id,
  });

  useEffect(() => {
    if (!open) return;
    if (clientId) setSelectedClient(clientId);
    else if (userClients.length === 1) setSelectedClient(userClients[0].id);
  }, [open, clientId, userClients]);

  useEffect(() => {
    if (!open) {
      setFullName(''); setPhone(''); setQuantity('1');
      setSubtotalStr(''); setIvaPct('13'); setNotes('');
    }
  }, [open]);

  const subtotal = useMemo(() => {
    const n = parseFloat(subtotalStr.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isFinite(n) && n > 0 ? n : 0;
  }, [subtotalStr]);
  const taxRate = parseInt(ivaPct, 10) / 100;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const handleSave = async () => {
    const cid = selectedClient || clientId;
    if (!cid) { toast.error('Elegí un cliente'); return; }
    if (!fullName.trim()) { toast.error('Nombre requerido'); return; }
    if (!subtotal) { toast.error('Monto inválido'); return; }
    try {
      await register.mutateAsync({
        clientId: cid,
        fullName,
        phone,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        subtotal,
        tax_rate: taxRate,
        notes: notes || undefined,
      });
      toast.success('Venta TikTok registrada');
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Error', { description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" /> Nueva venta TikTok
            <Badge variant="secondary">TikTok</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!clientId && userClients.length > 1 && (
            <div>
              <Label className="text-xs">Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger><SelectValue placeholder="Elegí un cliente" /></SelectTrigger>
                <SelectContent>
                  {userClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </div>
            <div>
              <Label className="text-xs">Cantidad de camisas</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Monto sin IVA (CRC)</Label>
              <Input type="text" inputMode="decimal" value={subtotalStr} onChange={(e) => setSubtotalStr(e.target.value)} />
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
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Video, referencia..." />
          </div>
          <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/20">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatCRC(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>IVA ({ivaPct}%)</span><span className="tabular-nums">{formatCRC(taxAmount)}</span></div>
            <div className="flex justify-between font-semibold pt-1 border-t"><span>Total</span><span className="tabular-nums">{formatCRC(total)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={register.isPending}>Cancelar</Button>
          <Button onClick={handleSave} disabled={register.isPending || !subtotal}>
            {register.isPending ? 'Guardando...' : `Registrar — ${formatCRC(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
