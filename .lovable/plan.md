## Objetivo
1. Convertir el editor de sheet en **página completa** (`/agencia/producciones/:sheetId`) en vez de drawer lateral — foco total en la hoja del día.
2. Rediseñar el contenido como **tablero de piezas de contenido** (idea, guion, hook, CTA), marcar grabadas, enviar solo grabadas a ClickUp como tasks individuales, y dejar registro del día.

---

## 1. Editor como página completa

### Routing
- Nueva ruta: `/agencia/producciones/:sheetId` en `App.tsx`.
- Nuevo archivo: `src/pages/ProduccionSheet.tsx` (extrae el componente `SheetEditor` actual de `Producciones.tsx`).
- En la vista drive, click en una sheet → `navigate(/agencia/producciones/:id)` en vez de abrir drawer.
- Botón "← Volver a Producciones" arriba a la izquierda.
- Breadcrumb: `Producciones › <Cliente> › <Carpeta?> › <Título sheet>`.

### Layout de página
- Ancho cómodo (`max-w-5xl mx-auto`) con padding generoso, fondo papel crema (token existente).
- Header claqueta sticky arriba (título, fecha, locación, responsable, progress).
- Cuerpo: tablero de piezas con cards anchas y legibles.
- Footer: hoja del día + acciones (imprimir, enviar a ClickUp, borrar).

Eliminar del `Producciones.tsx` la lógica de drawer/sheet abierto inline.

---

## 2. Tablero de Piezas de Contenido

### Schema (migración)
`ALTER TABLE production_sheet_shots ADD COLUMN`:
- `content_type text` — reel | story | post | tiktok | short | otro
- `platform text` — instagram | tiktok | youtube | linkedin | multi
- `concept text` — idea principal
- `script text` — guion / copy
- `hook text` — gancho inicial
- `cta text` — llamada a la acción
- `tech_notes text` — cámara / locación / wardrobe específico
- `recorded_at timestamptz` — cuándo se marcó grabado
- `clickup_task_id text`, `clickup_url text`, `sent_to_clickup_at timestamptz`

Campos existentes (`description`, `shot_type`, `done`, etc.) se conservan por compatibilidad.

### UI del tablero (en la nueva página)

```text
[+ Nueva pieza]      Filtros: [Todas] [Pendientes] [Grabadas]

┌─ PIEZA #01 · 🎬 REEL · Instagram         [● Pendiente] ─┐
│                                                          │
│  Concepto:  ____________________________________         │
│                                                          │
│  📝 Guion / Copy                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ (textarea grande, expandible)                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ⚡ Hook:  ________________                              │
│  🎯 CTA:   ________________                              │
│  🎥 Notas técnicas: ______________________               │
│                                                          │
│         [✓ Marcar grabado]  [Duplicar]  [Borrar]         │
└──────────────────────────────────────────────────────────┘

┌─ PIEZA #02 · 📱 STORY        [✓ GRABADO · 14:32] ───────┐ (colapsada, stamp diagonal)
│  "Testimonio de María sobre el curso"                    │
└──────────────────────────────────────────────────────────┘
```

- Tarjetas pendientes: expandidas, todos los campos editables inline con autoguardado debounced (800ms).
- Tarjetas grabadas: colapsadas, stamp "GRABADO" diagonal, hora visible, click expande.
- Chips de `content_type` y `platform` con colores semánticos.
- Botones: "Marcar grabado" → setea `done=true` + `recorded_at=now()`. "Desmarcar" disponible.
- Progress header: "X grabadas / Y piezas".

### Eliminar del editor
- Sección `team` (se reduce a "Responsable" en header).
- Sección `wardrobe` (se absorbe en "Notas técnicas" por pieza).
- Tablas DB se mantienen por compat.

---

## 3. Hoja del Día (registro)

Sección al final de la página, autogenerada read-only:
- Fecha, locación, responsable.
- Lista de piezas **grabadas** con hora, tipo/plataforma, concepto, hook.
- Notas generales del día (textarea editable arriba de esto).
- Botón **"Imprimir / PDF"** — vista print-optimized solo con grabadas.

Pendientes no aparecen en el resumen ni el PDF (quedan como backlog).

---

## 4. ClickUp: una task por pieza grabada

Modificar `supabase/functions/clickup-create-tasks/index.ts`:
- Iterar `production_sheet_shots` con `done=true` y `clickup_task_id IS NULL` (o re-PUT si ya existe).
- Por pieza, crear task en `cfg.list_id`:
  - **Title**: `[REEL · IG] <concepto>`
  - **Description** (markdown): Hook · CTA · Guion · Notas técnicas · Fecha grabación · Locación · Responsable
  - **Assignees**: `default_assignee_emails` del cliente
  - **Sin parent** — cada pieza independiente
- Guarda `clickup_task_id` + `clickup_url` por pieza.
- Sheet `status` → `sent_to_clickup` cuando todas las grabadas están enviadas.

UI: botón "Enviar grabadas a ClickUp" con contador "X listas / Y ya enviadas". Cada pieza grabada muestra link a su task ClickUp.

---

## Archivos
- **Migración**: `ALTER TABLE production_sheet_shots ADD COLUMN ...`
- **Nuevo**: `src/pages/ProduccionSheet.tsx` (página editor completo)
- **Editar**: `src/App.tsx` (ruta), `src/pages/Producciones.tsx` (quitar drawer, navegar a página), `src/hooks/use-production-sheets.ts` (tipo `SheetShot` extendido), `src/index.css` (chips plataforma, card grabada, print), `supabase/functions/clickup-create-tasks/index.ts` (lógica por pieza).

## Fuera de scope
- Drag-and-drop para reordenar piezas.
- Plantillas precargadas (ej. "reel testimonial").
- Adjuntar referencias visuales por pieza.