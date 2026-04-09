

## Rediseño: Tendencia últimos 30 días (Historias vs Ventas)

### Problema actual
El gráfico actual usa barras + línea con dos ejes Y independientes, lo que dificulta comparar visualmente la relación entre cantidad de historias y ventas generadas. Las escalas son muy diferentes (ej. 5 historias vs ₡300,000) y no comunican bien la correlación.

### Propuesta recomendada: Area Chart + KPI Summary Cards

La mejor manera de visualizar esta relación es combinar **3 elementos**:

1. **Mini KPI cards** en la parte superior del widget con:
   - **Total Historias** (últimos 30d)
   - **Total Ventas** (últimos 30d)  
   - **₡ por Historia** (ratio promedio = ventas / historias)
   - **Mejor día** (día con más ventas)

2. **Area chart con doble eje** reemplazando barras + línea:
   - Área semitransparente primaria para historias (eje izquierdo)
   - Área semitransparente verde para ventas (eje derecho)
   - Ambas áreas con gradiente hacia abajo para mejor lectura visual
   - Tooltip unificado mostrando ambos valores + el ratio de ese día

3. **Leyenda mejorada** con valores totales integrados (ej. "Historias: 142 total" / "Ventas: ₡4.8M total")

### Cambios técnicos

**Archivo**: `src/pages/Ventas.tsx` (sección Alma Bendita, líneas ~344-394)

- Reemplazar el `ComposedChart` con `Bar + Line` por un `AreaChart` con dos `<Area>` (gradientes)
- Agregar `<defs>` con `<linearGradient>` para el fill de cada área
- Calcular KPIs derivados: total historias, total ventas, ratio ₡/historia, mejor día
- Agregar 4 mini cards (grid 2x2 en móvil, 4 cols en desktop) arriba del chart
- Tooltip personalizado mostrando fecha, historias, ventas y ratio
- Hacer el chart un poco más alto (h-[250px]) para mejor legibilidad

No se requieren cambios en base de datos ni en hooks, todo es presentación.

