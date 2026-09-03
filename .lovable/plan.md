# Portal chooser en app.socialifycr.com

Al entrar a la raíz del sitio, cualquier persona verá primero una pantalla de bienvenida con dos botones grandes: **Portal cliente** y **Portal agencia**. Se muestra siempre, incluso si ya hay sesión activa.

## Comportamiento

- `/` deja de renderizar el dashboard y pasa a mostrar la pantalla de selección.
- **Portal cliente**: si no hay sesión, va al login y después al dashboard de cliente (`/dashboard`). Si ya hay sesión, entra directo.
- **Portal agencia**: si no hay sesión, va al login y después al hub de agencia (`/agencia`). Si ya hay sesión, entra directo.
- Después de elegir, la persona no vuelve a ver el menú al navegar dentro del app; solo reaparece si entra otra vez a `/`.
- Los links directos existentes (por ejemplo `/ventas`, `/producciones`, `/agencia/crm`, links públicos de recibos/propuestas) siguen funcionando igual.
- El subdominio `produ.socialifycr.com` no cambia: sigue entrando directo a Producciones.

## Diseño

Pantalla centrada sobre el banner existente, con logo de Socialify y las dos tarjetas-botón lado a lado (apiladas en móvil), en el estilo actual: esquinas redondeadas, acento ember naranja, tipografía Space Grotesk. Cada tarjeta con un ícono y una línea corta de descripción ("Métricas y contenido de tu marca" / "Herramientas internas de Socialify").

## Detalles técnicos

- Nueva página `src/pages/PortalSelect.tsx`, ruta pública `/` en el host principal de `src/App.tsx`.
- El home actual (`SellerHomeGate`, que decide entre Dashboard y CRM de vendedor según rol) se mueve a la ruta `/dashboard`, protegida como hoy; el resto de rutas queda igual.
- `PortalSelect` lee la sesión con `useAuth()`: con sesión navega a `/dashboard` o `/agencia`; sin sesión navega a `/auth?next=/dashboard` o `/auth?next=/agencia`.
- `src/pages/Auth.tsx` respeta el parámetro `next` al redirigir tras login (y en su efecto de sesión ya activa), con fallback a `/dashboard`.
- `ProtectedRoute` redirige a `/auth` preservando la ruta destino en `next`, para que después del login se vuelva al lugar correcto en vez de a la pantalla del menú.
- Sin cambios de base de datos ni de permisos.
