## Filtro por fechas en selección de historias (OrderWizardDialog)

Agregar un filtro de rango de fechas en el paso "Seleccionar historias" del wizard de órdenes para encontrar historias archivadas más rápido.

### Cambios

**`src/components/ventas/orders/OrderWizardDialog.tsx`**

1. Nuevos estados: `storyDateFrom` y `storyDateTo` (strings `YYYY-MM-DD`).
2. Junto al input de búsqueda actual, agregar dos inputs `type="date"` compactos (Desde / Hasta) y un botón "Limpiar fechas".
3. Extender el filtrado existente (líneas ~349-356): además del query de texto, aplicar filtro por `s.timestamp` dentro del rango (inclusive). Si solo `Desde` está, filtrar `>=`; si solo `Hasta`, filtrar `<=`.
4. Si se selecciona un rango y `storyShowAll` está apagado, activarlo automáticamente (o mostrar un hint "Carga todas las archivadas para buscar más atrás") para que el filtro funcione sobre el archivo completo.
5. Mantener el contador "Activas / Archivadas / Resultados" reflejando el filtro combinado.

### Fuera de alcance

- No tocar `useStories` ni el backend.
- No cambiar otros widgets ni estilos globales (solo UI del paso de historias).