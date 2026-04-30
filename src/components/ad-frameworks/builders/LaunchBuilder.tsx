import { useMemo } from 'react';
import type { AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';
import { ContentTypeCatalog, DimensionList, FrameworkMetaSection, MoldHeader } from './shared';

export const LaunchBuilder = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const phases = useMemo(
    () => framework.dimensions
      .filter((d) => d.dimension_type === 'phase')
      .sort((a, b) => a.position - b.position),
    [framework.dimensions],
  );

  return (
    <div className="space-y-6 mt-4">
      <MoldHeader
        framework={framework}
        subtitle="Configura las fases en orden cronológico (Calentamiento → Apertura → Cierre, etc.) y los tipos de contenido disponibles para cada una."
      />
      <FrameworkMetaSection framework={framework} />

      <DimensionList
        framework={framework}
        type="phase"
        items={phases}
        title="Fases del lanzamiento"
        hint="El orden importa: define la secuencia desde el primer mensaje hasta el cierre del carrito."
        addLabel="Añadir fase"
        withColor
        withDescription
        showOrderIndex
        orderPrefix="F"
      />

      <ContentTypeCatalog
        framework={framework}
        title="Tipos de contenido del lanzamiento"
        hint="Historia puro texto, Anuncio 20s, Correos, Contenido orgánico + CTA, etc."
      />
    </div>
  );
};
