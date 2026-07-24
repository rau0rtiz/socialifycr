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
} from 'lucide-react';

type KpiKey =
  | 'clients'
  | 'crmLeads'
  | 'productions'
  | 'documents'
  | 'communications';

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
      const [clients, crmLeads, productions, documents, communications] =
        await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('agency_crm_leads').select('id', { count: 'exact', head: true }),
          supabase.from('production_sheets').select('id', { count: 'exact', head: true }),
          supabase.from('agency_proposals').select('id', { count: 'exact', head: true }),
          supabase.from('funnel_leads').select('id', { count: 'exact', head: true }),
        ]);
      return {
        clients: clients.count ?? 0,
        crmLeads: crmLeads.count ?? 0,
        productions: productions.count ?? 0,
        documents: documents.count ?? 0,
        communications: communications.count ?? 0,
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
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              Interno · Agencia
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Resumen
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor de métricas críticas y flujos activos.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Live
            </span>
          </div>
        </header>

        {/* KPI Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.key}
              to={kpi.href}
              className="agency-kpi group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {kpi.label}
                </div>
                <kpi.icon className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tighter text-foreground tabular-nums">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  kpi.value.toLocaleString('es-CR')
                )}
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {kpi.hint}
              </div>
            </Link>
          ))}
        </section>

        {/* Quick Actions */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Accesos Estratégicos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuickAction
              to="/agencia/crm"
              icon={BarChart3}
              title="Abrir Pipeline Comercial"
              description="Visualizá el flujo de conversión y gestioná leads, contratos y comisiones."
            />
            <QuickAction
              to="/agencia/producciones"
              icon={Clapperboard}
              title="Consola de Producción"
              description="Revisá calendario de grabaciones, estados y hojas por cliente."
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

const QuickAction = ({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition-all hover:border-primary/20"
  >
    <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative flex items-start justify-between gap-6">
      <div className="space-y-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted text-primary transition-all group-hover:border-primary/40 group-hover:agency-glow">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h4>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-all group-hover:border-primary/40 group-hover:text-primary">
        <ArrowUpRight className="h-5 w-5" />
      </div>
    </div>
  </Link>
);

export default AgencyResumen;
