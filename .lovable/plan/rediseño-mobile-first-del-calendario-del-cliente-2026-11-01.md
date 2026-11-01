# Rediseño mobile-first del calendario del cliente

Se aplica el documento y la imagen tal cual, solo en el calendario que se comparte con el cliente. No se toca nada del lado de agencia, ClickUp, base de datos ni la forma de aprobar. Este plan reemplaza la idea anterior de la "miniatura preliminar".

## Qué va a ver el cliente

**1. Calendario (pantalla principal)**
- Arriba: logo Socialify pequeño, logo y nombre del cliente con «Calendario de publicación».
- Selector naranja **Calendario | Piezas**.
- Dos tarjetas: «N piezas» y «N por revisar →» (la que lleva a pendientes), con los mismos conteos que hoy.
- Mes con flechas y una cuadrícula de 7 días.
- En celular cada día muestra un ícono y una etiqueta corta (REEL, POST, CAR., FOTO, HIST.) más un punto de estado; si hay varias piezas sale «+N». Al tocar un día se marca en naranja y abajo aparece «Publicaciones del [fecha]» con título completo, tipo, estado y botón Ver/Revisar.
- En tablet y computadora cada día muestra tarjetitas con tipo + título + estado, como en la imagen.
- «Instalar calendario» y «Actualizar» pasan a un botón «Más» (⋮), sin perder ninguna de las dos.

**2. Por revisar**
- Botón para volver, título, «N piezas pendientes» y tarjetas con tipo, título, fecha, estado y botón naranja «Revisar». Si no hay nada pendiente: «¡Todo al día!».

**3. Detalle de la pieza**
- Pantalla completa en celular y modal de dos columnas en computadora.
- Orden: cerrar → «REEL · 6 NOVIEMBRE» → título → dos bloques, Video y Portada, con su estado → reproductor → «Revisado por» → «Pedir cambios» / «Aprobar».
- En celular los botones quedan fijos abajo. No aparece «Aprobar» si eso ya está aprobado: en su lugar se muestra la confirmación y el historial.
- Si todavía no hay video, sale el mensaje «El video todavía está en preparación…».

**4. Piezas**
- Usa las mismas tarjetas que «Por revisar», con todas las piezas del mes.

## Miniaturas (lo que causaba confusión)
- Las tarjetas del calendario y de las listas ya no muestran la foto heredada de la hoja de producción. En su lugar llevan un recuadro oscuro con el ícono del tipo y el título.
- Solo se muestra una imagen cuando es la portada real que subió Ale (la que el cliente aprueba) o un fotograma del video real.
- En el detalle, el reproductor y la portada funcionan igual que hoy.

## Detalles técnicos
- El trabajo se hace solo en `src/pages/CalendarioPublico.tsx` y en componentes nuevos de presentación bajo `src/components/calendario-publico/`: `ContentTypeBadge`, `ContentStatusChip`, `ContentPieceCard`, `ReliablePreview`, `DayContentList`, `PendingReviewList`, `PublicCalendarGrid`.
- Se usa el `CalendarMonth` público o se reemplaza por una cuadrícula propia de la página, para que la versión de agencia no cambie.
- Los handlers de aprobar y pedir cambios, la validación del nombre, `hasCover`, el cálculo de pendientes y el endpoint `calendar-public` no se modifican. «Por revisar» es un filtro en pantalla que usa la misma condición que el contador actual.
- Imagen confiable = `cover_url` real o media final. `thumbnail_url` deja de usarse en las tarjetas públicas, pero no se borra.
- Pruebas con Playwright a 360, 375 y 390 px y en computadora, con B-Dental: sin desplazamiento horizontal, día → lista → detalle → volver, y la página de pendientes.
- Se agrega una regla a AGENTS.md: las tarjetas públicas no muestran `thumbnail_url` porque puede venir heredada.
