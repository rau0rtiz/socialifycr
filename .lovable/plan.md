## Problema

En `/ordenes` la "Meta Mensual" no refleja correctamente las ventas porque está calculando el total a mano sumando solo la tabla `orders` del mes:

```ts
const monthSalesCRC = orders
  .filter(o => o.status !== 'cancelled' && new Date(o.order_date) >= summaryRange.start)
  .reduce((s, o) => s + Number(o.total_amount || 0), 0);
```

Esto deja fuera dos fuentes que **sí** suman a la meta en `/ventas` (Alma Bendita):

1. **`message_sales`** que no provienen de órdenes (ventas registradas manualmente, ventas viejas, ventas de historias generadas por el `StoryRevenueTracker`, etc.). El `useSalesTracking` ya las consolida.
2. **`override_revenue`** del `daily_story_tracker` (ajustes manuales del tracker de historias) — la regla [Alma Bendita Goals] exige que se sumen a la meta.

Resultado: la barra de meta en `/ordenes` se queda corta vs. la de `/ventas`, y al registrar una venta nueva (vía Wizard de orden) la meta no salta como debería si la suma del mes ya incluye otras fuentes.

## Cambio propuesto

Reutilizar exactamente la misma lógica que `/ventas` para alimentar la barra de meta en `/ordenes`.

### Archivo: `src/pages/Ordenes.tsx`

1. Eliminar el cálculo manual `monthSalesCRC` basado en `orders`.
2. Usar el `summary` que ya devuelve `useSalesTracking(clientId)` (sin rango → mes actual, igual que en Ventas.tsx).
3. Para Alma Bendita, agregar el `storyOverrideCRC` del hook `useDailyStoryTracker` (solo `override_revenue`, los auto ya están en `summary.totalCRC`).
4. Pasar a `<SalesGoalBar />`:
   - `currentSalesUSD={summary.totalUSD}`
   - `currentSalesCRC={summary.totalCRC + (isAlmaBendita ? storyOverrideCRC : 0)}`

### Detalles técnicos

- Importar `useDailyStoryTracker` desde `@/hooks/use-daily-story-tracker` (mismo hook que ya usa Ventas).
- Llamar `useSalesTracking(clientId)` **sin rango** para obtener el `summary` mensual estándar (mantener el `useSalesTracking(clientId, summaryRange)` existente para los charts del tab "Resumen" si se sigue usando, o reutilizar el mismo según sea más limpio).
- No tocar `SalesGoalBar.tsx` ni la lógica del tab "Órdenes" (KPIs internos siguen usando `orders`).
- No cambiar nada en `/ventas`.

## Resultado esperado

La barra de meta en `/ordenes` queda sincronizada 1:1 con la de `/ventas` para Alma Bendita (y demás clientes), incluyendo ventas manuales y ajustes del story tracker. Al crear una orden nueva, el trigger `create_sale_from_order_item` inserta en `message_sales` → `useSalesTracking` la captura → la meta sube en tiempo real.