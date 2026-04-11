import { useClientFeatures, SECTION_LABELS, FEATURE_LABELS, DASHBOARD_WIDGET_LABELS, VENTAS_WIDGET_LABELS, CONTENIDO_WIDGET_LABELS, REPORTES_WIDGET_LABELS } from '@/hooks/use-client-features';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  LayoutDashboard, ShoppingCart, FileText, BarChart3, Mail, Database, Lock, Settings2, ClipboardCheck,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ClientFeatureFlagsProps {
  clientId: string;
}

type SectionDef = {
  key: string | null;
  label: string;
  icon: React.ElementType;
  locked?: boolean;
  widgets: Record<string, string>;
};

const SECTIONS: SectionDef[] = [
  { key: null, label: 'Dashboard', icon: LayoutDashboard, locked: true, widgets: DASHBOARD_WIDGET_LABELS },
  { key: 'ventas_section', label: 'Ventas', icon: ShoppingCart, widgets: VENTAS_WIDGET_LABELS },
  { key: 'contenido_section', label: 'Contenido', icon: FileText, widgets: CONTENIDO_WIDGET_LABELS },
  { key: 'reportes_section', label: 'Reportes', icon: BarChart3, widgets: REPORTES_WIDGET_LABELS },
  { key: 'email_marketing_section', label: 'Email Marketing', icon: Mail, widgets: {} },
  { key: 'business_setup_section', label: 'Business Setup', icon: Settings2, widgets: {} },
  { key: 'asistencia_section', label: 'Asistencia', icon: ClipboardCheck, widgets: {} },
  { key: null, label: 'Client Database', icon: Database, locked: true, widgets: {} },
];

export const ClientFeatureFlags = ({ clientId }: ClientFeatureFlagsProps) => {
  const { flags, isLoading, updateFlag } = useClientFeatures(clientId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
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

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Controla qué secciones y widgets ve el cliente.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SECTIONS.map((section, idx) => {
          const sectionEnabled = section.locked || (section.key ? (flags as any)[section.key] ?? false : true);
          const hasWidgets = Object.keys(section.widgets).length > 0;
          const Icon = section.icon;

          const card = (
            <div
              key={idx}
              className={cn(
                'relative rounded-xl border p-4 flex flex-col items-center gap-2 transition-all',
                sectionEnabled
                  ? 'bg-card border-border shadow-sm'
                  : 'bg-muted/40 border-border/50 opacity-60',
              )}
            >
              <div className={cn(
                'p-2.5 rounded-lg',
                sectionEnabled ? 'bg-primary/10' : 'bg-muted',
              )}>
                <Icon className={cn('h-5 w-5', sectionEnabled ? 'text-primary' : 'text-muted-foreground')} />
              </div>

              <span className="text-xs font-semibold text-center leading-tight">{section.label}</span>

              {section.locked ? (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Siempre activo</span>
                </div>
              ) : (
                <Switch
                  checked={sectionEnabled}
                  onCheckedChange={(checked) => handleToggle(section.key!, checked)}
                  className="mt-0.5"
                />
              )}

              {/* Gear icon for widgets popup */}
              {hasWidgets && sectionEnabled && (
                <div className="absolute top-2 right-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="p-1 rounded-md hover:bg-accent transition-colors" title="Configurar widgets">
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-60 p-3">
                      <p className="text-xs font-semibold mb-2">Widgets de {section.label}</p>
                      <ScrollArea className="max-h-64">
                        <div className="space-y-2 pr-2">
                          {Object.entries(section.widgets).map(([key, label]) => (
                            <div key={key} className="flex items-center justify-between">
                              <Label htmlFor={`w-${key}`} className="text-xs cursor-pointer">
                                {label}
                              </Label>
                              <Switch
                                id={`w-${key}`}
                                checked={(flags as any)[key] ?? false}
                                onCheckedChange={(checked) => handleToggle(key, checked)}
                                className="scale-90"
                              />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          );

          return card;
        })}
      </div>
    </div>
  );
};
