import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface AiSwitch {
  feature: string;
  enabled: boolean;
  label: string;
  description: string | null;
}

export const useAiSwitches = () =>
  useQuery({
    queryKey: ['ai-switches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_switches')
        .select('feature, enabled, label, description')
        .order('feature');
      if (error) throw error;
      return (data || []) as AiSwitch[];
    },
    staleTime: 5 * 60 * 1000,
  });

export const AiSwitchesCard = () => {
  const { data: switches, isLoading } = useAiSwitches();
  const queryClient = useQueryClient();

  const toggle = useMutation({
    mutationFn: async ({ feature, enabled }: { feature: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('ai_switches')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('feature', feature);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ai-switches'] });
      toast.success(vars.enabled ? 'Función de IA activada' : 'Función de IA apagada');
    },
    onError: () => toast.error('Solo los administradores pueden cambiar esto'),
  });

  return (
    <div className="agency-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Consumo de IA
        </h3>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Apagá lo que no querés que gaste créditos. Apagado, el botón deja de llamar a la IA;
        los datos y las pantallas quedan intactos.
      </p>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {(switches || []).map((s) => (
            <li key={s.feature} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                {s.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                )}
              </div>
              <Switch
                checked={s.enabled}
                disabled={toggle.isPending}
                onCheckedChange={(enabled) => toggle.mutate({ feature: s.feature, enabled })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
