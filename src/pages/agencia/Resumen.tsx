import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Clapperboard, BarChart3 } from 'lucide-react';
import { LeadsOverTimeChart } from '@/components/agency/LeadsOverTimeChart';
import { CurrentClientsCard } from '@/components/agency/CurrentClientsCard';
import { HubRail } from '@/components/agency/HubRail';
import { useProfile } from '@/components/dashboard/ProfileDialog';

const greetingForHour = (hour: number) => {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const AgencyResumen = () => {
  const { data: profile } = useProfile();

  const greeting = useMemo(() => {
    const hour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'America/Costa_Rica',
      }).format(new Date()),
      10,
    );
    const firstName = (profile?.full_name || 'Raul').trim().split(' ')[0];
    return `${greetingForHour(hour)}, ${firstName}`;
  }, [profile?.full_name]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1600px] space-y-5">
        {/* Hero */}
        <section className="agency-card relative overflow-hidden p-6 md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2
                data-agency-display
                className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
              >
                {greeting}
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
