# Recibo de producción shareable para historias (1080x1920)

Sí se puede, y no es complicado. La idea: el mismo recibo que ya te gusta, pero en formato vertical de historia, generado como imagen desde la hoja de producción y compartible de forma nativa (igual que Spotify → Instagram) en celular.

## Qué vas a ver

En la hoja de producción, junto a "Enviar por correo", un botón nuevo: **Compartir historia**.

Al abrirlo:
- Vista previa del recibo en formato 9:16 (se ve escalado dentro del diálogo).
- Datos: portada de la hoja (si tiene) como fondo suave, logo del cliente, título de la producción, fecha en español, y la lista numerada de piezas grabadas con su tipo (Reel/Story/Post…).
- Total de piezas grande, tipo "ticket", con el corte dentado y la paleta Ember sobre papel.
- Si hay muchas piezas, muestra las primeras que caben y un "+N más" para que nunca se desborde.
- Toggle: **Claro (papel)** / **Oscuro (studio)**.

Botones:
- **Compartir** — usa el share nativo del sistema con el archivo de imagen adjunto, así aparece Instagram / WhatsApp / Stories directamente desde el celular. Es el mismo mecanismo que usa Spotify.
- **Descargar PNG** — fallback en escritorio (y en navegadores sin share de archivos), con un aviso corto de que desde el celular se comparte directo.

## Detalles técnicos

- Render con `html-to-image` (`toBlob`) sobre un nodo oculto de 1080x1920 px reales, `pixelRatio: 1`, fondo explícito. Nuevo componente `src/components/producciones/ShareStoryDialog.tsx` + `StoryReceiptCard.tsx` (markup puro con estilos inline/tailwind, sin dependencias externas de fuente remota: se usa la Space Grotesk ya cargada en la app).
- Compartir nativo: `navigator.canShare({ files })` + `navigator.share({ files: [new File([blob], 'recibo.png', {type:'image/png'})], title, text })`. Si no está soportado → descarga directa vía `URL.createObjectURL`.
- Sin cambios de base de datos ni edge functions. Los datos vienen de los mismos `sheet` + `shots` (`done === true`) que ya tiene la página, y el orden respeta el `sort_order` actual.
- Imágenes remotas (portada / logo del cliente) se cargan con `crossOrigin="anonymous"`; si alguna falla, el render sigue con el fondo sólido en lugar de romperse.
- Se agrega la dependencia `html-to-image`.
- Reuso en la vista pública (`ProduccionPublica.tsx`) queda fuera de este alcance; primero lo dejamos en la hoja interna.

## Verificación

Genero la imagen desde el preview y la reviso a tamaño real: que no se corte texto, que la lista quepa, que el total y la fecha se lean, y que el PNG salga exactamente a 1080x1920 en ambos temas.
