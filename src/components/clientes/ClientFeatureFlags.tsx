import { useClientFeatures, FEATURE_LABELS } from '@/hooks/use-client-features';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ClientFeatureFlagsProps {
  clientId: string;
}

export const ClientFeatureFlags = ({ clientId }: ClientFeatureFlagsProps) => {
  const { flags, isLoading, updateFlag } = useClientFeatures(clientId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const handleToggle = (flag: string, value: boolean) => {
    updateFlag.mutate(
      { flag, value },
      {
        onSuccess: () => toast.success(`${FEATURE_LABELS[flag]} ${value ? 'activado' : 'desactivado'}`),
        onError: () => toast.error('Error al actualizar'),
      }
    );
  };

  const flagKeys = Object.keys(FEATURE_LABELS);

  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Secciones Visibles</h4>
      <div className="space-y-3">
        {flagKeys.map((key) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={`flag-${key}`} className="text-sm cursor-pointer">
              {FEATURE_LABELS[key]}
            </Label>
            <Switch
              id={`flag-${key}`}
              checked={(flags as any)[key] ?? false}
              onCheckedChange={(checked) => handleToggle(key, checked)}
              disabled={key === 'dashboard'}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
