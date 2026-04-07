

# Mejoras de Ventas para Speak Up

## Resumen
Agregar 5 mejoras al dashboard de ventas de Speak Up: tasa de retención, MRR, estudiantes activos vs nuevos, gráfico de tendencia mensual y alertas de cobros vencidos. Todo se calcula client-side a partir de datos existentes en `message_sales` y `payment_collections` — no requiere cambios de base de datos.

## Cambios

### 1. Nuevo componente: `SpeakUpAnalytics.tsx`
Componente dedicado que se renderiza solo para Speak Up, debajo del `SpeakUpSalesSummary`. Contiene:

**Fila de KPIs adicionales (3 cards):**
- **Tasa de Retención**: Compara estudiantes del mes actual vs mes anterior (nombres que aparecen en ambos meses / total mes anterior × 100). Requiere una query adicional al mes anterior en `message_sales`.
- **MRR (Ingreso Recurrente)**: Suma de `payment_collections` pendientes del mes actual (cobros con status pending cuya `due_date` cae en el mes).
- **Activos vs Nuevos**: Badge que muestra "X activos · Y nuevos". Activos = nombres repetidos del mes anterior; Nuevos = nombres que no existían el mes pasado.

**Gráfico de tendencia mensual (últimos 6 meses):**
- Recharts `BarChart` con dos barras: Ingresos (amount sumado) y Estudiantes (count de nombres únicos).
- Query: una sola consulta a `message_sales` de los últimos 6 meses, agrupada client-side por mes.

**Alertas de cobros vencidos:**
- Card con badge rojo mostrando cantidad de cobros vencidos (`due_date < hoy` y `status = 'pending'`).
- Lista de los primeros 5 cobros vencidos con nombre del estudiante, monto y días de atraso.
- Usa datos del hook `usePaymentCollections` existente, filtrado por `isPast(due_date)`.

### 2. Hook: `use-speakup-analytics.ts`
- Hace una query a `message_sales` de los últimos 6 meses para el cliente.
- Calcula: retención, MRR, activos vs nuevos, y datos de tendencia mensual.
- Reutiliza `usePaymentCollections` para cobros vencidos.

### 3. Integración en `Ventas.tsx`
- Importar `SpeakUpAnalytics` y renderizarlo debajo de `SpeakUpSalesSummary` cuando `isSpkUp` es true.

### Archivos a crear
- `src/hooks/use-speakup-analytics.ts`
- `src/components/ventas/SpeakUpAnalytics.tsx`

### Archivos a modificar
- `src/pages/Ventas.tsx` — agregar render condicional del nuevo componente

## Detalle técnico

**Query de 6 meses** (en el hook):
```typescript
supabase.from('message_sales')
  .select('sale_date, amount, currency, customer_name, status')
  .eq('client_id', clientId)
  .gte('sale_date', sixMonthsAgo)
  .neq('status', 'cancelled')
```

**Retención**: `(estudiantes en ambos meses / estudiantes mes anterior) × 100`

**MRR**: Filtrar `payment_collections` donde `due_date` está en el mes actual y `status = 'pending'`, sumar amounts.

**Gráfico**: Recharts `BarChart` agrupado por `YYYY-MM`, con eje izquierdo para ingresos y eje derecho para estudiantes.

