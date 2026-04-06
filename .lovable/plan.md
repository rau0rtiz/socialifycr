

# Actualizar PipelineSummaryWidget con labels en español

## Problema
El `PipelineSummaryWidget` (usado para The Mind Coach) todavía tiene "Cash Collected" en inglés (línea 209) y "pendiente" en el subtexto. Esto no fue actualizado cuando se cambió el `SpeakUpSalesSummary`.

## Cambios

**Archivo: `src/components/ventas/PipelineSummaryWidget.tsx`**

1. Cambiar `label: 'Cash Collected'` → `label: 'Ingresos'` (línea 209) para ser consistente con la terminología actualizada
2. Cambiar `pendingSub` para usar "Por cobrar" en vez de "pendiente" (líneas 103-106):
   - `$X pendiente` → `$X por cobrar`
   - `Todo cobrado` se mantiene igual
3. Cambiar `label: 'Show Rate'` → `label: 'Tasa Asistencia'` (línea 175)
4. Cambiar `label: 'Close Rate'` → `label: 'Tasa Cierre'` (línea 200)
5. Cambiar `label: 'No Show'` → `label: 'No asistió'` (línea 184)

Esto pone todo el widget en español consistente con el resto de la plataforma.

