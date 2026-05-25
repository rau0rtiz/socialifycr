Voy a asignarle manualmente la contraseña `Socialify123` a `lucia@socialifycr.com` usando un edge function de un solo uso con el Admin API.

## Pasos

1. Crear edge function `set-lucia-password` que:
   - Busca el user_id de `lucia@socialifycr.com` en `profiles`
   - Llama `supabase.auth.admin.updateUserById(userId, { password: "Socialify123" })`
   - Devuelve confirmación
2. Ejecutarlo una vez vía curl
3. Confirmarte que ya puede entrar con:
   - **Email:** lucia@socialifycr.com
   - **Password:** Socialify123

Ella podrá cambiarla después desde su perfil.

## Nota de seguridad
`Socialify123` es débil (sin símbolos, predecible). Recomiendo decirle a Lucía que la cambie en su primer login.