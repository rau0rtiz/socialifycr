

## Diagnóstico del problema

El botón "Desuscribirse" en los correos sí lleva a `/desuscribirse?token=...` correctamente, pero la página falla porque:

1. **`handle-unsubscribe` requiere JWT por defecto** — al no estar registrada en `supabase/config.toml` con `verify_jwt = false`, las llamadas anónimas (desde un correo, sin sesión) son rechazadas → la página interpreta el rechazo como "token inválido".
2. **`Unsubscribe.tsx` tiene código confuso** — hace primero un `supabase.functions.invoke('handle-unsubscribe', { method: 'GET' })` mal formado (no se puede mandar GET con body por invoke) y luego un `fetch` directo. La primera llamada fallida puede contaminar el estado.

## Plan: simplificar el flujo de desuscripción

Como pediste, hago el flujo trivial: el botón del correo lleva a la página, ésta muestra el correo prellenado, el usuario elige motivo y confirma → se procesa y se muestra confirmación.

### Cambios

**1. `supabase/config.toml`** — agregar:
```toml
[functions.handle-unsubscribe]
verify_jwt = false
```
Esto permite que cualquiera (sin sesión) pueda validar/usar el token desde el correo.

**2. `supabase/functions/handle-unsubscribe/index.ts`** — simplificar:
- Mantener GET (validar token + devolver email) y POST (marcar como usado + suprimir).
- Asegurar respuestas claras: `{ valid, email, already_used }` en GET y `{ success }` o `{ already_unsubscribed }` en POST.
- Logging extra para debug (`console.log` en cada paso).

**3. `src/pages/Unsubscribe.tsx`** — limpiar:
- **Eliminar** la llamada confusa a `supabase.functions.invoke('handle-unsubscribe', { method: 'GET', body: undefined })` — no funciona y puede generar el error de "token inválido".
- Usar un único `fetch` directo a la edge function tanto para validar (GET) como para confirmar (POST). El `anon key` se incluye en `Authorization: Bearer` para cumplir con el gateway de Supabase aunque `verify_jwt=false`.
- Flujo visual final (3 estados solamente):
  - **Loading** → validando.
  - **Form** → muestra "Vamos a desuscribir **email@x.com**", radio de motivos opcional, textarea si elige "Otro", botón **Confirmar desuscripción**.
  - **Success** → ✅ "Listo, te desuscribimos exitosamente."
  - **Already** → ✅ "Este correo ya estaba desuscrito."
  - **Error** → solo si el token realmente no existe (no por fallo de auth).

### Resultado
- Click en "desuscribirse" del correo → página abre con el email visible → 1 click en "Confirmar" → se elimina de la lista y se muestra confirmación. Sin pedir login, sin errores de token.

### Archivos a modificar
1. `supabase/config.toml` — añadir bloque `[functions.handle-unsubscribe]` con `verify_jwt = false`
2. `supabase/functions/handle-unsubscribe/index.ts` — limpiar logs, mantener lógica
3. `src/pages/Unsubscribe.tsx` — eliminar la llamada `invoke` rota, usar solo `fetch` directo con headers de Supabase

