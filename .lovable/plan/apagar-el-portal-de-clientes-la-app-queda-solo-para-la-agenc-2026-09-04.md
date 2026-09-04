# Apagar el portal de clientes — la app queda solo para la agencia

Todo el producto pasa a ser interno. El portal de clientes se desactiva (no se borra la base de datos ni el código útil), queda un login solo para el equipo de Socialify, y lo único que sobrevive del mundo cliente son las bases de datos de contactos, movidas a una sección de agencia.

## Qué va a ver el usuario

1. **Portada interna simple** en `app.socialifycr.com/`: fondo Ember sobre papel, logo de Socialify y un solo botón "Entrar al panel de agencia". Con sesión válida entra directo a `/agencia`.
2. **Login solo interno**: al iniciar sesión, si la cuenta no es miembro interno de la agencia, se cierra la sesión y se muestra el mensaje "Este acceso es solo para el equipo interno de Socialify". Sin registro público (igual que hoy).
3. **Nueva sección `Bases de datos de clientes`** dentro de `/agencia`: la herramienta actual de contactos/estudiantes/clientes finales, con un selector de cliente arriba en lugar del sidebar del portal cliente. Mantiene búsqueda, filtros, fichas 360 y datos de facturación.
4. **Desaparecen del menú y de las rutas**: Dashboard de cliente, Ventas, Órdenes, Asistencia, Reportes Speak Up, Business Setup, Comisiones, Mis leads, Masterclass, Brand settings de cliente, Historial, banner/preview de cliente. Cualquier URL antigua redirige a la portada o a `/agencia`.
5. `/agencia` sigue igual: Resumen, CRM, Finanzas/Pagos, Producciones, Documentación, Funnels, Base de datos (correos), Comunicaciones, Accesos, Archivos, Ad Frameworks, Image DB.

## Qué se conserva para revivirlo barato

- **Base de datos intacta**: ninguna tabla, política ni dato se borra. Los widgets desactivados siguen teniendo su información.
- **Código archivado, no eliminado**: las páginas y widgets del portal cliente se mueven a `src/_archive/portal-cliente/` (no se compilan en ninguna ruta) en vez de borrarse.
- **Documento de reactivación** `docs/PORTAL-CLIENTE-ARCHIVADO.md`: inventario de páginas, hooks, tablas y feature flags implicados, más los pasos exactos para volver a montar una ruta o un widget suelto (qué archivo mover, qué ruta agregar, qué hook ya existe). Así revivir un widget cuesta una edición corta, no una reconstrucción.

## Detalles técnicos

- `src/App.tsx`: se eliminan las rutas `/dashboard`, `/mis-leads`, `/ventas`, `/ordenes`, `/reportes`, `/asistencia`, `/business-setup`, `/client-database`, `/masterclass`, `/brand-settings`, `/historial` y `/clientes` (queda `/agencia/clientes`). Se agregan `Navigate` de cortesía hacia `/agencia`. El host `producciones` no se toca. Rutas públicas (`/propuesta`, `/reporte`, `/plan`, `/correo`, `/formulario`, `/produccion-publica`, `/recibo`, `/imgdb`, legales, OAuth callbacks, invitaciones) se mantienen.
- `src/pages/PortalSelect.tsx` se simplifica a la portada de un solo botón.
- `src/components/ProtectedRoute.tsx`: además de exigir sesión, exige `isAgency`; si no lo es, `signOut()` y redirección a `/auth?blocked=1`. `src/pages/Auth.tsx` muestra el mensaje cuando llega ese parámetro.
- `RoleProtectedRoute` deja de usar `/dashboard` como destino de rechazo; usa `/agencia`.
- `SellerHomeGate.tsx` se retira (ya no hay bifurcación cliente/vendedor).
- Nueva página `src/pages/agencia/BasesDeDatosClientes.tsx` en ruta `/agencia/bases-de-datos-clientes`, reutilizando la lógica actual de `ClientDatabase` con el shell de `AgencySidebar` y un `Select` de cliente propio (los hooks `use-customer-contacts`, `use-student-contacts` y los diálogos de detalle se mantienen en su lugar). Se agrega el ítem al `AgencySidebar`.
- No se toca `BrandContext` más allá de lo necesario para que la nueva página elija cliente.
- Verificación: typecheck limpio y recorrido en el preview de `/`, `/auth` y las rutas de `/agencia` (incluida la nueva sección) para confirmar que no quedan enlaces rotos.
