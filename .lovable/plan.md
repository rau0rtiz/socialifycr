# Widget de Lanzamiento Diario — Roberto Olivas

Nuevo widget en el Dashboard principal (solo visible para Roberto Olivas) que combina datos automáticos de Meta con inputs manuales, **guarda cada reporte diario**, genera el mensaje copiable con un click y muestra **gráficos histórico día a día** para visualizar el resultado del lanzamiento.

## UI del widget

Una tarjeta con tres secciones:

### 1. Reporte del día (editor)
- **Selector de fecha** (default: hoy, zona Costa Rica)
- **Selector de campaña** (dropdown de campañas activas de Meta — la campaña de lanzamiento)
- **Datos automáticos de Meta** (según fecha + campaña seleccionada):
  - Inversión del día (spend)
  - Conversaciones (`messaging_conversations_started`)
  - Costo por conversación
- **Inputs manuales**:
  - Ingresos al grupo (#)
  - CTR Manychat (%)
- **Calculado**: Costo por ingreso = inversión / ingresos, con badge ✅ "bajó" o ⚠️ "subió" vs día anterior
- **Botón "Guardar"** → upsert en BD
- **Botón "Copiar reporte"** → copia al portapapeles:

```text
📊 Reporte Lunes 18 de Mayo

Ingresos al grupo: 52 personas

💰 Inversión del día: $865.08
Costo por conversación: $5.12 (169 conversaciones)
Costo por ingreso: $16.63 ✅ (bajó vs domingo)
📲 CTR Manychat: 44.5%
```

### 2. Visualización histórica del lanzamiento
Gráficos día a día (Recharts) con todos los reportes guardados ordenados por fecha:

- **Gráfico combinado** (barras + línea):
  - Barras: Ingresos al grupo por día
  - Línea: Costo por ingreso por día
- **Gráfico de área**: Inversión diaria acumulada
- **Gráfico de línea**: CTR Manychat y Costo por conversación (eje doble)
- **Selector de rango**: últimos 7 días / 14 / 30 / todo el lanzamiento
- **KPIs totales arriba de los gráficos**: Inversión total, Ingresos totales, Costo por ingreso promedio, Mejor día (menor costo por ingreso)

### 3. Tabla histórica (colapsable)
Lista de todos los reportes con: fecha, campaña, inversión, conversaciones, ingresos, costo/ingreso, CTR. Botón editar por fila (carga ese reporte en el editor de arriba).

## Persistencia

Nueva tabla `launch_daily_reports`:
- `id`, `client_id`, `report_date` (date)
- UNIQUE (`client_id`, `report_date`) → upsert por fecha
- `campaign_id` (text, Meta campaign id)
- `campaign_name` (text, snapshot)
- `manychat_ctr` (numeric, %)
- `group_signups` (int)
- Snapshot al guardar: `spend_snapshot` (numeric), `conversations_snapshot` (int), `currency` (text)
- `notes` (text, opcional)
- `created_by`, `created_at`, `updated_at`
- RLS: SELECT/INSERT/UPDATE/DELETE vía `has_client_access(auth.uid(), client_id)`
- Trigger `updated_at`
- Índice en (`client_id`, `report_date` DESC)

Guardar snapshots de spend/conversaciones permite que el histórico siga siendo fiel aunque Meta deje de devolver insights viejos o cambie la campaña.

## Visibilidad

- Render condicionado a `selectedClient.name` que contenga "roberto olivas" (patrón ya usado en `Ventas.tsx`).
- Feature flag `launch_report` (default `true`) en `client_feature_flags`.

## Detalles técnicos

**Backend**
- Migración: tabla `launch_daily_reports` con RLS + trigger `updated_at`, y columna `launch_report boolean default true` en `client_feature_flags`.

**Meta**
- Reutilizar endpoint `campaigns` de `meta-api` con `params.since`/`params.until` = la fecha seleccionada (rango de un día — ya soportado).
- Extraer del primer `insights.data[0]`:
  - `spend` → inversión
  - `actions.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d' || a.action_type === 'messaging_conversation_started_7d')` → conversaciones
  - `currency` de la respuesta.

**Frontend**
- `src/hooks/use-launch-reports.ts`:
  - `useLaunchReports(clientId)` → lista completa para gráficos/tabla.
  - `useLaunchReportByDate(clientId, date)` → reporte de una fecha (para el editor).
  - `useLaunchCampaignInsights(clientId, connectionId, campaignId, date)` → trae spend/conversations de Meta.
  - `useUpsertLaunchReport()` → mutación upsert por (`client_id`, `report_date`).
- `src/lib/format-launch-report.ts` → helper puro que arma el string del mensaje (con `date-fns` locale `es`).
- `src/components/dashboard/LaunchReportWidget.tsx` → editor + KPIs + tabla.
- `src/components/dashboard/LaunchReportCharts.tsx` → gráficos Recharts.
- `src/pages/Dashboard.tsx`: render condicional `{isRobertoOlivas && flags.launch_report && <LaunchReportWidget clientId={...} />}`.
- `src/hooks/use-client-features.ts`: agregar `launch_report` a `BOOLEAN_FLAG_KEYS` y a `DASHBOARD_WIDGET_LABELS`.

## Archivos a crear / editar

- `supabase/migrations/<timestamp>_launch_daily_reports.sql` (nuevo)
- `src/hooks/use-launch-reports.ts` (nuevo)
- `src/lib/format-launch-report.ts` (nuevo)
- `src/components/dashboard/LaunchReportWidget.tsx` (nuevo)
- `src/components/dashboard/LaunchReportCharts.tsx` (nuevo)
- `src/pages/Dashboard.tsx` (renderizar widget)
- `src/hooks/use-client-features.ts` (registrar flag `launch_report`)
