import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Refetches every query currently mounted, without reloading the page.
 * Mobile needs an explicit control: the app shell and its inner scroll
 * containers swallow the browser's pull-to-refresh gesture.
 */
export function useRefreshAll() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await qc.refetchQueries({ type: 'active' }, { throwOnError: true });
      toast.success('Datos actualizados');
    } catch {
      toast.error('No se pudo actualizar. Revisá la conexión y reintentá.');
    } finally {
      setBusy(false);
    }
  }, [qc, busy]);

  return { busy, refresh };
}

const VARIANTS = {
  /** Pill inside the noeval production-sheet toolbar. */
  noeval: {
    base: 'flex flex-1 shrink-0 justify-center items-center gap-1.5 px-2.5 sm:px-3 py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest whitespace-nowrap text-noeval-ink hover:bg-noeval-accent hover:text-white transition disabled:opacity-40',
    icon: 'h-3.5 w-3.5',
    label: 'hidden lg:inline',
  },
  /** Ghost pill for the dark agency hub chrome. */
  agency: {
    base: 'inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50',
    icon: 'h-3.5 w-3.5',
    label: '',
  },
} as const;

export const RefreshButton = ({
  variant = 'agency',
  label = 'Refrescar',
  title = 'Actualizar datos',
  className,
}: {
  variant?: keyof typeof VARIANTS;
  label?: string;
  title?: string;
  className?: string;
}) => {
  const { busy, refresh } = useRefreshAll();
  const s = VARIANTS[variant];

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      title={title}
      aria-label={title}
      aria-busy={busy}
      className={cn(s.base, className)}
    >
      <RefreshCw className={cn(s.icon, busy && 'animate-spin')} />
      {label ? <span className={s.label}>{label}</span> : null}
    </button>
  );
};
