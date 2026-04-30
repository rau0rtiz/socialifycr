import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  useUpdateAdFramework,
  type AdFrameworkWithDimensions,
  type DimensionType,
} from '@/hooks/use-ad-frameworks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DimensionList, FrameworkMetaSection, MoldHeader } from './shared';

export const LegacyMatrixBuilder = ({ framework }: { framework: AdFrameworkWithDimensions }) => {
  const angles = framework.dimensions.filter((d) => d.dimension_type === 'angle');
  const formats = framework.dimensions.filter((d) => d.dimension_type === 'format');
  const hooks = framework.dimensions.filter((d) => d.dimension_type === 'hook');
  const hasHooks = hooks.length > 0;
  const total = hasHooks ? angles.length * formats.length * hooks.length : angles.length * formats.length;
  const [showHooks, setShowHooks] = useState(hasHooks);

  return (
    <div className="space-y-6 mt-4">
      <MoldHeader
        framework={framework}
        subtitle={`Genera todas las combinaciones automáticamente. Total actual: ${
          hasHooks
            ? `${angles.length} × ${formats.length} × ${hooks.length} = ${total}`
            : `${angles.length} × ${formats.length} = ${total}`
        } variantes/campaña.`}
      />
      <FrameworkMetaSection framework={framework} />

      <DimensionList
        framework={framework}
        type="angle"
        items={angles}
        title="Ángulos"
        hint="El enfoque emocional / argumental del mensaje"
        addLabel="Agregar ángulo"
        withColor
      />
      <DimensionList
        framework={framework}
        type="format"
        items={formats}
        title="Formatos"
        hint="Cómo se presenta visualmente el anuncio"
        addLabel="Agregar formato"
      />

      {showHooks ? (
        <DimensionList
          framework={framework}
          type="hook"
          items={hooks}
          title="Hooks"
          hint="La línea de apertura que captura la atención"
          addLabel="Agregar hook"
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setShowHooks(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Convertir en matriz 3D (añadir Hooks)
        </Button>
      )}
    </div>
  );
};
