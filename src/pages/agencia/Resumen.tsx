import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  UserPlus,
  Clapperboard,
  FileText,
  Mail,
  ArrowUpRight,
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
    label: 'Clientes activos',
    icon: Users,
    href: '/agencia/clientes',
    hint: 'Cuentas en la base',
  },
  crmLeads: {
    label: 'Leads CRM',
    icon: UserPlus,
    href: '/agencia/crm',
    hint: 'Pipeline abierto',
  },
  productions: {
    label: 'Hojas de producción',
    icon: Clapperboard,
    href: '/agencia/producciones',
    hint: 'En cualquier estado',
  },
  documents: {
    label: 'Documentos',
    icon: FileText,
    href: '/agencia/documentacion',
    hint: 'Propuestas · reportes · planes',
  },
  communications: {
    label: 'Contactos',
    icon: Mail,
    href: '/agencia/comunicaciones',
    hint: 'Leads en comunicaciones',
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
          supabase
            .from('agency_crm_leads')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('production_sheets')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('agency_proposals')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('funnel_leads')
            .select('id', { count: 'exact', head: true }),
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
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Interno · Agencia
          </p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                Resumen
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Vista rápida del estado interno de la agencia.
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {kpis.map((kpi) => (
            <Link
              key={kpi.key}
              to={kpi.href}
              className="group"
            >
              <Card className="p-5 h-full border-border/60 hover:border-foreground/20 transition-colors bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-foreground/[0.04] p-2.5">
                    <kpi.icon className="h-4 w-4 text-foreground/70" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                </div>
                <div className="mt-6">
                  <div className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      kpi.value.toLocaleString('es-CR')
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {kpi.label}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {kpi.hint}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link to="/agencia/crm" className="group">
            <Card className="p-6 h-full border-border/60 hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Ir al pipeline
                </h2>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Trabajá los leads, contratos y comisiones de la agencia.
              </p>
            </Card>
          </Link>
          <Link to="/agencia/producciones" className="group">
            <Card className="p-6 h-full border-border/60 hover:border-foreground/20 transition-colors">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Hojas de producción
                </h2>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Revisá calendario de grabaciones y estados por cliente.
              </p>
            </Card>
          </Link>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AgencyResumen;
