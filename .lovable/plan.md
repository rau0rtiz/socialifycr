
No es difícil en código; lo que se está poniendo necio aquí es Meta + dominio + validación.

Qué encontré
- El pixel ahorita sí está metido globalmente en `index.html`.
- No vi GTM ni scripts duplicados en React.
- `/roadmap` ya cuelga de la misma SPA, así que `index.html` cubre esa ruta también.
- La URL publicada visible del proyecto es `socialifycr.lovable.app`, pero el dominio objetivo que ya existe en memoria del proyecto es `app.socialifycr.com`.

Qué probablemente está fallando de verdad
1. Si Meta está probando `app.socialifycr.com` pero esa URL no está sirviendo exactamente esta app, no va a detectar nada.
2. Si estás usando preview o una URL distinta a la productiva, el configurador de eventos suele dar falsos negativos.
3. “Todos los subdominios” no se logra con un snippet en una sola app si existen varias apps/hosts distintos.  
   - Dentro de esta app: `index.html` cubre todas las páginas/rutas del mismo host.
   - Entre subdominios distintos: cada subdominio que sirva HTML propio necesita el pixel también.

Plan
1. Confirmar el host real
   - Verificar si `app.socialifycr.com` está conectado a esta app publicada.
   - Si no lo está, corregir eso primero; si sí lo está, probar solo sobre ese dominio.

2. Reinstalación limpia y definitiva
   - Dejar una sola instalación oficial del pixel.
   - `<script>` en `<head>`, `<noscript>` en `<body>`.
   - Sin GTM, sin doble carga, sin reinicializar `fbq` desde componentes.

3. Asegurar cobertura real
   - Mantener `PageView` global para todas las rutas del host.
   - Si quieres medición útil en `/roadmap`, agregar eventos explícitos del funnel (`Lead` al enviar datos y `Schedule` al hacer clic en Calendly).

4. Blindar el configurador de eventos
   - Revisar el script de recuperación de arranque de `index.html` + `src/main.tsx`.
   - Marcar el app como “booted” al montar React para evitar recargas falsas cuando Meta mete su overlay.

5. Verificación correcta
   - Probar en producción real, no en preview.
   - Validar 3 cosas: `window.fbq` existe, sale request a `facebook.com/tr`, y Meta lo reconoce en Test Events/Event Setup Tool.

Qué haría yo al implementarlo
- Mantener el pixel global en `index.html`.
- Añadir una inicialización segura mínima si hace falta, pero sin volverlo complejo.
- Corregir el posible conflicto de recarga.
- Luego dejar opcionales los eventos del funnel.

Nivel de dificultad real
- Instalarlo: fácil.
- Dejarlo funcionando y detectable por Meta: medio.
- Hacer que funcione “en todos los subdominios” si son apps separadas: ya eso sí es trabajo de infraestructura, no solo de frontend.

Resultado esperado
- Pixel funcionando en todas las rutas de esta app.
- `/roadmap` medido correctamente.
- Sin GTM.
- Sin recargas locas del configurador.
- Con claridad de si el pendiente final es código o dominio.
