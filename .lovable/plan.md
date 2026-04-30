## Cambio de remitente: "Socialify" → "Raúl Ortiz"

Solo se ajusta el **nombre visible** del remitente. Las direcciones de correo (`notificaciones@`, `invitaciones@`, `hola@`, `finanzas@notify.`) y el dominio se mantienen igual.

### Archivos a editar (campo `from`)

| Edge Function | Cambio |
|---|---|
| `send-password-reset/index.ts` | `Socialify <notificaciones@…>` → `Raúl Ortiz <notificaciones@…>` |
| `send-notification-email/index.ts` | igual |
| `send-client-invitation/index.ts` | `Socialify <invitaciones@…>` → `Raúl Ortiz <invitaciones@…>` |
| `send-funnel-result/index.ts` | `Socialify <hola@…>` → `Raúl Ortiz <hola@…>` |
| `send-avatar-reminder/index.ts` | `Socialify <notificaciones@…>` → `Raúl Ortiz <notificaciones@…>` |
| `resend-email/index.ts` | `Socialify <hola@…>` → `Raúl Ortiz <hola@…>` |
| `agency-daily-collections/index.ts` | `Finanzas Socialify <finanzas@notify.…>` → `Raúl Ortiz <finanzas@notify.…>` |
| `send-mindcoach-avatar-urgent/index.ts` | `The Mind Coach <notificaciones@…>` se **mantiene** (es marca de cliente, no del sistema). Confirmar si también lo cambio. |

### Notas
- No se tocan firmas, footers ni el contenido HTML de las plantillas (siguen mostrando "Socialify" como marca de la plataforma en el cuerpo).
- No se tocan plantillas de auth (`auth-email-hook` / `_shared/email-templates`) salvo que también tengan un "from name" hardcodeado — lo verifico al implementar y aplico el mismo cambio si aplica.
- Después de editar, redespliego todas las edge functions modificadas.

### Pregunta abierta
El correo `send-mindcoach-avatar-urgent` actualmente usa `"The Mind Coach"` como remitente (no "Socialify"). Lo dejo así salvo que indiques lo contrario.