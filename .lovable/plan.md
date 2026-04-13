

## Enviar correo de actualización de foto + flujo desde el email

### Concepto
Crear una edge function que consulte todos los usuarios con acceso al dashboard (admin team + client team members), filtre los que no tienen foto de perfil, y les envíe un correo con un link directo a actualizar su foto. Agregar una ruta `/actualizar-foto` que abra automáticamente el dialog de perfil.

### Cambios

**1. Nueva edge function `send-avatar-reminder/index.ts`**
- Usa `SUPABASE_SERVICE_ROLE_KEY` para consultar:
  - `user_roles` → todos los usuarios con rol de sistema (admin, owner, manager, etc.)
  - `client_team_members` → todos los miembros de equipo de clientes
- Unifica user_ids, elimina duplicados
- Cruza con `profiles` para obtener email y `avatar_url`
- Filtra solo los que tienen `avatar_url IS NULL`
- Envía correo a cada uno vía Resend con HTML que incluye link a `/actualizar-foto`
- Registra cada envío en `sent_emails`

**2. Nueva página `/actualizar-foto`**
- Ruta protegida (requiere auth)
- Al montar, abre automáticamente el `ProfileDialog` con foco en la sección de foto
- Si el usuario ya tiene foto, muestra mensaje "Ya tienes foto de perfil" con opción de cambiarla

**3. Botón en EmailsLog o Accesos para disparar el envío**
- Un botón "Enviar recordatorio de foto" en la sección de administración
- Al hacer click, invoca la edge function
- Muestra toast con cuántos correos se enviaron

**4. Template del correo**
- Subject: "Actualiza tu foto de perfil en Socialify"
- HTML con branding de Socialify, un CTA button que apunta a `https://socialifycr.lovable.app/actualizar-foto`
- Texto amigable: "Tu equipo te reconocerá más fácil con una foto de perfil"

### Detalle técnico
- La edge function usa el patrón existente de `send-notification-email` (Resend + log en `sent_emails`)
- La ruta `/actualizar-foto` es un componente ligero que usa `DashboardLayout` + `ProfileDialog`
- No se necesitan cambios en la base de datos

