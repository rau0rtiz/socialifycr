import { useClientFeatures, FEATURE_LABELS, SECTION_LABELS, DASHBOARD_WIDGET_LABELS, VENTAS_WIDGET_LABELS, CONTENIDO_WIDGET_LABELS } from '@/hooks/use-client-features';
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

  const sectionWithWidgets: {
    sectionKey: string | null;
    icon: React.ElementType;
    locked?: boolean;
    widgets: Record<string, string>;
  }[] = [
    { sectionKey: null, icon: LayoutDashboard, locked: true, widgets: DASHBOARD_WIDGET_LABELS },
    { sectionKey: 'ventas_section', icon: LayoutDashboard, widgets: VENTAS_WIDGET_LABELS },
    { sectionKey: 'contenido_section', icon: LayoutDashboard, widgets: CONTENIDO_WIDGET_LABELS },
    { sectionKey: 'reportes_section', icon: LayoutDashboard, widgets: {} },
    { sectionKey: 'email_marketing_section', icon: LayoutDashboard, widgets: {} },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Controla qué secciones y widgets ve el cliente.
      </p>

      {/* Always-on: Historial & Ajustes */}
      <div className="space-y-2 mb-2">
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

      {sectionWithWidgets.map((section, idx) => {
        const sectionLabel = section.sectionKey ? SECTION_LABELS[section.sectionKey] : 'Dashboard';
        const sectionEnabled = section.locked || (section.sectionKey ? (flags as any)[section.sectionKey] ?? false : true);
        const hasWidgets = Object.keys(section.widgets).length > 0;

        return (
          <div key={idx}>
            <Separator className="mb-3" />
            {/* Section toggle */}
            <div className={`flex items-center justify-between ${section.locked ? 'opacity-60' : ''}`}>
              <Label htmlFor={`section-${section.sectionKey}`} className="text-sm cursor-pointer font-semibold">
                {sectionLabel}
              </Label>
              {section.locked ? (
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <Switch checked disabled />
                </div>
              ) : (
                <Switch
                  id={`section-${section.sectionKey}`}
                  checked={sectionEnabled}
                  onCheckedChange={(checked) => handleToggle(section.sectionKey!, checked)}
                />
              )}
            </div>

            {/* Nested widgets */}
            {hasWidgets && sectionEnabled && (
              <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-3">
                {Object.keys(section.widgets).map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`flag-${key}`} className="text-sm cursor-pointer">
                      {section.widgets[key]}
                    </Label>
                    <Switch
                      id={`flag-${key}`}
                      checked={(flags as any)[key] ?? false}
                      onCheckedChange={(checked) => handleToggle(key, checked)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
