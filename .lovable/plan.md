

# Mejorar cuadrícula de selección de anuncios

## Cambios

### 1. `src/hooks/use-ads-data.ts` — Ordenar por gasto
- En `useAllAds`, después de mapear los ads, ordenar el array por `spend` descendente antes de retornarlo

### 2. `src/components/ventas/AdGridSelector.tsx` — Rediseño completo
- **3 columnas** en vez de 2 (`grid-cols-3`) con thumbnails en aspect-ratio 4:3 más compactos
- **Buscador** arriba de la cuadrícula: input de texto que filtra por nombre de anuncio o campaña
- **"Sin anuncio"** como fila completa arriba del grid (no como celda de la cuadrícula)
- **Gasto prominente**: mostrar el spend como texto destacado visible sin necesidad de leer detalles pequeños
- Reducir padding/spacing para mostrar más ads por pantalla
- Loading skeleton ajustado a 3 columnas

### Resultado visual
```text
┌─────────────────────────────────┐
│ 🔍 Buscar anuncio...            │
├─────────────────────────────────┤
│ [ ○ Sin anuncio              ]  │
├──────────┬──────────┬──────────┤
│ [4:3 img]│ [4:3 img]│ [4:3 img]│
│ Ad name  │ Ad name  │ Ad name  │
│ Campaign │ Campaign │ Campaign │
│ $1,200   │ $800     │ $500     │
├──────────┼──────────┼──────────┤
│ ...      │ ...      │ ...      │
└──────────┴──────────┴──────────┘
```

## Archivos
- `src/hooks/use-ads-data.ts`
- `src/components/ventas/AdGridSelector.tsx`

