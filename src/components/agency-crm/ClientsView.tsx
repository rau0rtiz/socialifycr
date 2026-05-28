import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Users,
  Search,
  Loader2,
  Package,
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  Circle,
  DollarSign,
  Plus,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  computeContractRateNow,
  computeServiceMonth,
  DEFAULT_SELLER,
  LEAD_SOURCES,
  SellerCollection,
  SellerContract,
  useSellerCollections,
  useSellerContracts,
} from '@/hooks/use-seller-commissions';
import { NewSaleWizard } from './NewSaleWizard';
import { MarkPaidDialog } from './MarkPaidDialog';

const fmtMoney = (amount: number, currency: string) =>
  `${currency === 'CRC' ? '₡' : '$'}${Math.round(amount).toLocaleString('en-US')}`;

interface ClientGroup {
  key: string; // lowercased customer_name
  name: string;
  contracts: SellerContract[];
  collections: SellerCollection[];
  totalPaid: number;
  totalPending: number;
  totalCommission: number;
  activeContracts: number;
  currency: string;
  lastPaidAt: string | null;
  primarySource: string | null;
}

export const ClientsView = () => {
  const seller = DEFAULT_SELLER;
  const { data: contracts = [], isLoading: lC } = useSellerContracts(seller);
  const { data: collections = [], isLoading: lCo } = useSellerCollections(seller);

  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [wizardDefaults, setWizardDefaults] = useState<{ customer_name: string } | null>(null);
  const [markPaid, setMarkPaid] = useState<{ col: SellerCollection; contract: SellerContract | null } | null>(null);

  const groups = useMemo<ClientGroup[]>(() => {
    const map = new Map<string, ClientGroup>();
    for (const c of contracts) {
      const name = (c.customer_name || 'Sin nombre').trim();
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          contracts: [],
          collections: [],
          totalPaid: 0,
          totalPending: 0,
          totalCommission: 0,
          activeContracts: 0,
          currency: c.currency || 'USD',
          lastPaidAt: null,
          primarySource: c.lead_source || null,
        });
      }
      const g = map.get(key)!;
      g.contracts.push(c);
      if (c.status === 'active') g.activeContracts += 1;
      if (!g.primarySource && c.lead_source) g.primarySource = c.lead_source;
    }
    for (const col of collections) {
      const key = (col.customer_name || '').trim().toLowerCase();
      const g = map.get(key);
      if (!g) continue;
      g.collections.push(col);
      if (col.status === 'paid') {
        g.totalPaid += Number(col.paid_amount || col.amount || 0);
        g.totalCommission += Number(col.commission_amount || 0);
        if (col.paid_at && (!g.lastPaidAt || col.paid_at > g.lastPaidAt)) {
          g.lastPaidAt = col.paid_at;
        }
      } else if (col.status === 'pending') {
        g.totalPending += Number(col.amount || 0);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [contracts, collections]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  const selected = selectedKey ? groups.find((g) => g.key === selectedKey) || null : null;

  const isLoading = lC || lCo;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Clientes
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Historial completo de compras y pagos por cliente. Las comisiones se generan al confirmar cada cobro.
          </p>
        </div>
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {groups.length === 0
              ? 'Aún no hay clientes. Registra la primera venta desde Comisiones.'
              : 'Sin resultados.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Cliente</th>
                  <th className="text-center px-4 py-2">Paquetes</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Origen</th>
                  <th className="text-right px-4 py-2">Total cobrado</th>
                  <th className="text-right px-4 py-2 hidden sm:table-cell">Pendiente</th>
                  <th className="text-right px-4 py-2">Comisión {seller}</th>
                  <th className="text-left px-4 py-2 hidden lg:table-cell">Último pago</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const src = g.primarySource ? LEAD_SOURCES.find((s) => s.value === g.primarySource) : null;
                  return (
                    <tr
                      key={g.key}
                      className="border-t border-border/50 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedKey(g.key)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {g.name}
                          {g.activeContracts > 0 && (
                            <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-400 bg-green-500/10">
                              Activo
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {g.contracts.length}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {src ? (
                          <Badge variant="outline" className={cn('text-[10px]', src.color)}>
                            {src.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {fmtMoney(g.totalPaid, g.currency)}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell text-xs text-muted-foreground">
                        {g.totalPending > 0 ? fmtMoney(g.totalPending, g.currency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-primary">
                        {fmtMoney(g.totalCommission, g.currency)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {g.lastPaidAt ? format(parseISO(g.lastPaidAt), "d MMM yyyy", { locale: es }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Drawer detalle cliente */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelectedKey(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> {selected.name}
                </SheetTitle>
                <SheetDescription>
                  {selected.contracts.length} paquete(s) · {selected.collections.length} cobro(s)
                </SheetDescription>
              </SheetHeader>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <MiniKpi
                  icon={<TrendingUp className="h-3 w-3" />}
                  label="Cobrado"
                  value={fmtMoney(selected.totalPaid, selected.currency)}
                />
                <MiniKpi
                  icon={<CalendarClock className="h-3 w-3" />}
                  label="Pendiente"
                  value={fmtMoney(selected.totalPending, selected.currency)}
                />
                <MiniKpi
                  icon={<DollarSign className="h-3 w-3" />}
                  label={`Comisión ${seller}`}
                  value={fmtMoney(selected.totalCommission, selected.currency)}
                  highlight
                />
              </div>

              {/* Acciones */}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => {
                    setWizardDefaults({ customer_name: selected.name });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Nueva compra
                </Button>
              </div>

              {/* Paquetes / contratos */}
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> Paquetes contratados
                </h3>
                {selected.contracts
                  .sort((a, b) => b.start_date.localeCompare(a.start_date))
                  .map((c) => {
                    const sm = computeServiceMonth(c.start_date);
                    const rate = computeContractRateNow(c);
                    const cols = selected.collections.filter((col) => col.contract_id === c.id);
                    const paidCols = cols.filter((col) => col.status === 'paid');
                    const pendingCols = cols.filter((col) => col.status === 'pending');
                    const src = c.lead_source ? LEAD_SOURCES.find((s) => s.value === c.lead_source) : null;
                    return (
                      <div
                        key={c.id}
                        className="rounded-lg border border-border bg-background/50 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <div className="font-semibold">
                              {fmtMoney(Number(c.monthly_amount), c.currency)}/mes
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Inicio {format(parseISO(c.start_date), "d MMM yyyy", { locale: es })}
                              {c.status !== 'active' && ` · ${c.status}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {src && (
                              <Badge variant="outline" className={cn('text-[10px]', src.color)}>
                                {src.label}
                              </Badge>
                            )}
                            {c.status === 'active' && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px]',
                                  sm <= (c.commission_initial_months ?? 3)
                                    ? 'border-green-500/40 text-green-400 bg-green-500/10'
                                    : 'border-blue-500/40 text-blue-400 bg-blue-500/10',
                                )}
                              >
                                Mes {sm} · {rate}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div className="rounded bg-muted/30 px-2 py-1">
                            <div className="text-muted-foreground">Cobros pagados</div>
                            <div className="font-semibold">{paidCols.length} / {cols.length}</div>
                          </div>
                          <div className="rounded bg-muted/30 px-2 py-1">
                            <div className="text-muted-foreground">Total pagado</div>
                            <div className="font-semibold">
                              {fmtMoney(paidCols.reduce((s, x) => s + Number(x.paid_amount || 0), 0), c.currency)}
                            </div>
                          </div>
                          <div className="rounded bg-muted/30 px-2 py-1">
                            <div className="text-muted-foreground">Comisión</div>
                            <div className="font-semibold text-primary">
                              {fmtMoney(paidCols.reduce((s, x) => s + Number(x.commission_amount || 0), 0), c.currency)}
                            </div>
                          </div>
                        </div>

                        {/* Lista de cuotas */}
                        {cols.length > 0 && (
                          <div className="border-t border-border/50 pt-2 space-y-1">
                            {cols
                              .sort((a, b) => a.due_date.localeCompare(b.due_date))
                              .map((col) => {
                                const isPaid = col.status === 'paid';
                                return (
                                  <div
                                    key={col.id}
                                    className="flex items-center justify-between gap-2 text-xs py-1"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isPaid ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                      ) : (
                                        <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                                      )}
                                      <span className="text-muted-foreground">
                                        {format(parseISO(col.due_date), "d MMM yyyy", { locale: es })}
                                      </span>
                                      {col.status === 'cancelled' && (
                                        <Badge variant="outline" className="text-[9px] border-muted-foreground/40">
                                          cancelado
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={cn(isPaid && 'font-medium')}>
                                        {fmtMoney(Number(col.paid_amount ?? col.amount), col.currency)}
                                      </span>
                                      {isPaid && col.commission_amount != null && (
                                        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5">
                                          +{fmtMoney(Number(col.commission_amount), col.currency)}
                                        </Badge>
                                      )}
                                      {!isPaid && col.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[10px] px-2"
                                          onClick={() => setMarkPaid({ col, contract: c })}
                                        >
                                          Cobrar
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            {pendingCols.length > 0 && (
                              <div className="text-[10px] text-muted-foreground pt-1">
                                Próximo: {format(parseISO(pendingCols[0].due_date), "d MMM", { locale: es })}
                              </div>
                            )}
                          </div>
                        )}

                        {c.notes && (
                          <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                            {c.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <NewSaleWizard
        open={!!wizardDefaults}
        onOpenChange={(v) => !v && setWizardDefaults(null)}
        defaults={wizardDefaults || undefined}
      />

      {markPaid && (
        <MarkPaidDialog
          open={!!markPaid}
          onOpenChange={(v) => !v && setMarkPaid(null)}
          collection={markPaid.col}
          contract={markPaid.contract}
        />
      )}
    </div>
  );
};

const MiniKpi = ({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div
    className={cn(
      'rounded-lg border p-2',
      highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-background/50',
    )}
  >
    <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
      {icon} {label}
    </div>
    <div className={cn('text-sm font-bold mt-0.5', highlight && 'text-primary')}>{value}</div>
  </div>
);
