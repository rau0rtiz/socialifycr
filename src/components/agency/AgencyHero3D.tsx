import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Clapperboard, FileText, MessageSquare, Users, Wallet, Zap } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { useAgencyCrmLeads } from '@/hooks/use-agency-crm-leads';
import type { HotspotId } from './three/AgencyScene';

const AgencyScene = lazy(() => import('./three/AgencyScene'));

const HOTSPOTS: Record<HotspotId, { label: string; to: string }> = {
  camara: { label: 'Producciones', to: '/agencia/producciones' },
  computadora: { label: 'CRM', to: '/agencia/crm' },
  megafono: { label: 'Funnels', to: '/agencia/funnels' },
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** ¿El dispositivo puede dibujar la escena? */
const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

export const AgencyHero3D = ({
  greeting,
  onFallback,
}: {
  greeting: string;
  /** Si el dispositivo no soporta la escena, volvemos a la vista clásica. */
  onFallback: () => void;
}) => {
  const navigate = useNavigate();
  const { clients, clientsLoading } = useBrand();
  const { leads, isLoading: leadsLoading } = useAgencyCrmLeads();
  const [hovered, setHovered] = useState<HotspotId | null>(null);
  const still = useMemo(prefersReducedMotion, []);

  useEffect(() => {
    if (!supportsWebGL()) onFallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLeads = leads?.filter((l) => !['cliente', 'perdido'].includes(l.status)).length ?? 0;
  const go = (id: HotspotId) => navigate(HOTSPOTS[id].to);

  return (
    <section className="agency-card relative overflow-hidden">
      {/* Escena: solo se monta cuando esta vista está activa */}
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <AgencyScene still={still} onActivate={go} onHoverLabel={setHovered} />
        </Suspense>
      </div>

      {/* Interfaz HTML sobre la escena */}
      <div className="pointer-events-none relative grid min-h-[560px] grid-cols-1 gap-4 p-5 md:p-8 lg:grid-cols-[minmax(0,300px)_1fr_minmax(0,300px)]">
        <div className="lg:col-span-3">
          <h2 data-agency-display className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Tu agencia, <span className="text-primary">en perspectiva.</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{greeting}.</p>
        </div>

        <div className="pointer-events-auto flex flex-col gap-4 self-start lg:mt-6">
          <HeroCard
            icon={<Users className="h-4 w-4" />}
            title="Clientes"
            value={clientsLoading ? '—' : `${clients.length} cuentas`}
            onClick={() => navigate('/agencia/clientes')}
          />
          <HeroCard
            icon={<MessageSquare className="h-4 w-4" />}
            title="Chats"
            value="Abrir bandeja"
            onClick={() => navigate('/agencia/chats')}
          />
        </div>

        <div className="hidden lg:block" aria-hidden />

        <div className="pointer-events-auto flex flex-col gap-4 self-start lg:mt-6">
          <HeroCard
            icon={<BarChart3 className="h-4 w-4" />}
            title="CRM"
            value={leadsLoading ? '—' : `${openLeads} leads`}
            onClick={() => navigate('/agencia/crm')}
            action="Abrir CRM"
          />
          <HeroCard
            icon={<Clapperboard className="h-4 w-4" />}
            title="Producciones"
            value="Ver agenda"
            onClick={() => navigate('/agencia/producciones')}
          />
        </div>

        {/* Navegación equivalente por teclado a los objetos 3D */}
        <div className="pointer-events-auto lg:col-span-3 lg:mt-auto">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur-sm">
            <span className="flex items-center gap-2 pr-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              <Zap className="h-3.5 w-3.5" /> Accesos rápidos
            </span>
            {(Object.keys(HOTSPOTS) as HotspotId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                onFocus={() => setHovered(id)}
                onBlur={() => setHovered(null)}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  hovered === id
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-primary'
                }`}
              >
                {id === 'camara' && <Clapperboard className="h-3.5 w-3.5" />}
                {id === 'computadora' && <BarChart3 className="h-3.5 w-3.5" />}
                {id === 'megafono' && <FileText className="h-3.5 w-3.5" />}
                {HOTSPOTS[id].label} <ArrowRight className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/agencia/pagos')}
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Wallet className="h-3.5 w-3.5" /> Pagos <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const HeroCard = ({
  icon,
  title,
  value,
  onClick,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  onClick: () => void;
  action?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full rounded-2xl border border-border/60 bg-background/70 p-4 text-left backdrop-blur-sm transition-colors hover:border-primary/50"
  >
    <div className="flex items-center gap-3">
      <span className="text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        <p data-agency-display className="truncate text-lg font-bold text-foreground">{value}</p>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
    </div>
    {action && (
      <span className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
        {action} <ArrowRight className="h-3 w-3" />
      </span>
    )}
  </button>
);

export default AgencyHero3D;
