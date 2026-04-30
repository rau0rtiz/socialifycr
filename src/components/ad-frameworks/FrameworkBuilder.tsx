import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';
import { PoolBuilder } from './builders/PoolBuilder';
import { AwarenessBuilder } from './builders/AwarenessBuilder';
import { LaunchBuilder } from './builders/LaunchBuilder';
import { LegacyMatrixBuilder } from './builders/LegacyMatrixBuilder';

interface Props {
  framework: AdFrameworkWithDimensions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FrameworkBuilder = ({ framework, open, onOpenChange }: Props) => {
  const renderBuilder = () => {
    switch (framework.template_kind) {
      case 'pool':
        return <PoolBuilder framework={framework} />;
      case 'awareness':
        return <AwarenessBuilder framework={framework} />;
      case 'launch':
        return <LaunchBuilder framework={framework} />;
      case 'legacy_matrix':
      default:
        return <LegacyMatrixBuilder framework={framework} />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar framework</SheetTitle>
          <SheetDescription className="text-xs">
            Los cambios se aplican a todas las campañas existentes de este framework.
          </SheetDescription>
        </SheetHeader>
        {renderBuilder()}
      </SheetContent>
    </Sheet>
  );
};
