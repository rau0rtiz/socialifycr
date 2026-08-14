# Registro de vistas de documentos (anónimo, con tiempo de lectura)

Hoy cada documento en `/agencia/documentacion` muestra solo un contador total y la fecha de la última vista. La idea es guardar cada apertura por separado, con dispositivo, ubicación aproximada por IP y cuánto tiempo estuvo abierto, y poder verlo en un panel por documento.

## Qué vas a ver

- En cada tarjeta: total de vistas + un botón **Vistas** que abre el detalle.
- Panel de detalle del documento, ordenado de la visita más reciente a la más antigua:
  - Fecha y hora en horario de Costa Rica.
  - Dispositivo y navegador (por ejemplo "iPhone · Safari", "Windows · Chrome").
  - Ubicación aproximada (ciudad/país por IP), cuando se pueda determinar.
  - Tiempo de lectura de esa visita (por ejemplo "2 min 40 s").
  - Si venía de un correo enviado desde la herramienta, se marca como "abierto desde enlace compartido".
- Resumen arriba del panel: visitas totales, visitantes distintos (aproximado), tiempo promedio de lectura y la visita más larga.

Nota: al ser registro anónimo, no confirma la identidad de la persona; si varias personas entran desde la misma red pueden verse como visitantes parecidos.

## Cómo se mide el tiempo de lectura

La página pública avisa cuando se abre el documento y luego manda una señal cada 15 segundos mientras la pestaña está visible. Al cerrar o cambiar de pestaña manda una señal final. Así el tiempo refleja lectura real y no pestañas olvidadas abiertas horas.

## Detalles técnicos

**Base de datos**
- Nueva tabla `document_views`: `id`, `proposal_id`, `slug`, `session_token`, `ip_hash`, `country`, `city`, `device`, `browser`, `user_agent`, `referrer`, `duration_seconds`, `last_ping_at`, `created_at`.
- RLS: sin acceso para `anon` ni `authenticated` en escritura directa; lectura solo para miembros de agencia/admins (`is_agency_member` / `is_admin_or_higher`). Grants: `SELECT` a `authenticated`, `ALL` a `service_role`.
- Se guarda un hash de la IP (no la IP en claro) para poder contar visitantes distintos sin almacenar el dato personal.
- Se mantiene `agency_proposals.view_count` y `last_viewed_at` (ya existen) actualizados desde el mismo flujo, para no cambiar lo que ya muestran las tarjetas.
- `register_proposal_view` deja de llamarse desde el cliente; el conteo pasa a hacerse en la función de servidor para evitar inflado desde el navegador.

**Edge function `track-document-view`** (`verify_jwt = false`, CORS abierto)
- Acción `start`: valida el slug contra un documento publicado, lee IP de `x-forwarded-for` y `user-agent`, resuelve ciudad/país con una consulta best-effort a un servicio gratuito de geo-IP (si falla, se guarda sin ubicación), inserta la fila y devuelve `view_id` + `session_token`. Incrementa `view_count`.
- Acción `ping`: recibe `view_id` + `session_token`, actualiza `duration_seconds` y `last_ping_at`. Ignora saltos mayores a 60 s entre pings (pestaña dormida) para no inflar el tiempo.
- Validación de entrada con Zod; usa `SUPABASE_SERVICE_ROLE_KEY` internamente.

**Frontend**
- `src/pages/PropuestaPublica.tsx`: reemplaza la llamada a `register_proposal_view` por `start`, luego `setInterval` de 15 s condicionado a `document.visibilityState === 'visible'`, y `ping` final en `pagehide`/`visibilitychange` usando `navigator.sendBeacon`.
- Nuevo hook `src/hooks/use-document-views.ts`: query por `proposal_id` con `staleTime` corto y cálculo de los agregados del resumen.
- Nuevo componente `src/components/propuestas/DocumentViewsDialog.tsx`: panel con resumen y lista de visitas; formato de fecha con `date-fns` en zona `America/Costa_Rica`.
- `src/pages/Propuestas.tsx`: botón **Vistas** en cada tarjeta que abre el panel (estado derivado: se guarda solo el id).
