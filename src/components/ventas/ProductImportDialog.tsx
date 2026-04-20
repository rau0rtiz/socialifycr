import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useClientProducts, ProductInput, ProductType } from '@/hooks/use-client-products';
import { Upload, FileText, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
}

type Mode = 'create-only' | 'update-existing' | 'replace-all';

interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  data: ProductInput | null;
  error: string | null;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

const TEMPLATE_HEADERS = [
  'nombre',
  'tipo', // producto | servicio
  'precio',
  'costo',
  'moneda', // CRC | USD
  'descripcion',
  'categoria',
  'duracion_min',
  'stock_actual',
  'unidad',
  'alerta_minima',
];

const TEMPLATE_CONTENT =
  TEMPLATE_HEADERS.join(',') +
  '\n' +
  '"Toxina botulínica 100u","producto","85000","45000","CRC","Aplicación facial","Inyectables","30","5","vial","2"\n' +
  '"Limpieza facial","servicio","25000","","CRC","Limpieza profunda con extracción","Tratamientos faciales","60","","",""\n';

const downloadTemplate = () => {
  const blob = new Blob([TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-productos.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const parseRow = (raw: Record<string, string>, rowNumber: number): ParsedRow => {
  const get = (k: string) => (raw[k] ?? '').toString().trim();
  const name = get('nombre');
  if (!name) return { rowNumber, raw, data: null, error: 'Nombre requerido' };

  const typeRaw = get('tipo').toLowerCase();
  let product_type: ProductType = 'product';
  if (typeRaw === 'servicio' || typeRaw === 'service') product_type = 'service';
  else if (typeRaw && typeRaw !== 'producto' && typeRaw !== 'product') {
    return { rowNumber, raw, data: null, error: `Tipo inválido "${typeRaw}" (use producto o servicio)` };
  }

  const priceStr = get('precio');
  const price = priceStr ? Number(priceStr.replace(/[^\d.-]/g, '')) : null;
  if (priceStr && (price == null || isNaN(price))) {
    return { rowNumber, raw, data: null, error: `Precio inválido "${priceStr}"` };
  }

  const costStr = get('costo');
  const cost = costStr ? Number(costStr.replace(/[^\d.-]/g, '')) : null;
  if (costStr && (cost == null || isNaN(cost))) {
    return { rowNumber, raw, data: null, error: `Costo inválido "${costStr}"` };
  }

  const currencyRaw = get('moneda').toUpperCase();
  const currency = currencyRaw === 'USD' ? 'USD' : 'CRC';

  const durStr = get('duracion_min');
  const duration = durStr ? parseInt(durStr) : null;

  const stockStr = get('stock_actual');
  const stock = stockStr ? Number(stockStr) : 0;
  const trackStock = product_type === 'product' && stockStr !== '' && !isNaN(stock);

  const lowStr = get('alerta_minima');
  const lowThreshold = lowStr ? Number(lowStr) : 0;

  return {
    rowNumber,
    raw,
    error: null,
    data: {
      name,
      product_type,
      price,
      cost,
      currency,
      description: get('descripcion'),
      category: get('categoria') || null,
      estimated_duration_min: duration && !isNaN(duration) ? duration : null,
      track_stock: trackStock,
      stock_quantity: trackStock ? stock : 0,
      low_stock_threshold: trackStock ? lowThreshold : 0,
      stock_unit: get('unidad') || null,
    },
  };
};

export const ProductImportDialog = ({ open, onOpenChange, clientId }: Props) => {
  const { products, addProduct, updateProduct, deleteProduct } = useClientProducts(clientId);
  const [mode, setMode] = useState<Mode>('create-only');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]); setFileName(null); setResult(null); setMode('create-only'); setConfirmReplace(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const parsed = res.data.map((raw, i) => parseRow(raw, i + 2)); // +2 = header is row 1
        setRows(parsed);
        const errors = parsed.filter(r => r.error).length;
        if (errors > 0) toast.warning(`${errors} fila(s) con errores`);
      },
      error: () => toast.error('Error al leer el CSV'),
    });
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r.data);
    if (valid.length === 0) { toast.error('No hay filas válidas'); return; }
    if (mode === 'replace-all' && !confirmReplace) {
      toast.error('Confirmá el reemplazo total marcando la casilla');
      return;
    }

    setImporting(true);
    const res: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

    try {
      // Replace mode: delete all first
      if (mode === 'replace-all') {
        for (const p of products) {
          try {
            await deleteProduct.mutateAsync(p.id);
          } catch (e: any) {
            res.errors.push({ row: 0, message: `No se pudo eliminar "${p.name}": ${e.message}` });
          }
        }
      }

      const existingByName = new Map(products.map(p => [p.name.toLowerCase(), p]));

      for (const r of valid) {
        const input = r.data!;
        try {
          const existing = mode !== 'replace-all' ? existingByName.get(input.name.toLowerCase()) : undefined;
          if (existing) {
            if (mode === 'create-only') { res.skipped++; continue; }
            // update-existing
            await updateProduct.mutateAsync({ id: existing.id, ...input });
            res.updated++;
          } else {
            await addProduct.mutateAsync(input);
            res.created++;
          }
        } catch (e: any) {
          res.errors.push({ row: r.rowNumber, message: e.message || 'Error desconocido' });
        }
      }

      // Add the row-level parse errors to the report too
      rows.filter(r => r.error).forEach(r => {
        res.errors.push({ row: r.rowNumber, message: r.error! });
      });

      setResult(res);
      toast.success(`Import completo: ${res.created} creados, ${res.updated} actualizados`);
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.filter(r => r.data).length;
  const errorCount = rows.filter(r => r.error).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importar productos desde CSV
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/30 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">Importación completa</p>
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <span><b>{result.created}</b> creados</span>
                <span><b>{result.updated}</b> actualizados</span>
                <span><b>{result.skipped}</b> omitidos</span>
                <span className={result.errors.length > 0 ? 'text-red-600' : ''}>
                  <b>{result.errors.length}</b> errores
                </span>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 max-h-[200px] overflow-y-auto">
                <p className="text-xs font-semibold text-red-600 mb-1.5">Errores:</p>
                <ul className="space-y-1 text-xs">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="text-red-600 font-mono">Fila {e.row}:</span> {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Importar otro</Button>
              <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Template download */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">¿Primera vez?</p>
                <p className="text-[11px] text-muted-foreground">Descargá la plantilla con los headers correctos.</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 h-8 text-xs">
                <Download className="h-3.5 w-3.5" /> Plantilla
              </Button>
            </div>

            {/* Upload */}
            <div>
              <Label className="text-xs">Archivo CSV</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'mt-1.5 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
                  fileName ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/20 hover:border-muted-foreground/40 bg-muted/20'
                )}
              >
                <FileText className={cn('h-6 w-6 mx-auto mb-1.5', fileName ? 'text-primary' : 'text-muted-foreground/50')} />
                {fileName ? (
                  <>
                    <p className="text-xs font-medium">{fileName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {validCount} válidas · {errorCount} con error
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Click para seleccionar un archivo .csv</p>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div>
                <Label className="text-xs">Vista previa (primeras 10 filas)</Label>
                <div className="mt-1.5 rounded-lg border border-border/50 max-h-[240px] overflow-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium">#</th>
                        <th className="text-left px-2 py-1.5 font-medium">Nombre</th>
                        <th className="text-left px-2 py-1.5 font-medium">Tipo</th>
                        <th className="text-left px-2 py-1.5 font-medium">Precio</th>
                        <th className="text-left px-2 py-1.5 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map(r => (
                        <tr key={r.rowNumber} className="border-t border-border/30">
                          <td className="px-2 py-1 text-muted-foreground">{r.rowNumber}</td>
                          <td className="px-2 py-1">{r.raw.nombre || '—'}</td>
                          <td className="px-2 py-1">{r.data?.product_type === 'service' ? 'Servicio' : 'Producto'}</td>
                          <td className="px-2 py-1">{r.data?.price ?? '—'}</td>
                          <td className="px-2 py-1">
                            {r.error ? (
                              <span className="text-red-600 inline-flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {r.error}
                              </span>
                            ) : (
                              <span className="text-emerald-600 inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 10 && (
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">+{rows.length - 10} filas más</p>
                )}
              </div>
            )}

            {/* Mode selector */}
            {rows.length > 0 && (
              <div>
                <Label className="text-xs">Comportamiento</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-1.5 space-y-1.5">
                  <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-border/50 p-2.5 hover:bg-muted/30">
                    <RadioGroupItem value="create-only" id="m1" className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">Solo crear nuevos</p>
                      <p className="text-[10px] text-muted-foreground">Si el nombre ya existe, omitir.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-border/50 p-2.5 hover:bg-muted/30">
                    <RadioGroupItem value="update-existing" id="m2" className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">Crear y actualizar por nombre</p>
                      <p className="text-[10px] text-muted-foreground">Si existe, sobreescribe sus datos.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 hover:bg-red-500/10">
                    <RadioGroupItem value="replace-all" id="m3" className="mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-red-600">Reemplazar todo</p>
                      <p className="text-[10px] text-muted-foreground">⚠️ Borra TODOS los productos actuales antes de importar.</p>
                    </div>
                  </label>
                </RadioGroup>
                {mode === 'replace-all' && (
                  <label className="mt-2 flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmReplace}
                      onChange={e => setConfirmReplace(e.target.checked)}
                      className="rounded"
                    />
                    Entiendo que esto eliminará los {products.length} productos actuales.
                  </label>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || importing || (mode === 'replace-all' && !confirmReplace)}
              >
                {importing ? 'Importando...' : `Importar ${validCount} producto${validCount !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
