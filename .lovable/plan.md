# Recibo por correo más limpio con foto

## Cambios

- Simplificar el correo de **Recibo de entrega**: fondo totalmente blanco, texto oscuro, menos adornos, tipografía sencilla y mejor jerarquía.
- Mantener la información útil: título, cliente, fecha, folio, piezas grabadas, total, notas y botón para ver/compartir el recibo cuando esté habilitado.
- Si la hoja tiene una portada o foto asociada, mostrarla dentro del correo antes del detalle de piezas, con ancho completo y proporción controlada.
- Si no existe foto, el correo conserva el mismo orden sin dejar espacios vacíos.
- No modificar el formato de resumen editorial ni adjuntar archivos; la foto se mostrará directamente dentro del mensaje.

## Detalles técnicos

- Usar `production_sheets.thumbnail_url`, que ya almacena la foto asociada a la hoja.
- Escapar la URL antes de colocarla en el HTML y mantener estilos compatibles con clientes de correo.
- Conservar el envío actual, el registro del correo y el enlace público del recibo.
- Desplegar nuevamente la función que envía los resúmenes.

## Verificación

- Revisar el HTML con una hoja que tenga foto y otra sin foto.
- Confirmar fondo blanco, texto legible, foto sin deformación y ausencia de bloques decorativos innecesarios.
- Probar que el botón público y el envío continúen funcionando.
