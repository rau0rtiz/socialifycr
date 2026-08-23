# Recibo shareable: página pública + botón en el correo

El recibo pasa a tener su propia página web pública en formato historia. El correo que le llega al cliente incluye un botón "Ver y compartir mi recibo" → abre esa página → ahí el cliente le da **Compartir** y se abre el share nativo del celular (Instagram, WhatsApp, Stories), igual que compartir una canción de Spotify.

```text
Correo (recibo actual)
   └─ botón "Ver y compartir" ──► /recibo/:token  (página pública 9:16)
                                      ├─ Compartir  → share nativo con la imagen
                                      └─ Descargar PNG (fallback escritorio)
```

## Qué vas a ver

**En el correo (recibo de entrega):** debajo del total de piezas, un botón naranja "Ver y compartir mi recibo" con una línea corta tipo "Compartilo en tus historias". Solo aparece si la hoja tiene el link público habilitado.

**En la página pública `/recibo/:token`:** el recibo renderizado en vertical 9:16 sobre fondo papel, centrado, con:
- Encabezado "Tu recibo de producción" + fecha en español y nombre del cliente/logo.
- Lista numerada de las piezas grabadas con su tipo (Reel/Story/Post…). Si hay muchas, muestra las que caben y "+N más".
- Total de piezas grande tipo ticket, corte dentado y paleta Ember.
- Botón **Compartir** (principal) y **Descargar imagen**.
- Toggle Claro (papel) / Oscuro (studio).

**En la hoja de producción (interno):** el mismo botón "Compartir historia" para que vos también puedas generarlo y compartirlo directo.

## Detalles técnicos

- Nueva ruta pública `/recibo/:token` en `src/App.tsx` → `src/pages/ReciboPublico.tsx`. Reusa el token y el RPC `get_public_production_sheet` que ya alimenta `/produccion/:token`, así no hay tabla ni política nueva.
- Componentes nuevos: `src/components/producciones/StoryReceiptCard.tsx` (markup 1080x1920 con estilos inline) y `ShareReceiptButtons.tsx` (generar imagen + compartir). El card se reusa tal cual en la hoja interna.
- Render con `html-to-image` (`toBlob`) sobre un nodo oculto de 1080x1920 reales, `pixelRatio: 1`, fondo explícito; imágenes remotas con `crossOrigin="anonymous"` y fallback a fondo sólido si fallan. Se agrega la dependencia `html-to-image`.
- Share nativo: `navigator.canShare({ files })` + `navigator.share({ files: [File] })`; si no está soportado → descarga vía `URL.createObjectURL`.
- `send-production-summary`: en `buildReceiptHtml` se agrega el bloque del botón usando la URL pública `https://app.socialifycr.com/recibo/<share_token>`. Se lee `share_token`/estado de link público de `production_sheets`; si no hay token, el bloque se omite. Sin cambios de esquema.
- Sin cambios en el resumen editorial ni en el layout actual del recibo por correo, más allá del botón añadido.

## Verificación

Abro `/recibo/:token` en el preview con una hoja real, genero el PNG y confirmo que sale exactamente a 1080x1920, sin texto cortado, en los dos temas. Y reviso el HTML del correo renderizado para que el botón se vea bien y el link apunte al token correcto.
