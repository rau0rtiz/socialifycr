import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useClientProducts, ClientProduct, ProductInput } from '@/hooks/use-client-products';
import { supabase } from '@/integrations/supabase/client';
import { Package, Plus, Pencil, Trash2, DollarSign, TrendingUp, Camera, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductsManagerProps {
  clientId: string;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

export const ProductsManager = ({ clientId }: ProductsManagerProps) => {
  const { products, isLoading, addProduct, updateProduct, deleteProduct } = useClientProducts(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditing(null);
    setName('');
    setPrice('');
    setCost('');
    setCurrency('CRC');
    setDescription('');
    setPhotoUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (p: ClientProduct) => {
    setEditing(p);
    setName(p.name);
    setPrice(p.price != null ? String(p.price) : '');
    setCost(p.cost != null ? String(p.cost) : '');
    setCurrency(p.currency);
    setDescription(p.description || '');
    setPhotoUrl(p.photo_url || null);
    setDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${clientId}/products/product-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(path);

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
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
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
      } else {
        await addProduct.mutateAsync(input);
        toast.success('Producto creado');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Error al guardar producto');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Producto eliminado');
      setDeleteConfirm(null);
    } catch {
      toast.error('Error al eliminar producto');
    }
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2.5 text-foreground">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              Productos
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openNew} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Package className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin productos</p>
              <p className="text-xs text-muted-foreground mt-1">Agrega productos para vincularlos con el pipeline.</p>
              <Button size="sm" variant="outline" onClick={openNew} className="mt-3 h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Crear primer producto
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(p => {
                const margin = (p.price != null && p.cost != null && p.cost > 0)
                  ? Math.round(((p.price - p.cost) / p.price) * 100)
                  : null;

                return (
                  <div
                    key={p.id}
                    className="group p-3.5 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Photo thumbnail */}
                      {p.photo_url && (
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          className="w-12 h-12 rounded-lg object-cover border border-border/50 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground truncate">{p.name}</h4>
                          {margin !== null && (
                            <span className={cn(
                              'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                              margin >= 50 ? 'bg-emerald-500/10 text-emerald-600' :
                              margin >= 20 ? 'bg-amber-500/10 text-amber-600' :
                              'bg-red-500/10 text-red-600'
                            )}>
                              {margin}% margen
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          {p.price != null && (
                            <div className="flex items-center gap-1 text-xs">
                              <DollarSign className="h-3 w-3 text-emerald-500" />
                              <span className="font-medium text-foreground">{formatCurrency(p.price, p.currency)}</span>
                              <span className="text-muted-foreground">precio</span>
                            </div>
                          )}
                          {p.cost != null && (
                            <div className="flex items-center gap-1 text-xs">
                              <TrendingUp className="h-3 w-3 text-blue-500" />
                              <span className="font-medium text-foreground">{formatCurrency(p.cost, p.currency)}</span>
                              <span className="text-muted-foreground">costo</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    <img
                      src={photoUrl}
                      alt="Producto"
                      className="w-20 h-20 rounded-lg object-cover border border-border/50"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                      onClick={() => setPhotoUrl(null)}
                    >
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
                    Cambiar
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del producto"
                className="mt-1.5"
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
                <Label className="text-xs">Precio final</Label>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Costo</Label>
                <Input
                  type="number"
                  min={0}
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0"
                  className="mt-1.5"
                />
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={addProduct.isPending || updateProduct.isPending || uploading} size="sm">
              {(addProduct.isPending || updateProduct.isPending) ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar producto?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} size="sm">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} size="sm" disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
