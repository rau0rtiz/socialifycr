## Soporte multi-formulario para Instant Form (Google Sheets)

Hoy Comfortex tiene **una** hoja de Google conectada (`instant_form_lead_sources` con UNIQUE por `client_id`). Se puede agregar un segundo formulario sin romper nada: el sync ya deduplica por `spreadsheet_id + row` en `external_id`, y los widgets consultan `instant_form_leads` por `client_id` así que absorben automáticamente los leads del nuevo sheet.

### Cambios necesarios

**1. Base de datos**
- Quitar el UNIQUE `(client_id)` de `instant_form_lead_sources`.
- Agregar columna `label text` (ej: "Uniformes empresariales", "Polos"). Permite distinguir formularios en UI y filtros.
- Nuevo UNIQUE `(client_id, spreadsheet_id, sheet_name)` para evitar duplicar el mismo tab.
- Backfill: la fila existente recibe `label = 'Formulario principal'`.

**2. Edge function `sync-instant-form-leads`**
- Iterar **todas** las fuentes del cliente en lugar de asumir una (`.single()`). Cada una sincroniza su sheet independientemente y guarda su propio `last_synced_at` / `last_error`.
- `external_id` sigue incluyendo `spreadsheet_id` así que no hay colisiones entre hojas.

**3. UI `InstantFormSetup.tsx`**
- Convertir en lista: mostrar todas las fuentes del cliente con label, link al sheet, botón "Sincronizar" y "Eliminar" por cada una.
- Botón "Agregar formulario" abre un formulario para pegar URL + tab + label.
- Hook `useInstantFormSource` pasa a `useInstantFormSources` (array).

**4. Widgets — sin cambios funcionales requeridos**
- Todos leen `instant_form_leads` por `client_id`, por lo que suman leads de todas las hojas de forma automática.
- **Mejora opcional (misma iteración)**: agregar un selector "Formulario" en `InstantFormLeadsWidget` que filtre por `form_name` cuando hay más de un valor distinto en la data, para poder ver un formulario a la vez o el consolidado. Aplica el mismo filtro a los demás widgets Comfortex si el usuario lo desea (por ahora sólo se agrega al principal).

**5. Detalle del lead / CRM (`/mis-leads`, `ClientDatabase`, `LeadContactDetailDialog`)**
- Ya muestran `form_name` cuando existe. Con múltiples fuentes ese campo se poblará naturalmente desde el nombre del sheet / label del source cuando el sheet no traiga `form_name` propio (se agrega fallback en el sync: si la fila no trae `form_name`, usar `source.label`).

### Riesgos / consideraciones
- Ninguna migración destructiva de datos existentes.
- Historial de estados, ventas vinculadas, asignación de vendedor: siguen funcionando sin cambios (todo se apoya en `lead_id`, no en la fuente).
- Cuota de Google Sheets API: cada sync ahora hace N llamadas en vez de 1. Aceptable con pocas hojas.

### Archivos
- Migración nueva (ajustes en `instant_form_lead_sources`)
- `supabase/functions/sync-instant-form-leads/index.ts`
- `src/hooks/use-instant-form-leads.ts` (nuevo hook plural + mantener el singular como shim)
- `src/components/business-setup/InstantFormSetup.tsx`
- (Opcional) `src/components/dashboard/InstantFormLeadsWidget.tsx` para selector de formulario

### Pregunta
¿Incluyo en esta misma iteración el selector de "Formulario" en los widgets para poder verlos separados, o lo dejamos para después y por ahora todo se ve consolidado?
