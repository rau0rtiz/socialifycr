

## Plan: Flujo de desuscripción para todos los correos

### Resumen
Agregar un botón de "Desuscribirse" al pie de todos los correos enviados, crear una página pública `/desuscribirse` donde el usuario confirma y opcionalmente indica el motivo, y una edge function que procese el token.

### Cambios

**1. Edge function `handle-unsubscribe` (nueva)**
- Recibe `?token=UUID` por GET (para el link del correo) y POST con `{ token, reason }` para confirmar
- GET: valida el token en `email_unsubscribe_tokens`, devuelve HTML con la página de confirmación y selector de motivo (página standalone, sin React)
- POST: marca el token como usado, actualiza `email_contacts` si existe (status = 'unsubscribed', unsubscribed_at = now), y registra el motivo en una nueva columna o en metadata

**2. Página React `/desuscribirse` (nueva)**
- Página pública (sin ProtectedRoute) con diseño limpio estilo Socialify
- Lee `?token=UUID` de la URL
- Muestra formulario: confirmación + selector de motivo (opciones: "No me interesa", "Recibo muchos correos", "No solicité estos correos", "Otro" con campo de texto)
- Llama a la edge function para procesar
- Muestra mensaje de éxito/error

**3. Modificar edge functions de envío para inyectar link de desuscripción**
- `send-notification-email`: generar token en `email_unsubscribe_tokens`, inyectar footer con botón antes de `</body>`
- `send-funnel-result`: igual, generar token e inyectar footer
- `send-campaign`: igual para cada contacto
- `send-client-invitation`: este NO lleva desuscripción (es transaccional)
- `send-avatar-reminder`: inyectar también
- El footer HTML será un bloque reutilizable con estilo discreto y link a `https://app.socialifycr.com/desuscribirse?token=XXX`

**4. Migración SQL**
- Agregar columna `reason` (text, nullable) a `email_unsubscribe_tokens`
- Agregar columna `unsubscribe_reason` (text, nullable) a `email_contacts` (si aplica)

**5. Ruta en App.tsx**
- Agregar `<Route path="/desuscribirse" element={<Unsubscribe />} />` como ruta pública

### Archivos afectados
- `supabase/functions/handle-unsubscribe/index.ts` (nuevo)
- `src/pages/Unsubscribe.tsx` (nuevo)
- `src/App.tsx` — nueva ruta pública
- `supabase/functions/send-notification-email/index.ts` — inyectar footer
- `supabase/functions/send-funnel-result/index.ts` — inyectar footer
- `supabase/functions/send-campaign/index.ts` — inyectar footer
- `supabase/functions/send-avatar-reminder/index.ts` — inyectar footer
- Migración SQL: columna `reason` en `email_unsubscribe_tokens`

### Detalle técnico
- Los tokens ya existen en la tabla `email_unsubscribe_tokens` con columnas `token`, `email`, `created_at`, `used_at`
- Solo se agrega `reason` como nueva columna
- La página React usa el dominio de producción para los links en los correos
- El footer de desuscripción es texto gris pequeño, no invasivo, al final del correo

