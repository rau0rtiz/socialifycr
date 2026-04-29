## Rediseño visual del Canvas de Campañas

El problema no es funcional sino de **percepción visual** y de **navegación**: hoy las pestañas por ángulo en frameworks 3D ocultan el todo, no hay un sentido global de "cuántos ads faltan producir", y la matriz se siente densa pero plana.

### Cambios principales

**1. Header con barra de progreso global (siempre visible)**
Reemplazar el contador `"X de Y variantes"` por un panel sticky con:
- Barra de progreso grande (% de variantes en estado `ready` + `published`)
- Mini-stats en línea: `🟦 12 Pendiente · 🟧 8 En progreso · 🟩 6 Listo · 🟦 4 Subido`
- Conteo de fechas: `3 vencidas · 2 esta semana`
- Esto da el "pulse" del proyecto de un vistazo, sin abrir nada.

**2. Eliminar pestañas en modo 3D — vista "Board" agrupada**
En lugar de `Tabs` por ángulo, mostrar **todos los ángulos en una sola página apilados verticalmente**, cada ángulo como una "sección colapsable":

```text
▼ Ángulo: Dolor económico                    [12/18 listos] ████████░░
   ┌─────────────────────────────────────────────────────┐
   │            Hook 1   Hook 2   Hook 3   Hook 4        │
   │   Reel    [card]   [card]   [card]   [card]         │
   │   Foto    [card]   [card]   [card]   [card]         │
   │   Carr.   [card]   [card]   [card]   [card]         │
   └─────────────────────────────────────────────────────┘

▼ Ángulo: Aspiración                         [4/18 listos] ██░░░░░░░░
   ...
```

- Cada sección tiene su propia barra de progreso por ángulo (mini KPI).
- Sección colapsable (clic en el header) para enfocarse en uno sin perder contexto.
- Color del ángulo como banda izquierda de cada card y borde del header.
- Una sola "Master view": scroll vertical en lugar de saltar entre tabs.

**3. Nueva vista "Galería" (reemplaza el sentir denso de la matriz)**
Añadir un cuarto modo de vista junto a Matriz / Kanban / Calendario:
- **Galería**: grid uniforme de cards más grandes (3-4 por fila), con thumbnail prominente del asset si existe (placeholder con ícono del formato si no).
- Filtros encima: chips para ángulo, formato, estado, hook (multiselect rápido).
- Es la vista para "ver todos los ads a producir" sin estructura matricial.

**4. Cards rediseñadas (más visuales, menos texto)**
Cada `VariantCard`:
- Thumbnail/preview del asset arriba (16:9 o 1:1) — placeholder gradiente con ícono grande del formato (Reel/Foto/Carrusel) cuando vacío.
- Banda lateral de 3px con el color del ángulo.
- Badge de estado como punto + texto en la esquina (no fondo completo).
- Fecha (si existe) abajo en chip pequeño con color rojo/ámbar/normal según urgencia.
- Hover: leve scale + sombra suave.

**5. Barra de progreso por dimensión (mini-KPIs)**
Encima del board, una fila de mini-cards:
- Una card por ángulo con su barra y `X/Y listos`
- Permite identificar visualmente qué ángulo está más rezagado

### Detalles técnicos

**Archivos a modificar:**
- `src/pages/AdCampaignCanvas.tsx`
  - Extraer el header en un sub-componente `<CampaignHeader>` con la barra global y stats
  - Reescribir `MatrixView` 3D: sustituir `Tabs` por `<AngleSection>` colapsable con `Collapsible` de shadcn
  - Añadir `GalleryView` con `Card` grid + filtros multi-chip
  - Añadir `view: 'gallery'` al `ViewMode` type y nuevo botón en `ViewBtn` switcher
- `src/components/ad-frameworks/` (nuevos sub-componentes):
  - `CampaignProgressHeader.tsx` — barra global + chips de stats + alerts
  - `AngleSectionBoard.tsx` — sección colapsable por ángulo con su mini-tabla hooks×formatos
  - `VariantCardV2.tsx` — card visual con thumbnail (reemplaza la actual cuando aplique)
  - `GalleryView.tsx` — grid de cards + filtros

**Datos derivados (sin cambios DB):**
- Calcular `progressByAngle` desde `variants` agrupando por `angle_id`
- Calcular `dueDateStats` (overdue/this week) desde `variants.due_date`
- Reusar `useAdVariants` existente, sin queries nuevas

**Sin cambios en:**
- Backend / migraciones / hooks de mutación
- Vistas Kanban y Calendario (funcionan bien)
- Vista Matrix 2D (ya es buena para 2 dimensiones según mencionaste)

### Resumen de lo que verás

- **Antes**: pestañas por ángulo → tabla densa → "¿dónde estoy?"
- **Después**: scroll vertical con cada ángulo como sección visual con su propia barra de progreso → vista global del proyecto siempre arriba → opción de "Galería" para ver todos los ads como tarjetas grandes.

¿Apruebo y procedo?
