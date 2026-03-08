import { useClientFeatures, FEATURE_LABELS, SECTION_LABELS } from '@/hooks/use-client-features';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { LayoutDashboard, History, Palette, Lock } from 'lucide-react';

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
        onSuccess: () => {
          const label = SECTION_LABELS[flag] || FEATURE_LABELS[flag];
          toast.success(`${label} ${value ? 'activado' : 'desactivado'}`);
        },
        onError: () => toast.error('Error al actualizar'),
      }
    );
  };

  const defaultSections = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Historial', icon: History },
    { label: 'Ajustes', icon: Palette },
  ];

  const sectionKeys = Object.keys(SECTION_LABELS);
  const featureKeys = Object.keys(FEATURE_LABELS);

  return (
    <div className="space-y-5">
      {/* Navigation sections */}
      <div>
        <h4 className="text-sm font-medium mb-3">Secciones de Navegación</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Controla qué pestañas ve el cliente en su menú lateral.
        </p>

        {/* Always-on sections */}
        <div className="space-y-2 mb-3">
          {defaultSections.map((s) => (
            <div key={s.label} className="flex items-center justify-between opacity-60">
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">{s.label}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <Switch checked disabled />
              </div>
            </div>
          ))}
        </div>

        {/* Toggleable sections */}
        <div className="space-y-2">
          {sectionKeys.map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`section-${key}`} className="text-sm cursor-pointer font-medium">
                {SECTION_LABELS[key]}
              </Label>
              <Switch
                id={`section-${key}`}
                checked={(flags as any)[key] ?? false}
                onCheckedChange={(checked) => handleToggle(key, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Widget-level features */}
      <div>
        <h4 className="text-sm font-medium mb-3">Widgets del Dashboard</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Controla qué módulos aparecen dentro del dashboard del cliente.
        </p>
        <div className="space-y-2">
          {featureKeys.map((key) => (
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
    </div>
  );
};
