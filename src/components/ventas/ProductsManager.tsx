import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useClientProducts, ClientProduct, useStockMovements } from '@/hooks/use-client-products';
import { usePaymentSchemes, PaymentSchemeInput, useClientPaymentSchemes } from '@/hooks/use-payment-schemes';
import {
  Package, Plus, Pencil, Trash2, DollarSign, TrendingUp, CreditCard,
  GraduationCap, Users, BookOpen, MoreHorizontal, Boxes, AlertTriangle,
  ArrowUp, ArrowDown, Edit3, Wrench, Clock, Search, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBrand } from '@/contexts/BrandContext';
import { ProductFormDialog } from './ProductFormDialog';
import { TissueProductDialog } from '@/components/inventory/TissueProductDialog';

interface ProductsManagerProps {
  clientId: string;
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'CRC') return `₡${amount.toLocaleString('es-CR')}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

// ====== Variants section ======
const VariantsSection = ({ productId, clientId, productCurrency }: { productId: string; clientId: string; productCurrency: string }) => {
  const { schemes, addScheme, updateScheme, deleteScheme } = usePaymentSchemes(productId, clientId);
  const [editing, setEditing] = useState<string | null>(null);
  const [sName, setSName] = useState('');
  const [sTotal, setSTotal] = useState('');
  const [sInstallments, setSInstallments] = useState('1');
  const [sCurrency, setSCurrency] = useState(productCurrency);
  const [adding, setAdding] = useState(false);

  const installmentAmount = sTotal && sInstallments && parseInt(sInstallments) > 0
    ? parseFloat(sTotal) / parseInt(sInstallments)
    : 0;

  const resetForm = () => {
    setSName(''); setSTotal(''); setSInstallments('1'); setSCurrency(productCurrency); setEditing(null); setAdding(false);
  };

  const openEdit = (s: any) => {
    setEditing(s.id); setSName(s.name); setSTotal(String(s.total_price));
    setSInstallments(String(s.num_installments)); setSCurrency(s.currency); setAdding(true);
  };

  const handleSave = async () => {
    if (!sName.trim() || !sTotal) { toast.error('Nombre y precio total son obligatorios'); return; }
    const input: PaymentSchemeInput = {
      name: sName.trim(),
      total_price: parseFloat(sTotal),
      num_installments: parseInt(sInstallments) || 1,
      installment_amount: Math.round(installmentAmount * 100) / 100,
      currency: sCurrency,
      sort_order: schemes.length,
    };
    try {
      if (editing) {
        await updateScheme.mutateAsync({ id: editing, ...input });
        toast.success('Variante actualizada');
      } else {
        await addScheme.mutateAsync(input);
        toast.success('Variante creada');
      }
      resetForm();
    } catch { toast.error('Error al guardar variante'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteScheme.mutateAsync(id); toast.success('Variante eliminada'); }
    catch { toast.error('Error al eliminar variante'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-primary" />
          Variantes
        </Label>
        {!adding && (
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Agregar variante
          </Button>
        )}
      </div>

      {schemes.length > 0 && (
        <div className="space-y-1.5">
          {schemes.map(s => (
            <div key={s.id} className="group flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-muted-foreground ml-1.5">{formatCurrency(s.total_price, s.currency)}</span>
                {s.num_installments > 1 && (
                  <span className="text-muted-foreground ml-1.5">· {s.num_installments} cuotas de {formatCurrency(s.installment_amount, s.currency)}</span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => openEdit(s)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-lg border border-border/50 p-2.5 space-y-2 bg-muted/20">
          <Input value={sName} onChange={e => setSName(e.target.value)} placeholder="Nombre (ej: Plan completo)" className="h-8 text-xs" />
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" value={sTotal} onChange={e => setSTotal(e.target.value)} placeholder="Precio total" className="h-8 text-xs" />
            <Input type="number" min={1} value={sInstallments} onChange={e => setSInstallments(e.target.value)} placeholder="Cuotas" className="h-8 text-xs" />
            <Select value={sCurrency} onValueChange={setSCurrency}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CRC">₡ CRC</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {parseInt(sInstallments) > 1 && installmentAmount > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Cuota: <span className="font-semibold text-foreground">{formatCurrency(Math.round(installmentAmount * 100) / 100, sCurrency)}</span> × {sInstallments}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={resetForm}>Cancelar</Button>
            <Button size="sm" className="h-7 text-[10px]" onClick={handleSave} disabled={addScheme.isPending || updateScheme.isPending}>
              {editing ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </div>
      )}

      {schemes.length === 0 && !adding && (
        <div className="text-center py-4 rounded-lg border border-dashed border-border/50">
          <CreditCard className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground">Sin variantes</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">Agrega variantes con diferentes precios y opciones de cuotas</p>
        </div>
      )}
    </div>
  );
};

const SPEAK_UP_CATEGORIES: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'individual', label: 'Clases Personalizadas', icon: GraduationCap },
  { key: 'group', label: 'Clases Grupales', icon: Users },
  { key: 'toeic', label: 'TOEIC', icon: BookOpen },
  { key: 'exam', label: 'Exámenes', icon: BookOpen },
  { key: 'trial', label: 'Otros', icon: MoreHorizontal },
];

// ====== Product Card ======
const ProductCard = ({ p, allSchemes, onClick }: { p: ClientProduct; allSchemes: any[]; onClick: () => void }) => {
  const { selectedClient } = useBrand();
  const isSpeakUpCard = !!selectedClient?.name?.toLowerCase().includes('speak up');
  const productSchemes = allSchemes.filter((s: any) => s.product_id === p.id);
  const variantCount = productSchemes.length;
  const minPrice = variantCount > 0 ? Math.min(...productSchemes.map((s: any) => s.total_price)) : p.price;
  const minCurrency = variantCount > 0
    ? productSchemes.reduce((prev: any, curr: any) => curr.total_price < prev.total_price ? curr : prev).currency
    : p.currency;

  const isService = p.product_type === 'service';
  const profit = p.price != null && p.cost != null ? p.price - p.cost : null;
  const margin = profit != null && p.price && p.price > 0 ? Math.round((profit / p.price) * 100) : null;

  const stockOut = p.track_stock && p.stock_quantity <= 0;
  const stockLow = p.track_stock && !stockOut && p.low_stock_threshold > 0 && p.stock_quantity <= p.low_stock_threshold;

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card hover:shadow-sm transition-all cursor-pointer p-3.5 overflow-hidden',
        isService ? 'border-purple-500/20 hover:border-purple-500/40' : 'border-blue-500/20 hover:border-blue-500/40',
        stockOut && 'border-red-500/40 hover:border-red-500/60',
      )}
      onClick={onClick}
    >
      {/* Type accent bar */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1',
        isService ? 'bg-purple-500' : 'bg-blue-500',
        stockOut && 'bg-red-500',
      )} />

      <div className="flex items-start gap-3 pl-1.5">
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.name} className="w-14 h-14 rounded-lg object-cover border border-border/50 shrink-0" />
        ) : (
          <div className={cn(
            'w-14 h-14 rounded-lg border flex items-center justify-center shrink-0',
            isService ? 'bg-purple-500/5 border-purple-500/20' : 'bg-blue-500/5 border-blue-500/20',
          )}>
            {isService
              ? <Wrench className="h-5 w-5 text-purple-500/60" />
              : <Package className="h-5 w-5 text-blue-500/60" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-foreground truncate">{p.name}</h4>
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] py-0 px-1.5 h-4 font-medium uppercase tracking-wider',
                isService
                  ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                  : 'bg-blue-500/10 text-blue-600 border-blue-500/30',
              )}
            >
              {isService ? <><Wrench className="h-2 w-2 mr-0.5" /> Servicio</> : <><Package className="h-2 w-2 mr-0.5" /> Producto</>}
            </Badge>
            {variantCount > 0 && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {variantCount} variante{variantCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {p.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {minPrice != null && (
              <span className="text-xs font-semibold text-foreground">
                {variantCount > 0 ? 'Desde ' : ''}{formatCurrency(minPrice, minCurrency)}
              </span>
            )}
            {profit != null && p.price != null && p.cost != null && p.cost > 0 && variantCount === 0 && (
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                margin != null && margin >= 50 ? 'bg-emerald-500/10 text-emerald-600' :
                margin != null && margin >= 20 ? 'bg-amber-500/10 text-amber-600' :
                'bg-red-500/10 text-red-600',
              )}>
                +{formatCurrency(profit, p.currency)} ({margin}%)
              </span>
            )}
            {p.estimated_duration_min != null && (
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {p.estimated_duration_min} min
              </span>
            )}
            {/* Stock indicator */}
            {isService ? (
              <span className="text-[10px] text-muted-foreground/60 italic">Sin inventario</span>
            ) : p.track_stock ? (
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1',
                stockOut ? 'bg-red-500/15 text-red-600 ring-1 ring-red-500/30' :
                stockLow ? 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30' :
                'bg-emerald-500/10 text-emerald-600',
              )}>
                {(stockOut || stockLow) && <AlertTriangle className="h-2.5 w-2.5" />}
                <Boxes className="h-2.5 w-2.5" />
                {stockOut ? 'Sin stock' : `${p.stock_quantity}${p.stock_unit ? ` ${p.stock_unit}` : ''}`}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/60">Inventario desactivado</span>
            )}
          </div>
        </div>
        <div className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0">
          <Pencil className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};

// ====== Stock section in detail ======
const StockSection = ({ product, clientId }: { product: ClientProduct; clientId: string }) => {
  const { applyStockMovement } = useClientProducts(clientId);
  const { data: movements = [] } = useStockMovements(product.id);
  const [type, setType] = useState<'in' | 'out' | 'adjust'>('in');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  if (product.product_type === 'service') {
    return (
      <div className="rounded-lg border border-dashed border-purple-500/30 bg-purple-500/5 p-4 text-center">
        <Wrench className="h-5 w-5 text-purple-500/70 mx-auto mb-1.5" />
        <p className="text-xs font-medium text-foreground">No aplica</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Los servicios no llevan inventario.</p>
      </div>
    );
  }

  if (!product.track_stock) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center">
        <Boxes className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
        <p className="text-xs text-muted-foreground">Inventario desactivado para este producto.</p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          Editá el producto y activá "Llevar control de inventario" para empezar a registrar entradas y salidas.
        </p>
      </div>
    );
  }

  const submit = async () => {
    const n = parseFloat(qty);
    if (!qty || isNaN(n) || n < 0) { toast.error('Ingresá una cantidad válida'); return; }
    try {
      await applyStockMovement.mutateAsync({ productId: product.id, type, quantity: n, reason });
      toast.success(type === 'in' ? 'Entrada registrada' : type === 'out' ? 'Salida registrada' : 'Stock ajustado');
      setQty(''); setReason('');
    } catch (e: any) { toast.error(e.message || 'Error al registrar movimiento'); }
  };

  const isLow = product.low_stock_threshold > 0 && product.stock_quantity <= product.low_stock_threshold;
  const isOut = product.stock_quantity <= 0;
  const unit = product.stock_unit || 'unidades';

  return (
    <div className="space-y-4">
      <div className={cn(
        'rounded-xl border p-3 flex items-center justify-between',
        isOut ? 'bg-red-500/5 border-red-500/30' : isLow ? 'bg-amber-500/5 border-amber-500/30' : 'bg-emerald-500/5 border-emerald-500/30',
      )}>
        <div className="flex items-center gap-2.5">
          <Boxes className={cn('h-5 w-5', isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-emerald-500')} />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stock actual</div>
            <div className="text-lg font-bold text-foreground leading-tight">
              {product.stock_quantity} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
            </div>
          </div>
        </div>
        {(isOut || isLow) && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-background/60">
            <AlertTriangle className={cn('h-3 w-3', isOut ? 'text-red-500' : 'text-amber-500')} />
            {isOut ? 'Sin stock' : `Bajo (mín ${product.low_stock_threshold})`}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/50 p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant={type === 'in' ? 'default' : 'outline'} onClick={() => setType('in')} className="h-8 text-xs gap-1 flex-1">
            <ArrowUp className="h-3 w-3" /> Entrada
          </Button>
          <Button type="button" size="sm" variant={type === 'out' ? 'default' : 'outline'} onClick={() => setType('out')} className="h-8 text-xs gap-1 flex-1">
            <ArrowDown className="h-3 w-3" /> Salida
          </Button>
          <Button type="button" size="sm" variant={type === 'adjust' ? 'default' : 'outline'} onClick={() => setType('adjust')} className="h-8 text-xs gap-1 flex-1">
            <Edit3 className="h-3 w-3" /> Ajuste
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">{type === 'adjust' ? `Stock final (${unit})` : `Cantidad (${unit})`}</Label>
            <Input type="number" min={0} step="any" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Motivo (opcional)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Compra, merma, etc." className="mt-1 h-9 text-sm" />
          </div>
        </div>
        <Button size="sm" className="w-full h-8 text-xs" onClick={submit} disabled={applyStockMovement.isPending}>
          {applyStockMovement.isPending ? 'Registrando...' : 'Registrar movimiento'}
        </Button>
      </div>

      {movements.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Últimos movimientos</div>
          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {movements.map(m => {
              const Icon = m.movement_type === 'in' ? ArrowUp : m.movement_type === 'out' || m.movement_type === 'sale' ? ArrowDown : Edit3;
              const color = m.movement_type === 'in' ? 'text-emerald-500' : m.movement_type === 'out' || m.movement_type === 'sale' ? 'text-red-500' : 'text-blue-500';
              const label = m.movement_type === 'in' ? 'Entrada' : m.movement_type === 'out' ? 'Salida' : m.movement_type === 'sale' ? 'Venta' : 'Ajuste';
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/30 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={cn('h-3 w-3 shrink-0', color)} />
                    <span className="font-medium text-foreground">{label}</span>
                    <span className={cn('font-semibold', color)}>
                      {m.movement_type === 'in' ? '+' : m.movement_type === 'adjust' ? '' : '-'}{Math.abs(m.quantity)}
                    </span>
                    {m.reason && <span className="text-muted-foreground truncate">· {m.reason}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">→ {m.resulting_stock}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ====== Product List (with Speak Up grouping) ======
const ProductList = ({ products, allSchemes, onSelect }: { products: ClientProduct[]; allSchemes: any[]; onSelect: (p: ClientProduct) => void }) => {
  const { selectedClient } = useBrand();
  const isSpeakUp = selectedClient?.name?.toLowerCase().includes('speak up');

  if (!isSpeakUp) {
    return (
      <div className="space-y-2">
        {products.map(p => (
          <ProductCard key={p.id} p={p} allSchemes={allSchemes} onClick={() => onSelect(p)} />
        ))}
      </div>
    );
  }

  const grouped = SPEAK_UP_CATEGORIES.map(cat => {
    const catProducts = products.filter(p => {
      if (cat.key === 'trial') return !['individual', 'group', 'toeic', 'exam'].includes(p.category || '');
      return p.category === cat.key;
    });
    return { ...cat, products: catProducts };
  }).filter(g => g.products.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map(group => {
        const Icon = group.icon;
        return (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-auto">{group.products.length}</Badge>
            </div>
            <div className="space-y-2">
              {group.products.map(p => (
                <ProductCard key={p.id} p={p} allSchemes={allSchemes} onClick={() => onSelect(p)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ====== Main component ======
type TypeFilter = 'all' | 'product' | 'service';
type StockFilter = 'all' | 'low' | 'out' | 'ok';
type SortKey = 'name' | 'price' | 'stock' | 'margin';

export const ProductsManager = ({ clientId }: ProductsManagerProps) => {
  const { products, isLoading, deleteProduct } = useClientProducts(clientId);
  const { data: allSchemes } = useClientPaymentSchemes(clientId);
  const { selectedClient } = useBrand();
  const isTissue = !!selectedClient?.name?.toLowerCase().includes('tissue');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<ClientProduct | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q),
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter(p => (p.product_type || 'product') === typeFilter);
    }
    if (stockFilter !== 'all') {
      list = list.filter(p => {
        if (p.product_type === 'service' || !p.track_stock) return false;
        const out = p.stock_quantity <= 0;
        const low = !out && p.low_stock_threshold > 0 && p.stock_quantity <= p.low_stock_threshold;
        if (stockFilter === 'out') return out;
        if (stockFilter === 'low') return low;
        if (stockFilter === 'ok') return !out && !low;
        return true;
      });
    }
    list.sort((a, b) => {
      if (sortKey === 'price') return (b.price ?? 0) - (a.price ?? 0);
      if (sortKey === 'stock') return (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0);
      if (sortKey === 'margin') {
        const ma = a.price && a.cost ? (a.price - a.cost) / a.price : 0;
        const mb = b.price && b.cost ? (b.price - b.cost) / b.price : 0;
        return mb - ma;
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [products, search, typeFilter, stockFilter, sortKey]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: ClientProduct) => { setEditing(p); setDialogOpen(true); setDetailProduct(null); };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Eliminado');
      setDeleteConfirm(null);
      setDetailProduct(null);
    } catch { toast.error('Error al eliminar'); }
  };

  const productCount = products.filter(p => (p.product_type || 'product') === 'product').length;
  const serviceCount = products.filter(p => p.product_type === 'service').length;
  const hasFilters = search || typeFilter !== 'all' || stockFilter !== 'all';

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2.5 text-foreground">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              Productos y Servicios
              {products.length > 0 && (
                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                  · {productCount} prod · {serviceCount} serv
                </span>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openNew} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search & filters */}
          {products.length > 0 && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o descripción..."
                  className="h-8 text-xs pl-8 pr-8"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                  <SelectTrigger className="h-7 text-[11px] w-auto gap-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos los tipos</SelectItem>
                    <SelectItem value="product" className="text-xs">Solo productos</SelectItem>
                    <SelectItem value="service" className="text-xs">Solo servicios</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                  <SelectTrigger className="h-7 text-[11px] w-auto gap-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todo el stock</SelectItem>
                    <SelectItem value="ok" className="text-xs">Stock OK</SelectItem>
                    <SelectItem value="low" className="text-xs">Stock bajo</SelectItem>
                    <SelectItem value="out" className="text-xs">Sin stock</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="h-7 text-[11px] w-auto gap-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name" className="text-xs">Orden: Nombre</SelectItem>
                    <SelectItem value="price" className="text-xs">Orden: Precio</SelectItem>
                    <SelectItem value="stock" className="text-xs">Orden: Stock</SelectItem>
                    <SelectItem value="margin" className="text-xs">Orden: Margen</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {filtered.length} de {products.length}
                </span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Package className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin productos ni servicios</p>
              <p className="text-xs text-muted-foreground mt-1">Agregá productos o servicios para vincularlos con ventas.</p>
              <Button size="sm" variant="outline" onClick={openNew} className="mt-3 h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Crear el primero
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Ningún resultado para los filtros aplicados.</p>
              {hasFilters && (
                <Button size="sm" variant="ghost" className="mt-2 h-7 text-[11px]" onClick={() => { setSearch(''); setTypeFilter('all'); setStockFilter('all'); }}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <ProductList
              products={filtered}
              allSchemes={allSchemes || []}
              onSelect={setDetailProduct}
            />
          )}
        </CardContent>
      </Card>

      {/* ========== PRODUCT DETAIL DIALOG ========== */}
      <Dialog open={!!detailProduct} onOpenChange={(open) => { if (!open) setDetailProduct(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden p-0">
          {detailProduct && (() => {
            const isService = detailProduct.product_type === 'service';
            return (
              <>
                <div className="px-6 pt-6 pb-4 space-y-4">
                  <DialogHeader className="space-y-0">
                    <DialogTitle className="sr-only">{detailProduct.name}</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-start gap-4">
                    {detailProduct.photo_url ? (
                      <img src={detailProduct.photo_url} alt={detailProduct.name} className="w-16 h-16 rounded-xl object-cover border border-border/50 shrink-0" />
                    ) : (
                      <div className={cn(
                        'w-16 h-16 rounded-xl border flex items-center justify-center shrink-0',
                        isService ? 'bg-purple-500/5 border-purple-500/20' : 'bg-blue-500/5 border-blue-500/20',
                      )}>
                        {isService
                          ? <Wrench className="h-6 w-6 text-purple-500/60" />
                          : <Package className="h-6 w-6 text-blue-500/60" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground">{detailProduct.name}</h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] py-0 px-1.5 h-4 font-medium uppercase tracking-wider',
                            isService
                              ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                              : 'bg-blue-500/10 text-blue-600 border-blue-500/30',
                          )}
                        >
                          {isService ? 'Servicio' : 'Producto'}
                        </Badge>
                      </div>
                      {detailProduct.description && (
                        <p className="text-xs text-muted-foreground mt-1">{detailProduct.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {detailProduct.price != null && (
                          <div className="flex items-center gap-1 text-xs">
                            <DollarSign className="h-3 w-3 text-emerald-500" />
                            <span className="font-semibold text-foreground">{formatCurrency(detailProduct.price, detailProduct.currency)}</span>
                            <span className="text-muted-foreground">precio</span>
                          </div>
                        )}
                        {detailProduct.cost != null && (
                          <div className="flex items-center gap-1 text-xs">
                            <TrendingUp className="h-3 w-3 text-blue-500" />
                            <span className="font-semibold text-foreground">{formatCurrency(detailProduct.cost, detailProduct.currency)}</span>
                            <span className="text-muted-foreground">costo</span>
                          </div>
                        )}
                        {detailProduct.estimated_duration_min != null && (
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{detailProduct.estimated_duration_min} min</span>
                          </div>
                        )}
                        {detailProduct.price != null && detailProduct.cost != null && detailProduct.cost > 0 && (
                          <span className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                            (() => {
                              const m = Math.round(((detailProduct.price! - detailProduct.cost!) / detailProduct.price!) * 100);
                              return m >= 50 ? 'bg-emerald-500/10 text-emerald-600' :
                                m >= 20 ? 'bg-amber-500/10 text-amber-600' :
                                'bg-red-500/10 text-red-600';
                            })(),
                          )}>
                            {Math.round(((detailProduct.price! - detailProduct.cost!) / detailProduct.price!) * 100)}% margen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => openEdit(detailProduct)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(detailProduct.id)}>
                      <Trash2 className="h-3 w-3" /> Eliminar
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="px-6 py-4 overflow-y-auto space-y-5" style={{ maxHeight: '50vh' }}>
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Boxes className="h-3 w-3" /> Inventario
                    </div>
                    <StockSection product={detailProduct} clientId={clientId} />
                  </div>
                  <Separator />
                  <VariantsSection
                    productId={detailProduct.id}
                    clientId={clientId}
                    productCurrency={detailProduct.currency}
                  />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog (uses reusable component with stock + type) */}
      {isTissue ? (
        <TissueProductDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clientId={clientId}
          editing={editing}
          onSaved={(saved) => { if (!editing) setDetailProduct(saved); }}
        />
      ) : (
        <ProductFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clientId={clientId}
          editing={editing}
          onSaved={(saved) => { if (!editing) setDetailProduct(saved); }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar?</DialogTitle>
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
