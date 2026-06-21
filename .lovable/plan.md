# Flujo de guardado para ideas + guion completo visible

## Problema

1. La cajita de **Guion / Copy** corta el texto: hay que hacer scroll dentro de un textarea chico para ver todo.
2. Una idea recién creada (manual o con IA) ya está "viva" — un clic accidental sobre el guion lo edita sin que haya un momento explícito de "confirmar".

## Solución

### 1. Estado `borrador` para piezas nuevas

Agregar columna `is_draft boolean default false` en `production_sheet_shots`.

- **"Nueva pieza"** crea la card en modo **Borrador**: badge ámbar "Borrador — pendiente de guardar", borde dashed, y el botón principal de la card pasa a ser **"Guardar idea"** (en vez de "Marcar grabado", que queda deshabilitado hasta guardar).
- Los inputs se editan normalmente (debounce ya existe), pero la pieza no aparece en la **Hoja del día** ni se puede mandar a ClickUp mientras esté en borrador.
- Al hacer clic en **Guardar idea**, `is_draft` pasa a `false` y la card entra en modo "lectura segura" (ver punto 2).

Para piezas generadas con IA: el dialog ya tiene su propio paso de revisión + Guardar, así que se insertan directamente como `is_draft = false` (ya fueron confirmadas en el dialog).

### 2. Modo lectura del guion (anti-edición accidental)

Una vez que la pieza dejó de ser borrador (o si ya estaba guardada), el campo **Guion / Copy** se renderiza como bloque de lectura:

- Texto completo visible (`whitespace-pre-wrap`, sin scroll interno, sin recorte) sobre fondo crema.
- Botón discreto **"Editar guion"** (icono lápiz) arriba a la derecha del bloque.
- Al hacer clic se transforma en `<Textarea>` con `autosize` (altura crece con el contenido) y aparecen **Guardar** / **Cancelar**.
- Mismo patrón para el campo **Concepto** (es el otro que duele si se edita sin querer).

Los demás campos (Hook, CTA, Notas técnicas) siguen como ahora — son cortos y de bajo riesgo.

### 3. Visibilidad completa también en lectura colapsada y Hoja del día

La Hoja del día ya muestra hook/cta/notas técnicas pero **no muestra el script**. Agregar el guion completo al resumen de cada pieza grabada (texto completo, sin truncar).

## Cambios técnicos

- **Migración**: `ALTER TABLE production_sheet_shots ADD COLUMN is_draft boolean NOT NULL DEFAULT false;`
- **`src/pages/ProduccionSheet.tsx`**:
  - `handleAddPiece`: insertar con `is_draft: true`.
  - `PieceCard`: nuevo prop/estado de borrador; reemplaza CTA "Marcar grabado" por "Guardar idea" cuando `is_draft`; agrega badge.
  - Modo lectura para Concepto y Guion con toggle de edición (`editing.script`, `editing.concept`). Componente auxiliar `<ReadEditField>` para no duplicar lógica.
  - Filtrar `recordedShots` y `pendingToSend` para excluir drafts.
  - Hoja del día: agregar bloque "Guion" con `s.script` cuando exista.
- **`GenerateShotsDialog`**: sin cambios funcionales (ya tiene revisión); el `onInsert` en `ProduccionSheet.tsx` pasa `is_draft: false`.
- **Vista pública (`/produccion-publica/...`)**: ocultar drafts y mostrar guion completo (alinear con Hoja del día).

## Fuera de alcance

- No se toca el flujo de IA (ya tiene preview + Guardar explícito).
- No se cambia el envío a ClickUp (sigue exigiendo `done=true`, ahora también `is_draft=false` implícito).
- No se agrega historial/versionado del guion.
