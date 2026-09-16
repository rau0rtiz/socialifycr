import { FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMsgTestCases } from '@/hooks/use-messaging';

export const LabPanel = () => {
  const { data: cases, isLoading } = useMsgTestCases();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="agency-card flex items-start gap-3 rounded-2xl p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Laboratorio</p>
          <p className="text-xs text-muted-foreground">
            Acá quedan los casos de prueba con los que se valida el setter. Las simulaciones corren aisladas y no cuentan en los
            indicadores. Todavía no hay modelo de IA conectado, así que no se pueden ejecutar: eso llega en la fase 3.
          </p>
        </div>
      </div>

      <div className="agency-card space-y-2 rounded-2xl p-5">
        <p className="text-sm font-semibold text-foreground">Casos de prueba ({cases?.length ?? 0})</p>
        <div className="space-y-2">
          {(cases ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 p-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{c.title}</p>
                <p className="text-[11px] text-muted-foreground">{c.expectation}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.is_critical && (
                  <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-300 text-[10px]">Crítico</Badge>
                )}
                <Badge variant="outline" className="text-[10px]">Sin correr</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
