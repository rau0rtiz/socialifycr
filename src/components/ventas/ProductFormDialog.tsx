import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useClientProducts, ClientProduct, ProductInput } from '@/hooks/use-client-products';
import { supabase } from '@/integrations/supabase/client';
import { Package, Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  editing?: ClientProduct | null;
  /** Optional default name to seed the form (useful when invoked from a sale wizard) */
  defaultName?: string;
  /** Called after a successful create/update with the resulting product */
  onSaved?: (product: ClientProduct) => void;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

/**
 * Reusable product create/edit dialog.
 * Uses the shared `useClientProducts` hook so any consumer (Business Setup,
 * RegisterSaleDialog, AppointmentFormDialog) automatically sees the new
 * product via React Query cache invalidation.
 */
export const ProductFormDialog = ({
  open,
  onOpenChange,
  clientId,
  editing = null,
  defaultName = '',
  onSaved,
}: ProductFormDialogProps) => {
  const { addProduct, updateProduct } = useClientProducts(clientId);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when opening / when editing target changes
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setPrice(editing.price != null ? String(editing.price) : '');
      setCost(editing.cost != null ? String(editing.cost) : '');
      setCurrency(editing.currency || 'CRC');
      setDescription(editing.description || '');
      setPhotoUrl(editing.photo_url || null);
    } else {
      setName(defaultName);
      setPrice('');
      setCost('');
      setCurrency('CRC');
      setDescription('');
      setPhotoUrl(null);
    }
  }, [open, editing, defaultName]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${clientId}/products/product-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('content-images').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(path);
      setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success('Foto subida');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    const input: ProductInput = {
      name: name.trim(),
      price: price ? parseFloat(price) : null,
      cost: cost ? parseFloat(cost) : null,
      currency,
      description: description.trim(),
      photo_url: photoUrl,
    };
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...input });
        toast.success('Producto actualizado');
        // updateProduct mutation doesn't return the row; build an optimistic merge
        onSaved?.({ ...editing, ...input } as ClientProduct);
      } else {
        const result = await addProduct.mutateAsync(input);
        toast.success('Producto creado');
        onSaved?.(result);
      }
      onOpenChange(false);
    } catch {
      toast.error('Error al guardar producto');
    }
  };

  const isPending = addProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            {editing ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Photo upload */}
          <div>
            <Label className="text-xs">Foto del producto</Label>
            <div className="mt-1.5 flex items-center gap-3">
              {photoUrl ? (
                <div className="relative">
                  <img src={photoUrl} alt="Producto" className="w-20 h-20 rounded-lg object-cover border border-border/50" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full" onClick={() => setPhotoUrl(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/40 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground mt-1">Subir</span>
                    </>
                  )}
                </div>
              )}
              {photoUrl && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
                  Cambiar
                </Button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre del producto"
              className="mt-1.5"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción del producto o servicio..."
              className="mt-1.5 min-h-[70px] text-sm"
            />
          </div>
          <Separator />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Precio base</Label>
              <Input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Costo</Label>
              <Input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="0" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRC">₡ CRC</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {price && cost && parseFloat(cost) > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
              Margen: <span className="font-semibold text-foreground">
                {Math.round(((parseFloat(price) - parseFloat(cost)) / parseFloat(price)) * 100)}%
              </span>
              {' '}· Ganancia: <span className="font-semibold text-foreground">
                {formatCurrency(parseFloat(price) - parseFloat(cost), currency)}
              </span>
            </div>
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending || uploading} size="sm">
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
