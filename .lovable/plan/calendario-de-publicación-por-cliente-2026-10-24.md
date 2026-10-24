# Calendario de publicación por cliente

## Qué vas a tener
- **Nueva sección "Calendario"** en el menú (`/agencia/calendario`), controlable en "Quién ve qué".
- **Un calendario por cliente**: todos los clientes que tienen hojas de producción aparecen en un selector.
- **Al enviar a ClickUp**, cada pieza enviada entra al calendario de ese cliente como "Sin fecha", con título, copy, guion/explicación, referencias y el enlace a su tarea de ClickUp.
- **Bandeja "Por programar"** a un lado: arrastrás cada pieza al día del mes en que se publica (en celular: tocar pieza → elegir día).
- **Vista mes a mes** muy visual: cada día muestra las miniaturas de sus piezas, con color por estado (pendiente, aprobada, con cambios). Flechas para ir al mes anterior/siguiente. En celular pasa a lista por semana/día.
- **Detalle de pieza** (popup): miniatura grande, copy listo para publicar (editable por nosotros), explicación, plataforma, estado y el hilo de notas y correcciones.
- **Miniaturas**: subir imagen por pieza (solo imágenes livianas); si la hoja ya tiene foto, se usa como respaldo.

## Videos por enlace (Google Drive o Milanote), sin subirlos al panel
- Cada pieza tiene un campo **"Enlace del video"**: pegás el link de Google Drive o de Milanote. El video nunca se sube a la app.
- **Google Drive**: el video se reproduce dentro del popup (el reproductor de Drive) y, si no hay miniatura subida, se usa la vista previa de Drive como miniatura. Requisito: el archivo compartido como "Cualquier persona con el enlace puede ver".
- **Milanote**: con su opción "copiar link del video", la app revisa el enlace: si es el archivo del video, se reproduce dentro del popup; si abre el tablero, se muestra el botón **"Ver video en Milanote"** en otra pestaña.
- **Recomendado: Google Drive** para lo que ve el cliente, porque reproduce dentro del calendario de forma confiable.
- El cliente ve lo mismo desde su link: reproduce el video de Drive ahí mismo o abre el de Milanote.
- No hace falta conectar cuentas: funciona solo con los enlaces compartidos.

## Link para el cliente
- Botón **"Compartir"** genera un link público por cliente (`/calendario/<código>`), sin clave. Se puede regenerar para invalidar el anterior.
- El cliente ve el mismo calendario mes a mes (sin datos internos), abre cada pieza y puede:
  - **Aprobar** la pieza.
  - **Pedir cambios** escribiendo qué corregir.
- Antes de su primera acción se le pide su nombre, y queda registrado quién aprobó o pidió qué.
- El link no se indexa en buscadores.

## Sincronización con ClickUp
- **Pide cambios** → la tarea de esa pieza pasa al estado **"Editar cambios"** y se agrega un comentario con las correcciones del cliente y su nombre.
- **Aprueba** → la tarea pasa al estado **"Aprobado"** con un comentario de confirmación.
- Si el estado no existe en la lista de ClickUp, la pieza igual se marca en el calendario y se te avisa en la ficha para que crees ese estado.

## Detalles técnicos
- Tablas nuevas: `content_calendar_items` (client_id, shot_id, sheet_id, clickup_task_id, title, copy, explanation, platform, thumbnail_url, publish_date nullable, status pendiente|aprobado|cambios, sort) y `content_calendar_comments` (item_id, author_name, author_type agencia|cliente, kind nota|cambio|aprobacion, body). `content_calendar_shares` (client_id, token, revoked_at). RLS solo agencia; acceso público únicamente por edge function con el token.
- `clickup-create-tasks`: tras crear/actualizar tareas, upsert de items por `shot_id` (no duplica al reenviar; conserva fecha y estado).
- Edge function pública `calendar-public` (verify_jwt false): `get` (mes del cliente por token), `approve`, `request_changes`; valida token y entradas con Zod, actualiza estado ClickUp (`PUT /task/{id}` con status) y comenta (`POST /task/{id}/comment`).
- Miniaturas en bucket `content-images` bajo `calendar/<client_id>/`.
- Drag & drop con `@dnd-kit` (ya usado o se agrega); tiempo real del estado vía suscripción a `content_calendar_items`.
- Estilo: tema del panel de agencia; la página pública usa su propio bloque de colores (sale fuera del panel).
