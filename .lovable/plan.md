## Objetivo

Ver, por cada campaña enviada, **quiénes abrieron el correo** y la tasa de apertura, dentro de la pestaña Campañas en `/comunicaciones`.

## Diagnóstico actual

- `send-campaign` ya escribe a `sent_emails` (con `opened_at` y `source='campaign'`) y existe el endpoint `track-email-open` que actualiza `opened_at` cuando carga el pixel.
- **Bug crítico**: el pixel se inyecta en el HTML *después* de enviar a Resend → el correo enviado nunca contiene el pixel, por eso nada se está marcando como abierto.
- `sent_emails` no tiene `campaign_id`, así que hoy no se pueden vincular aperturas con su campaña directamente. Sí comparten `resend_id` con `email_send_logs`, pero filtrar por eso es frágil.

## Cambios

### 1. Base de datos (migración)
- Agregar columna `campaign_id uuid` (nullable, FK a `email_campaigns`) en `sent_emails`, con índice.
- Agregar columna `opened_count int default 0` en `email_campaigns` para mostrar resumen rápido.
- Backfill: para campañas ya enviadas, vincular `sent_emails.campaign_id` cruzando por `resend_id` con `email_send_logs`.

### 2. Edge function `send-campaign`
- Crear primero el registro en `sent_emails` con `campaign_id` y `status='pending'`.
- Construir el HTML personalizado **incluyendo el pixel `track-email-open?id=<sent_email_id>`** ANTES del fetch a Resend.
- Después del envío, actualizar el registro a `sent` (con `resend_id`) o `failed`.
- Esto deja el tracking funcionando real para nuevas campañas.

### 3. UI — pestaña Campañas (`CampaignsContent.tsx`)
En cada tarjeta de campaña enviada, agregar:
- Badge con **% de apertura** (ej. `42% abierto · 21/50`).
- Botón **"Ver aperturas"** que abre un diálogo nuevo.

Nuevo componente `CampaignOpenersDialog.tsx`:
- Tabs: **Abiertos** | **No abiertos** | **Fallidos**.
- Tabla con: nombre, email, fecha de envío, fecha de primera apertura.
- Búsqueda por nombre/email.
- Resumen arriba: enviados, abiertos, tasa de apertura, fallidos.
- Botón exportar CSV.

### 4. Hook `use-campaign-openers.ts` (nuevo)
- Query a `sent_emails` filtrada por `campaign_id`, devuelve `{recipient_email, recipient_name, status, opened_at, created_at}`.
- Agregaciones para los contadores del diálogo.

## Consideraciones técnicas

- El pixel solo cuenta una apertura por destinatario (la primera) — el endpoint actual ya lo asegura con `.is('opened_at', null)`.
- Limitaciones reales del tracking por pixel: clientes que bloquean imágenes (Apple Mail Privacy Protection infla aperturas, Outlook empresarial puede bloquearlas). Lo dejaremos anotado en el diálogo como nota pequeña.
- No tocar `email_send_logs` (queda como está, es el log interno por contacto).
- Respetar RLS existente de `sent_emails`.

## Archivos

- `supabase/migrations/<ts>_campaign_open_tracking.sql` (nuevo)
- `supabase/functions/send-campaign/index.ts` (refactor del orden de envío + pixel)
- `src/hooks/use-campaign-openers.ts` (nuevo)
- `src/hooks/use-email-campaigns.ts` (añadir `opened_count` al tipo)
- `src/components/comunicaciones/CampaignOpenersDialog.tsx` (nuevo)
- `src/components/comunicaciones/CampaignsContent.tsx` (badge + botón "Ver aperturas")
