## Contexto

- **Multi-sheet ya funciona a nivel de datos.** `instant_form_lead_sources` acepta varias filas por `client_id` (cada una con su `spreadsheet_id` + `sheet_name`) y `sync-instant-form-leads` itera todas las sources del cliente en cada corrida. Podés apuntar dos sources al MISMO `spreadsheet_id` con `sheet_name` distinto (una pestaña por formulario) y no hay conflicto: el `external_id` incluye el nombre de la pestaña (`sheet-{spreadsheetId}-{sheetName}-{row}`), así que no duplica ni pisa leads.
- **La pregunta nueva no rompe nada.** Todas las respuestas del formulario se guardan como JSON en `instant_form_leads.custom_answers`. Cualquier pregunta nueva de Meta cae ahí sin migración. Los widgets actuales sólo leen keys específicas (modelo/tipo), así que ignoran la urgencia hasta que la mostremos.
- **Slug pendiente.** El slug real (`custom_answers.<key>`) lo asigna Meta cuando se publica el form. Vamos a resolverlo con detección robusta: buscar cualquier key cuyo nombre normalizado contenga "pronto" o "urgen" y cuyo valor matchee una de las 4 opciones, para no depender del slug exacto.

## Cambios a implementar

### 1. UI de Business Setup — mejor manejo de múltiples sheets
Archivo: `src/components/business-setup/InstantFormSetup.tsx`
- Agregar campo opcional `label` (ej. "Camisas por mayor", "Uniformes urgentes") a cada source para distinguirlas visualmente en la lista.
- Mostrar contador de leads sincronizados por source.
- Permitir editar el `sheet_name` de una source existente sin borrarla.

Migración: `ALTER TABLE instant_form_lead_sources ADD COLUMN label text;`

### 2. Detección de urgencia (helper compartido)
Archivo nuevo: `src/lib/comfortex-urgency.ts` + duplicado ligero en `supabase/functions/_shared/comfortex-reply.ts`.
- Función `getUrgencyFromLead(custom_answers)` que:
  - Recorre las keys, normaliza (`toLowerCase`, sin tildes, sin `_`).
  - Si la key contiene "pronto" | "urgen" | "cuando" | "necesitan" → toma el valor.
  - Mapea el valor a un enum: `24h` | `1-3d` | `4-7d` | `cotizar`.
- Retorna `null` si no hay respuesta.

Así el código funciona hoy (antes de que Meta asigne slug) y sigue funcionando cuando el slug se estabilice.

### 3. Prompt IA de WhatsApp adapta el cierre según urgencia
Archivo: `supabase/functions/_shared/comfortex-reply.ts`
- En `buildComfortexUserMessage`, además de volcar todas las `custom_answers`, agregar una línea explícita `Urgencia detectada: <bucket>` cuando `getUrgencyFromLead` devuelva algo.
- Actualizar `COMFORTEX_SYSTEM_PROMPT` con una sección nueva "URGENCIA":
  - `24h` → priorizar disponibilidad inmediata, ofrecer confirmar stock/plazo YA, tono ejecutivo.
  - `1-3d` → resaltar tiempo de producción real y pedir confirmación rápida.
  - `4-7d` → mensaje estándar comercial.
  - `cotizar` → sin push, tono informativo, enfoque en precio y opciones.

### 4. Badge de prioridad en la lista de leads
Archivos: `src/components/seller-crm/SellerLeadCard.tsx` y donde se pinte el listado en `SellerCrm.tsx` / `ClientDatabase.tsx` para Comfortex.
- Nuevo componente `<UrgencyBadge urgency={...} />`:
  - `24h` → rojo, "24h"
  - `1-3d` → naranja, "1-3d"
  - `4-7d` → gris, "4-7d"
  - `cotizar` → azul suave, "Cotiza"
- Sólo se renderiza para leads del `COMFORTEX_CLIENT_ID`.
- Opcional: permitir ordenar el listado por urgencia (24h primero).

### 5. Widget nuevo de dashboard: "Leads por Urgencia"
Archivo nuevo: `src/components/dashboard/ComfortexUrgencyWidget.tsx`, registrado en `src/pages/Dashboard.tsx` sólo para Comfortex.
- Usa `useInstantFormLeads(clientId)` + `getUrgencyFromLead`.
- Muestra 4 buckets con conteo y % del total, filtrable por rango (30d default, con `isInRange`).
- Sirve al media buyer para leer intención de compra sin abrir cada lead.

## Detalles técnicos

- **Sin migraciones destructivas.** Sólo se agrega `label` opcional a `instant_form_lead_sources`.
- **Sin cambios al edge function `sync-instant-form-leads`.** Ya guarda todo en `custom_answers` y ya recorre múltiples sources.
- **Retro-compatibilidad.** Leads viejos sin urgencia siguen funcionando: `getUrgencyFromLead` retorna `null` y ni el badge ni el widget los cuentan.
- **Costo IA.** El prompt crece ~15 líneas; impacto por request despreciable (Gemini 3 Flash).

## Implicaciones negativas evaluadas

- **Ninguna estructural.** El JSONB tolera keys nuevas sin migrar.
- **Duplicado potencial de leads si se apunta el MISMO sheet_name dos veces:** ya lo previene el unique index sobre `external_id`. No repetir la misma combinación `(spreadsheet_id, sheet_name)`.
- **Costo Sheets API:** cada source = 1 llamada por sync. Con 2 pestañas seguís muy por debajo del rate limit.
- **Slug frágil:** mitigado con detección heurística por contenido de la key + valor.

## Fuera de alcance

- Modificar `sync-instant-form-leads` (no hace falta).
- Cambiar el schema de `instant_form_leads` (usamos `custom_answers` tal cual).
- Auto-priorizar el ruteo de vendedor por urgencia (podemos agregarlo después si querés).
