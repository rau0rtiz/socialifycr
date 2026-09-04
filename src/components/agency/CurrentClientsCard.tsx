import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, Loader2 } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';

/** "Clientes actuales" block: logos + industry, links into each client hub. */
export const CurrentClientsCard = () => {
  const { clients, clientsLoading } = useBrand();

  return (
    <section className="agency-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Clientes actuales
          </p>
          <h2 data-agency-display className="mt-1 text-lg font-bold text-foreground">
            {clientsLoading ? '—' : `${clients.length} cuentas`}
          </h2>
        </div>
        <Link
          to="/agencia/clientes"
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          Ver todos <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {clientsLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {clients.map((c) => (
            <Link
              key={c.id}
              to={`/agencia/clientes?client=${c.id}`}
              className="group flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/40 p-2.5 transition-colors hover:border-primary/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-card">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                  {c.name}
                </p>
                <p className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {c.industry || 'Cliente'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
