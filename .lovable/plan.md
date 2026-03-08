

## Plan: Reportes Más Visuales y Atractivos

Gamma.app no tiene API pública, pero podemos lograr un resultado igual de visual usando **recharts** (ya instalado) y mejores patrones de diseño. Los reportes actuales son mayormente texto y números planos. La mejora los convierte en dashboards visuales con gráficos, gradientes, iconos animados y mejor jerarquía visual.

---

### Cambios en MonthlySalesReport.tsx

1. **KPI cards con iconos grandes y gradientes** -- Reemplazar las cards planas por cards con fondo gradiente sutil, icono circular grande, y el indicador de cambio más prominente con una flecha animada
2. **Gráfico de dona (PieChart)** para el desglose por fuente -- Reemplazar las barras de progreso con un `PieChart` de recharts con colores por fuente y leyenda lateral
3. **Gráfico de barras de ventas diarias** -- Agregar un `BarChart` que muestre la distribución de ventas por día del mes (agrupando `sale_date`), dando contexto temporal
4. **Tabla estilizada de ventas recientes** -- Mostrar las últimas 5 ventas del mes con avatar/iniciales del cliente, producto, monto y badge de fuente

### Cambios en SocialPerformanceReport.tsx

1. **Cards de plataforma más grandes con gráfico sparkline** -- Las cards de seguidores actuales son pequeñas. Hacerlas más grandes con el gradiente completo de fondo, número grande centrado, e icono flotante
2. **Gráfico de barras horizontales para métricas de contenido** -- Reemplazar la grilla de números por un `BarChart` horizontal comparando vistas, likes, comentarios y compartidos visualmente
3. **Indicadores de tipo "gauge" o radial** para promedios -- Usar `RadialBarChart` de recharts para mostrar promedio de vistas y likes como indicadores circulares

### Cambios en Reportes.tsx (página contenedora)

1. **Header más visual** -- Agregar un banner sutil con gradiente y un icono grande en el título de la página
2. **Tabs con iconos más prominentes y badges de conteo** -- Mostrar un badge con el número de ventas o posts al lado de cada tab

---

### Resumen técnico

| Archivo | Qué cambia |
|---------|-----------|
| `MonthlySalesReport.tsx` | KPI cards con gradiente, PieChart por fuente, BarChart ventas diarias, tabla de recientes |
| `SocialPerformanceReport.tsx` | Cards grandes con gradiente, BarChart horizontal de métricas, RadialBarChart para promedios |
| `Reportes.tsx` | Header visual con gradiente, tabs con badges |

No se necesitan cambios de base de datos ni nuevas dependencias -- todo usa recharts (ya instalado) y Tailwind CSS.

