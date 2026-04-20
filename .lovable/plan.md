
Diagnóstico real:
- El problema ya no es JWT: `handle-unsubscribe` ya está público (`verify_jwt = false`).
- La ruta `/desuscribirse` también existe y la página sí está leyendo `?token=...`.
- El fallo real está en la generación del link: la tabla `email_unsubscribe_tokens` tiene `email UNIQUE`, pero varias funciones crean un token nuevo con `insert(...)` en cada envío y no manejan el error si ese email ya tenía token.
- Resultado: el correo puede salir con un token nuevo que nunca quedó guardado en DB, y después la página muestra “token inválido”. Los logs actuales encajan exactamente con eso: la función recibe token, pero “Token not found”.

Plan de arreglo:
1. Crear una lógica única de “obtener o crear token”
- En vez de generar siempre un UUID nuevo, cada email debe reutilizar su token existente.
- Flujo:
  - buscar token por email
  - si existe, devolverlo
  - si no existe, crearlo y devolverlo
- Importante: no rotar el token en cada envío, para que links viejos sigan funcionando.

2. Aplicar esa lógica en todos los correos que agregan footer de desuscripción
- `supabase/functions/send-notification-email/index.ts`
- `supabase/functions/send-campaign/index.ts`
- `supabase/functions/send-avatar-reminder/index.ts`
- `supabase/functions/send-funnel-result/index.ts`
- `supabase/functions/send-mindcoach-avatar-urgent/index.ts`

3. Simplificar la UX como pediste
- Cambiar los links para que vayan con `token` y también `email` visible en query.
- La página `src/pages/Unsubscribe.tsx` debe:
  - mostrar el email prefilled de inmediato
  - no depender de una validación previa para renderizar la UI
  - dejar solo: email + motivo opcional + botón confirmar
- El token sigue usándose por detrás para seguridad, pero la experiencia se siente “simple”.

4. Hacer la acción de desuscribir realmente global
- En `handle-unsubscribe` además de actualizar `email_contacts`, insertar el email en `suppressed_emails`.
- Si ya está suprimido o el token ya fue usado, devolver estado “ya desuscrito”.
- Así evitamos que futuros envíos le sigan llegando desde otros flujos.

5. Blindar los envíos futuros
- Antes de enviar correos manuales o automatizados, validar si el destinatario está en `suppressed_emails`.
- Si está desuscrito, saltar el envío silenciosamente o registrarlo como omitido.
- Esto evita que “desuscribirse” sea solo visual.

6. Endurecer errores y mensajes
- Si falta token pero viene email, mostrar mensaje amigable, no “token inválido”.
- Si token no existe de verdad, mostrar error claro.
- Si ya estaba desuscrito, mostrar confirmación positiva.

Archivos a tocar:
- `src/pages/Unsubscribe.tsx`
- `supabase/functions/handle-unsubscribe/index.ts`
- `supabase/functions/send-notification-email/index.ts`
- `supabase/functions/send-campaign/index.ts`
- `supabase/functions/send-avatar-reminder/index.ts`
- `supabase/functions/send-funnel-result/index.ts`
- `supabase/functions/send-mindcoach-avatar-urgent/index.ts`

Resultado esperado:
- El link de desuscripción deja de romperse.
- La página abre con el correo ya visible y solo pide motivo + confirmar.
- Los links viejos siguen funcionando mejor.
- Si alguien ya se desuscribió, el sistema lo reconoce.
- El email queda realmente bloqueado para envíos futuros.
