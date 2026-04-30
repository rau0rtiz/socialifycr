import type { AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';
import { ContentTypeCatalog, FrameworkMetaSection, MoldHeader } from './shared';

export const PoolBuilder = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  return (
    <div className="space-y-6 mt-4">
      <MoldHeader
        framework={framework}
        subtitle="Define el catálogo de formatos que tu equipo va a producir libremente. No hay fases ni jerarquía."
      />
      <FrameworkMetaSection framework={framework} />
      <ContentTypeCatalog framework={framework} />
    </div>
  );
};
