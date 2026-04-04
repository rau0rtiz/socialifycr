

# Rediseño: Calendario Premium con Tooltips para Reporte Diario del Setter

## Resumen

Rediseñar el `SetterDailyCalendar` manteniendo el calendario pero elevando significativamente la estética: celdas más grandes con mini indicadores visuales dentro de cada día, tooltips con resumen al hover, y panel lateral con sparklines de tendencia semanal.

## Cambios en `SetterDailyCalendar.tsx`

### Calendario mejorado
- Celdas con mayor padding y bordes redondeados suaves
- Dentro de cada día reportado: 4 mini dots/barras de color representando cada métrica (IG rosa, WA verde, seguimientos azul, agendas púrpura) con tamaño proporcional al valor
- Días sin reporte: sutil indicador de punto rojo en esquina, sin el fondo rojo agresivo actual
- Día actual: borde con gradiente sutil usando el color primario del cliente
- Hover en cualquier día reportado muestra un `HoverCard` (ya existe en UI) con:
  - Fecha formateada
  - Las 4 métricas con iconos y valores
  - Nota del día (si existe) truncada

### Panel lateral rediseñado
- Título del mes con tipografía más grande y capitalizada
- Las 4 tarjetas de resumen con fondo de gradiente sutil por color (rosa, verde, azul, púrpura)
- Agregar sparklines (mini gráficos de 7 puntos) debajo de cada métrica mostrando tendencia de las últimas 4 semanas
- Indicador de "racha" (streak): cuántos días consecutivos se ha reportado
- Barra de progreso circular o lineal mostrando % de días reportados del mes
- Leyenda más elegante con dots en vez de badges

### Dialog de edición
- Inputs con bordes de color por métrica (borde izquierdo coloreado)
- Layout más espacioso con separadores sutiles
- Animación suave al abrir

## Archivos a modificar
- `src/components/ventas/SetterDailyCalendar.tsx` — rediseño completo del componente

## Detalle técnico
- Usar `HoverCard` de shadcn para tooltips (ya disponible en el proyecto)
- Sparklines con SVG inline (path simple, sin librería adicional)
- Calcular streak y % reportado desde los datos existentes de `reports`
- Mantener toda la lógica de negocio y hook `useSetterDailyReports` sin cambios

