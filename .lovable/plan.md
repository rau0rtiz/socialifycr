

# Plan: Pipeline Dashboard para The Mind Coach

## Resumen

Crear un sistema de métricas unificado para el Pipeline de The Mind Coach con: widget resumen con selector de periodo, calendario de reporte diario del setter, tabla de campañas Meta, y métricas de show rate/no show mejoradas.

## Cambios necesarios

### 1. Nueva tabla: `setter_daily_reports`

Migración para crear tabla donde el setter guarda su reporte diario:

```sql
CREATE TABLE public.setter_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  report_date date NOT NULL,
  ig_conversations integer NOT NULL DEFAULT 0,
  wa_conversations integer NOT NULL DEFAULT 0,
  followups integer NOT NULL DEFAULT 0,
  appointments_made integer NOT NULL DEFAULT 0,
  day_notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, report_date)
);

ALTER TABLE public.setter_daily_reports ENABLE ROW LEVEL SECURITY;
-- RLS: team members can CRUD, admins can manage all
```

### 2. Nuevo componente: `PipelineSummaryWidget`
- **Ubicacion**: `src/components/ventas/PipelineSummaryWidget.tsx`
- Selector de periodo (7d, 30d, este mes, personalizado)
- KPIs en grid: Gasto de campaña (con multi-selector de campañas), Total conversaciones (IG + WA sumadas del calendario), Agendas realizadas, Show Rate %, No Show %, Ventas cerradas, Close Rate %
- Todas las metricas calculadas del periodo seleccionado
- Se ubica **hasta arriba** del Pipeline (solo Mind Coach)

### 3. Nuevo componente: `SetterDailyCalendar`
- **Ubicacion**: `src/components/ventas/SetterDailyCalendar.tsx`
- Calendario visual basado en `<Calendar />` de shadcn
- Color-coded: verde = tiene reporte, rojo = no tiene reporte, borde especial para hoy (hora Costa Rica)
- Al hacer clic en un día: abre dialog para ver/editar el reporte con campos: conversaciones IG, conversaciones WA, seguimientos, notas del día, agendas realizadas
- Hook: `src/hooks/use-setter-daily-reports.ts` para CRUD contra la nueva tabla

### 4. Widget de Campañas Meta en Pipeline
- Reusar `CampaignsDrilldown` (o `CampaignsTable`) existente dentro de la pagina Ventas, condicionado a Mind Coach
- Mostrar campañas activas del ad account conectado

### 5. Mejoras al flujo de estados del SetterTracker
- Agregar distincion explicita entre "show" (asistio a la llamada) y las demas opciones
- Actualmente `completed` = show y `no_show` = no show. Verificar que el calculo de show rate sea: `completed / (completed + no_show)` excluyendo los que aun estan `scheduled`/`confirmed`
- El calculo actual ya lo hace correctamente (linea 89 del SetterTracker). No se requieren cambios de schema.

### 6. Cambios en `Ventas.tsx`
- Para Mind Coach: insertar `PipelineSummaryWidget` como primer widget (antes de SalesGoalBar)
- Insertar `SetterDailyCalendar` despues del summary
- Insertar `CampaignsTable`/`CampaignsDrilldown` en el pipeline
- El periodo seleccionado en el summary widget se propaga a los demas widgets para filtrar consistentemente

## Orden de implementacion

1. Migración DB (setter_daily_reports)
2. Hook `use-setter-daily-reports.ts`
3. Componente `SetterDailyCalendar`
4. Componente `PipelineSummaryWidget`
5. Integrar campañas Meta
6. Actualizar `Ventas.tsx` con layout condicional Mind Coach

## Archivos a crear
- `src/hooks/use-setter-daily-reports.ts`
- `src/components/ventas/SetterDailyCalendar.tsx`
- `src/components/ventas/PipelineSummaryWidget.tsx`

## Archivos a modificar
- `src/pages/Ventas.tsx` — layout condicional
- Migración SQL nueva

