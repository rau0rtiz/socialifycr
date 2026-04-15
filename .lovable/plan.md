
Objetivo

- El PDF sí está bien subido. Revisé la ruta actual y el archivo responde `200 OK` desde storage; además el contenido empieza con `%PDF-1.7`, así que no es un problema de upload.
- El bloqueo real viene del frontend: `src/pages/Archivos.tsx` todavía intenta mostrar el PDF con `<iframe src={blobUrl}>`. Eso termina usando el visor nativo de PDF de Chrome, y dentro del preview/modal puede quedar bloqueado, por eso aparece “This page has been blocked by Chrome”.

Plan de implementación

1. Reemplazar el visor nativo de PDF
- Quitar el `<iframe>` para PDFs en `PreviewDialog`.
- Usar un visor JS con PDF.js dentro del modal para renderizar las páginas directamente en la app.
- Mostrar loading, error y scroll vertical multipágina.

2. Corregir la lógica del modal
- Mover la carga del blob a `useEffect` en vez de ejecutarla durante el render.
- Limpiar correctamente cada `objectURL` cuando se cierre el modal o cambie el documento.
- Evitar re-renders y estados inconsistentes al abrir/cerrar varios PDFs.

3. Arreglar la descarga
- Mantener la descarga vía `storage.download()` y generar el archivo desde el blob local.
- Eliminar el fallback `window.open(doc.url, '_blank')`, porque esa ruta vuelve a disparar el visor bloqueado de Chrome.
- Revocar el object URL solo después de que la descarga haya arrancado, para no cortarla.

4. Mantener comportamiento del resto de archivos
- PDFs: vista previa real + descarga confiable.
- Word/Excel/PPT/TXT/CSV: seguirán con icono y descarga, sin intentar preview nativo si no aplica.

5. Limpieza complementaria
- Aprovechar para corregir el warning de consola asociado al `PreviewDialog` y dejar el componente sin side effects dentro del render.

Archivos previstos

- `src/pages/Archivos.tsx`
- Posible componente nuevo para encapsular el visor, por ejemplo `src/components/files/PdfViewer.tsx`
- Solo si hace falta, ajuste menor en `src/components/ui/dialog.tsx`

Detalles técnicos

- Causa raíz confirmada:
  - Storage responde bien.
  - Los PDFs son válidos.
  - El bloqueo ocurre al intentar renderizarlos con el visor nativo de Chrome dentro de un `iframe`.
- Fragilidades actuales que también voy a corregir:
  - `fetchBlob(...)` se dispara dentro del render.
  - El fallback de descarga usa `window.open(doc.url)`, que reabre la ruta problemática.
- No hace falta cambiar backend, base de datos ni storage; es un fix 100% frontend.

Validación después del cambio

- Abrir varios PDFs desde `/archivos`
- Confirmar que ya no aparece “This page has been blocked by Chrome”
- Confirmar preview dentro del modal
- Confirmar que “Descargar” baja el archivo correctamente
- Confirmar que los documentos no-PDF siguen funcionando igual
