export interface FrameworkTemplateDimension {
  label: string;
  color?: string;
}

export interface FrameworkTemplate {
  id: string;
  name: string;
  description: string;
  hint: string;
  angles: FrameworkTemplateDimension[];
  formats: FrameworkTemplateDimension[];
  hooks: FrameworkTemplateDimension[];
}

export const FRAMEWORK_TEMPLATES: FrameworkTemplate[] = [
  {
    id: 'blank',
    name: 'En blanco',
    description: 'Empezar desde cero',
    hint: 'Sin dimensiones precargadas. Las defines manualmente.',
    angles: [],
    formats: [],
    hooks: [],
  },
  {
    id: 'masterclass',
    name: 'MASTERCLASS / Educación',
    description: 'Para info-productos, masterclasses y formación',
    hint: 'Ángulos típicos de venta educativa con foto / reel / carrusel.',
    angles: [
      { label: 'Dolor',          color: '#ef4444' },
      { label: 'Autoridad',      color: '#3b82f6' },
      { label: 'Transformación', color: '#10b981' },
      { label: 'Método',         color: '#a855f7' },
    ],
    formats: [
      { label: 'Foto' },
      { label: 'Reel' },
      { label: 'Carrusel' },
    ],
    hooks: [
      { label: 'Pregunta' },
      { label: 'Estadística' },
      { label: 'Historia personal' },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce / Producto',
    description: 'Para tiendas y productos físicos',
    hint: 'Ángulos basados en beneficio, prueba social y urgencia.',
    angles: [
      { label: 'Beneficio',    color: '#10b981' },
      { label: 'Social proof', color: '#f59e0b' },
      { label: 'Objeción',     color: '#ef4444' },
      { label: 'Urgencia',     color: '#a855f7' },
    ],
    formats: [
      { label: 'Foto producto' },
      { label: 'Reel UGC' },
      { label: 'Carrusel' },
    ],
    hooks: [
      { label: 'Antes/Después' },
      { label: 'Testimonio' },
      { label: 'Demo en uso' },
    ],
  },
];
