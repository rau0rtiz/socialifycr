

## Plan: Métricas KPI para la vista de leads del funnel

### Resumen
Agregar una fila de tarjetas métricas compactas en la parte superior de la vista drill-down de leads (dentro de `AgencyLeadsContent.tsx`), justo después del header y antes de los filtros de búsqueda.

### Métricas a mostrar (4 tarjetas)
1. **Total Leads** — cantidad total de leads del funnel seleccionado
2. **Últimos 7 días** — leads nuevos en la última semana, con % de cambio vs semana anterior
3. **Tasa Calendly** — porcentaje de leads que hicieron clic en Calendly (conversión)
4. **Distribución por nivel** — mini barras horizontales mostrando la proporción por nivel (1-6)

### Cambios

**`src/components/comunicaciones/AgencyLeadsContent.tsx`**
- Calcular las métricas derivadas del array `leads` ya cargado (sin queries adicionales):
  - `totalLeads`, `last7d`, `last14dTo7d` (para delta %), `calendlyRate`, conteo por nivel
- Insertar un grid `grid-cols-2 sm:grid-cols-4` de mini-cards entre el header (back + título) y los filtros de búsqueda
- Cada card usa el mismo estilo compacto del `PipelineSummaryWidget`: icono con fondo coloreado, valor grande, subtítulo pequeño
- La card de distribución por nivel muestra mini barras de colores proporcionales usando los `levelColors` existentes

### Detalle técnico
- Todo se calcula client-side a partir de `leads` (ya está en memoria)
- Se usan `date-fns` `isAfter`/`subDays` para filtrar por ventana temporal
- No requiere migración SQL ni nuevas queries
- Solo se modifica un archivo

