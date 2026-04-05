

# Modernizar el calendario de fecha inicial de cobro

## Problema
Actualmente se usa un `<Input type="date">` nativo del navegador para la fecha inicial de cobro y las fechas de cuotas personalizadas. Se ve anticuado e inconsistente con el resto de la UI.

## Cambios

### `src/components/dashboard/RegisterSaleDialog.tsx`

1. **Fecha inicial de cobro** (línea ~567): Reemplazar el `<Input type="date">` por un **Popover + Calendar** (Shadcn DatePicker) con formato legible en español (`dd MMM yyyy`), botón con ícono de calendario, y `pointer-events-auto` en el Calendar.

2. **Fechas de cuotas personalizadas** (línea ~551): Reemplazar cada `<Input type="date">` por el mismo patrón de Popover + Calendar para mantener consistencia visual.

3. **Conversión de estado**: Adaptar `collectionStartDate` (actualmente string `YYYY-MM-DD`) y `customCollectionDates` (array de strings) para trabajar con objetos `Date` internamente, convirtiendo a string ISO solo al momento del submit.

### Resultado visual
- Botón estilizado con ícono de calendario y texto de fecha formateada
- Popover con el componente Calendar de Shadcn al hacer clic
- Consistente con el date picker usado en el filtro global de Ventas

