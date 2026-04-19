
User wants 2 things:

1. **Reenvío de correos con attachments en el historial** (`EmailsLogContent` / `sent_emails`).
2. **Barra de "miembros del equipo del cliente"** en el tope con indicador online/offline + tooltip de última conexión.

Let me check the relevant files briefly.
<br>

### Investigación
<br>

**Reenvío:**
- Tabla `sent_emails` ya guarda `html_content`, `subject`, `recipient_email`. Pero **no guarda attachments**. Para el caso del funnel, los PDFs se generan dinámicamente en `send-funnel-result` desde storage (`documents/Nivel-N.pdf`). 
- Para reenviar con el PDF correcto necesitamos saber el `business_level`. Eso puede venir del lead asociado o de un metadata nuevo.
- Plan: agregar columna `attachments_meta jsonb` en `sent_emails` para guardar referencia (ej: `[{type:'storage', path:'documents/Nivel-3.pdf', filename:'Roadmap-Nivel-3.pdf'}]`). Las funciones que envían correos con attachment guardan la referencia. Una nueva edge function `resend-email` reconstruye el envío.
- Para correos viejos sin metadata: si es de `source='funnel'`, buscar el lead por email y deducir el nivel.
<br>

**Equipo del cliente online:**
- Ya existe `client_team_members` con `user_id` → `profiles` (full_name, avatar_url) + `get_users_last_sign_in` RPC para admins.
- Necesitamos exponer `last_sign_in_at` para usuarios del mismo cliente (no solo admins). Crear nueva función SECURITY DEFINER: `get_team_last_sign_in(_client_id uuid)` que retorna last_sign_in solo si el caller tiene `has_client_access`.
- "Online" = `last_sign_in_at` dentro de últimos 5 min. Mejor aún: usar Supabase Realtime Presence para online en vivo. Eso es más limpio y verdaderamente real-time.
- Componente nuevo: `TeamPresenceBar` — avatares circulares con dot verde/gris, tooltip con "Última vez: hace X". Va en el `TopBar` o debajo del header del dashboard.
<br>

### Plan
<br>

#### Parte 1 — Reenviar correos con attachments

**DB:**
- Agregar columna `sent_emails.attachments_meta jsonb` (nullable). Guarda referencias del tipo `[{source:'storage', bucket:'content-images', path:'documents/Nivel-3.pdf', filename:'Roadmap-Nivel-3.pdf'}]`.
- Agregar columna `sent_emails.metadata jsonb` (si no existe ya en forma utilizable) para guardar `{business_level, name, ...}` para reconstrucción.

**Backend (edge functions):**
- Modificar `send-funnel-result` para guardar `attachments_meta` y `metadata` en el insert de `sent_emails`.
- Crear nueva edge function `resend-email`:
  - Recibe `{ sent_email_id, override_email? }`.
  - Lee el registro original (html_content, subject, attachments_meta).
  - Descarga attachments desde storage si hay.
  - Reenvía vía Resend gateway.
  - Inserta nuevo row en `sent_emails` con `source='resend'` y `parent_email_id` referenciando el original.

**Frontend (`EmailsLogContent.tsx`):**
- Botón "Reenviar" en cada fila + opción de cambiar email destino antes de reenviar (popover/dialog pequeño).
- Indicador visual si tiene attachments (📎 con count).
- Toast de confirmación.

**Backfill:** correr 1 SQL para correos `source='funnel'` que vinculen al `funnel_leads` por email y popule `attachments_meta` con el PDF correspondiente al `business_level`.
<br>

#### Parte 2 — Barra de presencia del equipo

**DB:**
- Nueva función SECURITY DEFINER `get_team_members_with_activity(_client_id uuid)` que retorna `(user_id, full_name, avatar_url, role, last_sign_in_at)` para todos los miembros del cliente, restringido a `has_client_access(auth.uid(), _client_id)`. Visible para todos los miembros del cliente, no solo admins.

**Frontend:**
- Nuevo componente `TeamPresenceBar.tsx`:
  - Fetch con `useQuery` la lista de miembros del cliente activo.
  - Suscribe canal de Supabase Realtime Presence: `team:{clientId}` para detectar quién está online ahora mismo.
  - Renderiza avatares circulares (-overlap), max 8 visibles + contador.
  - Dot verde (online) / gris (offline), borde según rol.
  - **Hover/Tooltip:** nombre, rol, "En línea" o "Última vez: hace 2h" (formato relativo en español).
- Integrarlo en `TopBar.tsx` (al lado del selector de cliente) — visible para TODOS los miembros del cliente, no solo agencia.
<br>

#### Detalles técnicos
- Realtime presence se trackea cuando el usuario monta el dashboard (canal por cliente activo). Untrack al desmontar.
- Online = presencia actual en el canal. Offline = no presente, mostrar `last_sign_in_at`.
- Para clientes con muchos miembros (>8), mostrar +N con popover de lista completa.
- Tooltip usa `date-fns` con locale `es` para "hace X minutos/horas/días".

#### Archivos a crear/editar
- **Migración SQL:** `sent_emails.attachments_meta`, `sent_emails.metadata`, `sent_emails.parent_email_id`, función `get_team_members_with_activity`.
- **Crear:** `supabase/functions/resend-email/index.ts`, `src/components/dashboard/TeamPresenceBar.tsx`, `src/hooks/use-team-presence.ts`.
- **Editar:** `supabase/functions/send-funnel-result/index.ts` (guardar metadata), `src/components/comunicaciones/EmailsLogContent.tsx` (botón reenvío + dialog), `src/components/dashboard/TopBar.tsx` (montar TeamPresenceBar).

#### Notas
- El reenvío de correos que NO son funnel (otros emails sin attachments) funcionará igual, solo sin PDFs.
- Para correos viejos del funnel sin metadata, el backfill SQL los rellena.
- Presencia es por cliente activo (no global), así cada quien ve solo su equipo.
