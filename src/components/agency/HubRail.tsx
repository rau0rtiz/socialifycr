import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Clapperboard,
  Loader2,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyPayments, fmtMoney } from '@/hooks/use-agency-payments';
import { useBrand } from '@/contexts/BrandContext';

const RailCard = ({
  title,
  to,
  icon: Icon,
  children,
}: {
  title: string;
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <section className="agency-card p-4">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
      </div>
      <Link
        to={to}
        className="text-muted-foreground transition-colors hover:text-primary"
        aria-label={`Ir a ${title}`}
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
    <div className="mt-3 space-y-2">{children}</div>
  </section>
);

const Empty = ({ label }: { label: string }) => (
  <p className="py-3 text-center text-xs text-muted-foreground/70">{label}</p>
);

/** Pagos por cobrar del mes + atrasados. */
const PaymentsBlock = () => {
  const monthDate = useMemo(() => new Date(), []);
  const { monthRows, overdue, isLoading } = useAgencyPayments(monthDate);

  const pending = useMemo(
    () =>
      monthRows
        .filter((r) => r.bills && r.totalDue - r.totalPaid > 0)
        .slice(0, 4),
    [monthRows],
  );

  return (
    <RailCard title="Pagos por cobrar" to="/agencia/pagos" icon={Wallet}>
      {isLoading ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold">{overdue.length} atrasados</span>
            </div>
          )}
          {pending.length === 0 ? (
            <Empty label="Nada pendiente este mes" />
          ) : (
            pending.map((r) => (
              <div
                key={r.client.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-2.5 py-2"
              >
                <span className="min-w-0 truncate text-xs text-foreground">{r.client.name}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                  {fmtMoney(r.totalDue - r.totalPaid, r.client.currency || 'USD')}
                </span>
              </div>
            ))
          )}
        </>
      )}
    </RailCard>
  );
};

/** Próximas grabaciones. */
const ProductionsBlock = () => {
  const { clients } = useBrand();
  const nameOf = (id: string | null) => clients.find((c) => c.id === id)?.name || 'Sin cliente';

  const { data, isLoading } = useQuery({
    queryKey: ['agency-hub-upcoming-sheets'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('production_sheets')
        .select('id, title, shoot_date, status, client_id')
        .gte('shoot_date', today)
        .order('shoot_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <RailCard title="Producciones próximas" to="/agencia/producciones" icon={Clapperboard}>
      {isLoading ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (data || []).length === 0 ? (
        <Empty label="Sin grabaciones agendadas" />
      ) : (
        (data || []).map((s: any) => (
          <div key={s.id} className="rounded-lg bg-background/40 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium text-foreground">
                {s.title}
              </span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                {s.shoot_date
                  ? new Date(`${s.shoot_date}T12:00:00`).toLocaleDateString('es-CR', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : '—'}
              </span>
            </div>
            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
              {nameOf(s.client_id)}
            </p>
          </div>
        ))
      )}
    </RailCard>
  );
};

/** Leads recientes del CRM. */
const RecentLeadsBlock = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['agency-hub-recent-leads'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_crm_leads')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <RailCard title="Leads recientes" to="/agencia/crm" icon={UserPlus}>
      {isLoading ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (data || []).length === 0 ? (
        <Empty label="Sin leads nuevos" />
      ) : (
        (data || []).map((l: any) => (
          <div
            key={l.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-2.5 py-2"
          >
            <span className="min-w-0 truncate text-xs text-foreground">{l.name}</span>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {String(l.status || '').replace(/_/g, ' ')}
            </span>
          </div>
        ))
      )}
    </RailCard>
  );
};

export const HubRail = () => (
  <div className="space-y-4">
    <PaymentsBlock />
    <ProductionsBlock />
    <RecentLeadsBlock />
  </div>
);
