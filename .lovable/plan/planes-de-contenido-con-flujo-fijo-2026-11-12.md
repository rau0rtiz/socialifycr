# Planes de contenido con flujo fijo

## Qué cambia
Los planes de contenido en Documentación dejan de ser solo HTML pegado. Al crear uno nuevo se abre un formulario fijo que llenamos nosotros (sin IA):

1. **Datos generales**: cliente, título, fecha de producción, descripción general.
2. **Cantidad de piezas**: se escribe el número y se crean esas tarjetas (se pueden agregar, quitar y reordenar después).
3. **Cada pieza**:
   - Título y descripción del video
   - Etiqueta de uso: Anuncio / Orgánico / Ambos
   - Etiqueta de objetivo: Venta / Tráfico (y se pueden agregar etiquetas propias)
   - Tipo (reel, foto, carrusel, story…), guion/notas y referencias opcionales
4. **To-do list**: lista de tareas con casilla, agregar/quitar/renombrar libremente (general del plan y opcional por pieza).
5. **HTML opcional**: un bloque extra para pegar HTML cuando se quiera algo especial; se muestra al final del plan.

## Vista pública (/plan/...)
El link compartible (ej. Santorini) muestra el plan con un diseño único y consistente: encabezado del cliente, resumen con conteo por etiqueta (cuántos anuncios, orgánicos, venta, tráfico), tarjetas de cada pieza con sus etiquetas de color y la to-do list (solo lectura para el cliente).

## Planes existentes
Los planes viejos en HTML siguen funcionando igual. Se pueden seguir editando como HTML; los nuevos usan el formulario.

## Detalles técnicos
- Nueva columna `structured_content jsonb` en `agency_proposals` (piezas, etiquetas, to-dos, html extra). Si existe, la ruta pública renderiza el componente estructurado; si no, el `html_content` actual.
- `get_published_proposal_by_slug` se amplía para devolver `structured_content`.
- Editor nuevo `ContentPlanEditor` dentro de Documentación para `kind = content_plan`; plantilla reutilizable.
- Filtros de Documentación sin cambios.
