// Mold definitions: each "mold" is a framework template kind with its own structure and UI.
import type { TemplateKind, CreateMoldDimension } from '@/hooks/use-ad-frameworks';
import { Layers, Target, Rocket, Grid3x3 } from 'lucide-react';

export interface FrameworkMold {
  kind: TemplateKind;
  name: string;
  tagline: string;
  description: string;
  icon: typeof Layers;
  accentColor: string; // hsl
  // Initial dimensions to seed when creating
  defaultDimensions: CreateMoldDimension[];
}

export const FRAMEWORK_MOLDS: FrameworkMold[] = [
  {
    kind: 'pool',
    name: 'Pool de Variantes',
    tagline: 'Para A/B testing masivo',
    description:
      'Genera una piscina libre de creatividades para probar. Sin estructura jerárquica, perfecto cuando lo importante es la cantidad y diversidad para testear.',
    icon: Grid3x3,
    accentColor: '262 83% 58%',
    defaultDimensions: [
      // Catálogo inicial de tipos de contenido (editable)
      { dimension_type: 'content_type', label: 'Reel', position: 0 } as any,
      { dimension_type: 'content_type', label: 'Foto', position: 1 } as any,
      { dimension_type: 'content_type', label: 'Carrusel', position: 2 } as any,
      { dimension_type: 'content_type', label: 'Instagram Stories', position: 3 } as any,
    ],
  },
  {
    kind: 'awareness',
    name: 'Niveles de Awareness',
    tagline: '5 niveles × mensajes centrales',
    description:
      'Modelo de Eugene Schwartz: anuncios mapeados a los 5 niveles de consciencia del prospecto. Cada nivel tiene mensajes centrales y dentro variantes específicas.',
    icon: Target,
    accentColor: '199 89% 48%',
    defaultDimensions: [
      // 5 niveles fijos
      { dimension_type: 'awareness_level', label: 'Inconsciente', color: '#94a3b8' },
      { dimension_type: 'awareness_level', label: 'Consciente del problema', color: '#f59e0b' },
      { dimension_type: 'awareness_level', label: 'Consciente de la solución', color: '#3b82f6' },
      { dimension_type: 'awareness_level', label: 'Consciente del producto', color: '#a855f7' },
      { dimension_type: 'awareness_level', label: 'Más consciente', color: '#10b981' },
      // Catálogo de tipos de contenido
      { dimension_type: 'content_type', label: 'Reel' },
      { dimension_type: 'content_type', label: 'Foto' },
      { dimension_type: 'content_type', label: 'Carrusel' },
      { dimension_type: 'content_type', label: 'Instagram Stories' },
    ],
  },
  {
    kind: 'launch',
    name: 'Secuencia de Lanzamiento',
    tagline: 'Flujo ordenado por fases',
    description:
      'Secuencia con fases ordenadas (Calentamiento → Apertura → Cierre). Cada fase tiene sus piezas de contenido. Ideal para masterclasses y lanzamientos tipo PLF.',
    icon: Rocket,
    accentColor: '24 95% 53%',
    defaultDimensions: [
      { dimension_type: 'phase', label: 'Calentamiento', color: '#f59e0b',
        metadata: { description: 'Pre-lanzamiento: generar interés y educar' } },
      { dimension_type: 'phase', label: 'Desarrollo', color: '#10b981',
        metadata: { description: 'Anuncio del lanzamiento, desarrollo de comunidad e inscripciones' } },
      { dimension_type: 'phase', label: 'Cierre', color: '#ef4444',
        metadata: { description: 'Urgencia, últimas plazas, cierre del carrito' } },
      { dimension_type: 'content_type', label: 'Historia Puro Texto' },
      { dimension_type: 'content_type', label: 'Historia de Respuesta' },
      { dimension_type: 'content_type', label: 'Anuncio 20s' },
      { dimension_type: 'content_type', label: 'Contenido Orgánico + CTA' },
      { dimension_type: 'content_type', label: 'Correo' },
      { dimension_type: 'content_type', label: 'Instagram Stories' },
    ],
  },
];

export const getMold = (kind: TemplateKind | undefined): FrameworkMold | undefined =>
  FRAMEWORK_MOLDS.find((m) => m.kind === kind);
