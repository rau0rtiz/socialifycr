## Nuevo estado de lead: "Visita a la tienda"

Agrego un sexto estado al pipeline de leads (`instant_form_leads`) que permite además agendar fecha y hora de la visita. La info queda guardada en el propio lead y visible en todas las vistas donde ya aparece el estado.

### 1. Base de datos (migración)
- Agregar en `instant_form_leads`:
  - `store_visit_at TIMESTAMPTZ NULL` — fecha/hora agendada
  - `store_visit_notes TEXT NULL` — nota corta opcional (dirección alternativa, quién lo atenderá, etc.)
- El campo `lead_status` es `TEXT` libre, así que no requiere alterar constraints. Solo se amplía el conjunto de valores válidos que la UI acepta a: `new | contactado | seguimiento | visita_tienda | venta | perdido`.

### 2. Token visual y helpers
- Agregar variable CSS `--status-visita` (teal/cyan, distinto de los demás) en `src/index.css`, tanto en tema claro como oscuro.
- Extender la lista `allowed` y el diccionario `counts` en `use-seller-leads.ts` con `visita_tienda`.
- Extender `InstantFormLeadStatus` en `use-instant-form-leads.ts` con `'visita_tienda'`.

### 3. UI del selector con agendado
- En `SellerLeadDetailDialog.tsx`:
  - Añadir opción "Visita a la tienda" al `STATUS_OPTIONS`.
  - Cuando el usuario elige ese estado, en vez de actualizar directamente, abrir un pequeño diálogo secundario ("Agendar visita") con:
    - Datepicker (shadcn `Calendar` en `Popover`, con `pointer-events-auto`)
    - Input de hora (`type="time"`)
    - Textarea opcional para notas
    - Botones Cancelar / Guardar
  - Al guardar: `update` sobre `instant_form_leads` con `lead_status = 'visita_tienda'`, `store_visit_at`, `store_visit_notes`, e invalidar `seller-leads` / `instant-form-leads`.
  - Si el lead ya tenía `store_visit_at`, precargar los campos para permitir reagendar.
  - Mostrar en la pestaña "Info del lead" un bloque destacado con la visita agendada (fecha, hora en zona CR, notas) cuando exista.

### 4. Tarjetas y listas
- `SellerLeadCard.tsx`: agregar entrada `visita_tienda` en `STATUS_STYLES` usando `--status-visita`. Si el lead está en ese estado y tiene `store_visit_at`, mostrar debajo del modelo/cantidad una línea "🏬 Visita: 15 dic · 3:00 PM".
- `SellerCrm.tsx`: agregar un sexto KPI "Visitas" y una pestaña "Visita tienda" en el filtro `STATUSES`. El grid de KPIs pasa de 5 a 6 columnas.
- `InstantFormLeadsWidget.tsx` (dashboard admin): agregar el mismo estilo/estado para mantener consistencia en la vista del cliente.

### 5. Fuera de alcance
- No se toca `use-instant-form-leads.ts > useRegisterSaleFromInstantFormLead` ni la sincronización con `message_sales`: "visita a la tienda" es un estado intermedio, no dispara venta ni la cancela.
- No se agregan recordatorios/notificaciones automáticas. Si más adelante querés notificaciones (ej. push el día de la visita), lo hacemos en una segunda iteración.

### Detalles técnicos
- La hora se combina con la fecha en zona `America/Costa_Rica` antes de guardarse como `timestamptz` (misma convención que el resto del proyecto).
- El precargado del reagendado usa `date-fns` con `toZonedTime` para separar fecha e hora.
- El diálogo secundario se monta dentro del `SellerLeadDetailDialog` para no interferir con el flujo mobile (mismo patrón que otros modales anidados del proyecto).
