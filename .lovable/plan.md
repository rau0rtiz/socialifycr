

## Merge: Widget de Tendencia + Tracker de Historias y Ventas

### Problema
Hay dos widgets mostrando esencialmente la misma información (historias y ventas por día):
- **Tendencia**: Area chart + 4 KPI cards, hardcoded a 30 días
- **Tracker de Historias y Ventas**: Calendario semanal + sidebar con sparklines + sistema de overrides manuales

Ambos muestran totales de historias, totales de ventas, y tendencias — es redundante.

### Propuesta: Un solo widget unificado

Fusionar todo en `StoryRevenueTracker`, que ya tiene la funcionalidad más compleja (calendario + overrides). Se le agrega el area chart y KPIs, y se conecta al periodo global.

**Estructura del widget unificado:**

```text
┌─────────────────────────────────────────────────────┐
│ Tracker de Historias y Ventas          [Automático]  │
├─────────────────────────────────────────────────────┤
│  [KPI: Historias] [KPI: Ventas] [₡/Historia] [Mejor]│
├─────────────────────────────────────────────────────┤
│  ┌── Calendario semanal ──┐  ┌── Sidebar ─────────┐ │
│  │  Lun Mar Mié ...       │  │ Resumen semana     │ │
│  │  con indicators        │  │ + sparklines       │ │
│  │  + hover tooltips      │  │ + días actividad   │ │
│  └────────────────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Area chart (historias vs ventas) con tooltip        │
│  Leyenda con totales                                 │
└─────────────────────────────────────────────────────┘
```

### Cambios técnicos

**1. `src/hooks/use-daily-story-tracker.ts`**
- Modificar para aceptar un rango de fechas `{ start: Date, end: Date }` opcional en lugar de hardcodear 30 días para los datos del chart
- Si se pasa rango, usarlo para las queries de chart; si no, usar últimos 30 días como fallback

**2. `src/components/ventas/StoryRevenueTracker.tsx`**
- Agregar prop `dateRange?: { start: Date; end: Date }` para recibir el periodo global
- Integrar el area chart (con gradientes, doble eje Y) debajo del calendario
- Integrar las 4 mini KPI cards (Total Historias, Total Ventas, ₡/Historia, Mejor día) arriba del calendario
- Importar Recharts (AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip)
- El chart usa los datos del periodo global, el calendario semanal sigue navegable independientemente

**3. `src/pages/Ventas.tsx`**
- Eliminar todo el bloque del widget de Tendencia (líneas ~344-486) que renderiza el area chart inline
- Eliminar la llamada a `useDailyStoryTracker` para chart data (línea 135 — `storyChartData`)
- Pasar `dateRange={globalRange}` al `<StoryRevenueTracker>`
- El `SalesGoalBar` de Alma Bendita se queda solo (sin grid compartido con Tendencia)
- Limpiar imports no usados (AreaChart, BookOpen, etc.)

