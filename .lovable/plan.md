

# Analisis del Pipeline: Incongruencias, Optimizaciones y Recomendaciones

## Incongruencias encontradas

### 1. Race condition al vincular venta con lead (CRITICO)
**Archivo:** `Ventas.tsx` lineas 156-164, `SalesTrackingSection.tsx` lineas 148-155

Cuando se convierte un lead a venta, el sistema busca el `sale_id` haciendo un query por "la venta mas reciente" (`order created_at desc, limit 1`). Esto se hace en DOS lugares distintos (Ventas.tsx y SalesTrackingSection.tsx). Si dos usuarios registran ventas simultaneamente, el link puede apuntar a la venta incorrecta.

**Fix:** Hacer que `addSale` retorne el ID de la venta insertada usando `.select('id').single()` y pasarlo directamente, eliminando el query secundario.

### 2. Sync bidireccional lead_phone → message_platform (BUG)
**Archivo:** `use-setter-appointments.ts` linea 190

Al sincronizar datos del lead a la venta, el telefono del lead (`lead_phone`) se mapea a `message_platform` en la venta, lo cual es semanticamente incorrecto. `message_platform` deberia ser "whatsapp", "instagram_dm", etc., no un numero de telefono.

**Fix:** Eliminar esa linea de sync o mapearlo a un campo correcto (posiblemente `notes`).

### 3. Fuentes inconsistentes entre Lead y Venta
**Archivos:** `LeadDetailDialog.tsx`, `RegisterSaleDialog.tsx`

Los leads usan `source: 'ads' | 'organic' | 'referral' | 'followup' | 'other'` pero las ventas usan `source: 'ad' | 'story' | 'referral' | 'organic' | 'other'`. El valor `'ads'` del lead se mapea a `'ad'` en la venta, pero `'followup'` y `'story'` no tienen equivalente cruzado.

**Fix:** Normalizar los valores o agregar un mapeo explicito en `handleConvertToSale`.

### 4. El query de sales-tracking no se invalida correctamente
**Archivo:** `use-payment-collections.ts` linea 224

Cuando se marca un cobro como pagado, se invalida `['sales-tracking']` pero la query key real de ventas es `['message-sales', clientId, ...]`. La invalidacion nunca matchea.

**Fix:** Cambiar a `queryClient.invalidateQueries({ queryKey: ['message-sales'] })`.

### 5. PipelineSummaryWidget filtra ventas por fecha, SalesTracking filtra por mes
El resumen del pipeline usa el `dateRange` global (que puede ser "hoy", "esta semana", etc.), pero SalesTrackingSection siempre filtra por mes calendario completo con su propio navegador de meses. Los numeros nunca coinciden.

**Recomendacion:** Documentar que son vistas diferentes, o hacer que SalesTrackingSection tambien respete el rango global.

### 6. Stats duplicadas en SetterTracker y PipelineSummaryWidget
Ambos componentes calculan Show Rate, Close Rate, No Shows y conteos de ventas de forma independiente. Si la logica cambia en uno, no se actualiza en el otro.

**Recomendacion:** Extraer los calculos a un hook compartido `use-pipeline-stats.ts`.

### 7. Eliminacion de venta no limpia cobros ni desvincula lead
**Archivo:** `SalesTrackingSection.tsx` linea 206-211

Al eliminar una venta, no se eliminan las `payment_collections` asociadas ni se limpia el `sale_id` del `setter_appointment` vinculado. Quedan cobros huerfanos y leads marcados como "sold" apuntando a una venta inexistente.

**Fix:** En el `deleteSale` mutation, agregar logica para limpiar cobros y desvincular el appointment.

### 8. `as any` pervasivo
Multiples archivos usan `as any` para tipos de Supabase, lo que anula la seguridad de tipos y puede ocultar errores reales.

---

## Optimizaciones recomendadas

### A. Hook centralizado para pipeline stats
Crear `use-pipeline-stats.ts` que reciba appointments, sales y campaigns y retorne todos los KPIs calculados (show rate, close rate, cash collected, etc.). Usar desde PipelineSummaryWidget y SetterTracker.

### B. Sale mutation con return de ID
Modificar `addSale` en `use-sales-tracking.ts` para usar `.insert(...).select('id').single()` y retornar el ID directamente. Eliminar los queries "fetch latest sale" en Ventas.tsx y SalesTrackingSection.tsx.

### C. Cascade delete de venta
En `deleteSale`, antes de eliminar la venta: (1) eliminar `payment_collections` con ese `sale_id`, (2) actualizar `setter_appointments` con ese `sale_id` para limpiar `sale_id` y resetear status a `completed`.

### D. Fix invalidacion de query keys
Cambiar `['sales-tracking']` a `['message-sales']` en `use-payment-collections.ts`.

### E. Fix sync lead_phone
Eliminar la linea 190 de `use-setter-appointments.ts` que mapea `lead_phone` a `message_platform`.

---

## Plan de implementacion

1. **`use-sales-tracking.ts`** — Hacer que `addSale` retorne el ID insertado; en `deleteSale` agregar limpieza de cobros y desvinculacion del lead
2. **`use-payment-collections.ts`** — Corregir query key de invalidacion a `['message-sales']`
3. **`use-setter-appointments.ts`** — Eliminar sync erroneo de `lead_phone` a `message_platform`
4. **`Ventas.tsx`** y **`SalesTrackingSection.tsx`** — Usar el ID retornado por `addSale` en vez de buscar "la venta mas reciente"
5. **`Ventas.tsx` → `handleConvertToSale`** — Agregar mapeo explicito de source `'ads'` → `'ad'`

