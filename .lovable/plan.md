
## 1. Auto-colapsar piezas al marcar "Grabado"

Hoy las tarjetas ya tienen modo colapsado cuando `shot.done = true`, pero como el estado `expanded` vive dentro del componente, al pulsar "Marcar grabado" la tarjeta se queda expandida hasta refrescar.

Cambios en `PieceCard` (`src/pages/ProduccionSheet.tsx`):
- Al pulsar **Marcar grabado** → colapsar inmediatamente (`setExpanded(false)`) además de hacer el toggle.
- Al pulsar **desmarcar** → expandir de nuevo.
- La tarjeta colapsada se queda con la fila compacta actual (número, tipo, plataforma, concepto, hora ✓), con un toque visual de "stack" para que se note que está plegada y se puede reabrir con el chevron.
- Mantener el filtro existente *Todas / Pendientes / Grabadas* sin cambios.

Resultado: al marcar grabado, la pieza se pliega sola y la lista deja de saturarse; el flujo natural queda *editar → grabar → siguiente*.

## 2. Versión optimizada para **tablet** (≈768–1024px)

Ajustes responsive en `ProduccionSheet.tsx` y en la grilla de carpetas/sheets de `Producciones.tsx`:

**Hoja de producción (tablet):**
- Claqueta header: título un paso más chico (`text-4xl`), grid de Fecha/Locación/Responsable en 3 columnas pero con tipografía más compacta.
- Barra superior sticky con: ← Volver · título corto · botón **+ Nueva pieza** siempre visible.
- Tarjetas de pieza: padding reducido (`p-4`), Hook y CTA en 2 columnas, Guion con `rows={4}`.
- Botón "Marcar grabado" más ancho y táctil (min-height 44px).
- "Hoja del día" en 2 columnas (resumen | piezas grabadas) para aprovechar el ancho.

**Listado de Producciones (tablet):**
- Carpetas de cliente en grid de 2 columnas con logo grande.
- Lista de sheets dentro de cada cliente: cards en 2 columnas.

## 3. Versión optimizada para **móvil** (<768px)

Rediseño específico, no solo "encoger":

**Hoja de producción (móvil):**
- Header claqueta compacto: título editable a `text-2xl`, Fecha/Locación/Responsable apilados en una sola columna, cada uno como fila tipo "ficha" (label arriba, input grande abajo, fácil de tocar).
- **Barra de acción fija en el bottom** (sticky bottom bar) con:
  - Progreso `recorded/total` + barra delgada.
  - Botón principal **+ Pieza**.
  - Acceso a **Enviar a ClickUp** e **Imprimir** vía menú "···".
- Filtros (Todas/Pend/Grab) como chips horizontales scrollables.
- Tarjeta de pieza en móvil:
  - Layout vertical, sin chips amontonados.
  - Selects de tipo y plataforma como botones grandes.
  - Concepto como input grande arriba.
  - Guion / Hook / CTA / Notas técnicas en **acordeones colapsables** (por defecto solo Concepto + Guion abiertos) para no abrumar.
  - Botón "Marcar grabado" full-width sticky al final de la tarjeta.
- "Hoja del día" en una sola columna; cada pieza grabada como fila simple (número + tipo + concepto + hora).

**Listado de Producciones (móvil):**
- Carpetas de cliente en 1 columna, logo grande arriba (foco visual).
- Dentro de cada cliente, sheets como lista vertical estilo "inbox" (título grande, fecha + #piezas + estado en una línea secundaria).
- FAB flotante **+ Nueva sheet** abajo a la derecha.

## Detalles técnicos

- Todo se resuelve con Tailwind responsive (`sm: md: lg:`) y un par de utilidades nuevas en `index.css` para la sticky bottom bar y los chips scroll.
- No cambia el esquema de datos ni los hooks (`use-production-sheets.ts`).
- No cambia la lógica de ClickUp ni el filtrado.
- Se respeta el tema NOEVAL (cream/ink/accent) ya definido.

## Archivos a tocar
- `src/pages/ProduccionSheet.tsx` — auto-colapso, layout tablet/móvil, acordeones de pieza, bottom bar móvil.
- `src/pages/Producciones.tsx` — grids responsive de carpetas y sheets, FAB móvil.
- `src/index.css` — utilidades menores (sticky bar móvil, chips horizontales, scrollbar oculta).

## Fuera de alcance
- No se cambia el flujo de envío a ClickUp.
- No se modifica el header del dashboard ni la navegación general.
- No se altera la tipografía/branding global.
