import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  UserPlus,
  Clapperboard,
  FileText,
  Mail,
  ArrowUpRight,
  BarChart3,
  Loader2,
  CalendarClock,
} from 'lucide-react';

type KpiKey =
  | 'clients'
  | 'crmLeads'
  | 'productions'
  | 'documents'
  | 'communications'
  | 'leadsToday';

const KPI_META: Record<
  KpiKey,
  { label: string; icon: React.ElementType; href: string; hint: string }
> = {
  clients: {
    label: 'Clientes',
    icon: Users,
    href: '/agencia/clientes',
    hint: 'Cuentas activas',
  },
  crmLeads: {
    label: 'Leads',
    icon: UserPlus,
    href: '/agencia/crm',
    hint: 'Pipeline abierto',
  },
  productions: {
    label: 'Producciones',
    icon: Clapperboard,
    href: '/agencia/producciones',
    hint: 'Hojas en curso',
  },
  documents: {
    label: 'Documentos',
    icon: FileText,
    href: '/agencia/documentacion',
    hint: 'Propuestas · reportes',
  },
  leadsToday: {
    label: 'Leads hoy',
    icon: CalendarClock,
    href: '/agencia/funnels',
    hint: 'Ingresados hoy (CR)',
  },
  communications: {
    label: 'Contactos',
    icon: Mail,
    href: '/agencia/comunicaciones',
    hint: 'Leads en comms',
  },
};

const useAgencyKpis = () => {
  return useQuery({
    queryKey: ['agency-hub-kpis'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Inicio del día en Costa Rica (UTC-6)
      const now = new Date();
      const cr = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      const startCrIso = new Date(
        Date.UTC(cr.getUTCFullYear(), cr.getUTCMonth(), cr.getUTCDate(), 6, 0, 0),
      ).toISOString();

      const [clients, crmLeads, productions, documents, communications, leadsToday] =
        await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('agency_crm_leads').select('id', { count: 'exact', head: true }),
          supabase.from('production_sheets').select('id', { count: 'exact', head: true }),
          supabase.from('agency_proposals').select('id', { count: 'exact', head: true }),
          supabase.from('funnel_leads').select('id', { count: 'exact', head: true }),
          supabase
            .from('funnel_leads')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startCrIso),
        ]);
      return {
        clients: clients.count ?? 0,
        crmLeads: crmLeads.count ?? 0,
        productions: productions.count ?? 0,
        documents: documents.count ?? 0,
        communications: communications.count ?? 0,
        leadsToday: leadsToday.count ?? 0,
      } as Record<KpiKey, number>;
    },
  });
};

const AgencyResumen = () => {
  const { data, isLoading } = useAgencyKpis();

  const kpis = useMemo(
    () =>
      (Object.keys(KPI_META) as KpiKey[]).map((k) => ({
        key: k,
        value: data?.[k] ?? 0,
        ...KPI_META[k],
      })),
    [data],
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1600px] space-y-5">
        {/* Hero */}
        <section className="agency-card relative overflow-hidden p-6 md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  Live · Interno agencia
                </p>
              </div>
              <h2
                data-agency-display
                className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl"
              >
                Panel de control Socialify
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Métricas críticas, cobros del mes y producciones en curso en una sola vista.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/agencia/crm"
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 agency-glow"
              >
                <BarChart3 className="h-3.5 w-3.5" /> Pipeline
              </Link>
              <Link
                to="/agencia/producciones"
                className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Clapperboard className="h-3.5 w-3.5" /> Producciones
              </Link>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <Link key={kpi.key} to={kpi.href} className="agency-card agency-kpi group p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {kpi.label}
                </div>
                <kpi.icon className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              </div>
              <div
                data-agency-display
                className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-foreground"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  kpi.value.toLocaleString('es-CR')
                )}
              </div>
              <div className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {kpi.hint}
              </div>
            </Link>
          ))}
        </section>

        {/* Main grid: chart + clientes | rail */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <LeadsOverTimeChart />
            <CurrentClientsCard />
          </div>
          <HubRail />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgencyResumen;
