Voy a corregir el problema desde la fuente: el sincronizador está reimportando leads y sobrescribiendo `lead_status` con `new`, por eso al recargar parece que todos vuelven a Nuevo.

Plan:
1. Ajustar la función de sincronización de leads para que, si el lead ya existe, preserve el `lead_status` guardado en la base de datos.
2. Solo asignar `new` automáticamente cuando el lead es realmente nuevo o cuando el estado existente está vacío/inválido.
3. Evitar que una columna `estado` del Google Sheet vuelva a pisar cambios hechos por el vendedor dentro del CRM.
4. Mantener intactos los demás campos que sí deben actualizarse desde la sincronización: nombre, teléfono, campaña, formulario, respuestas, etc.
5. Verificar que el flujo quede consistente: cambio de estado en CRM → recarga/refetch/sync → el estado se mantiene hasta que el vendedor lo cambie de nuevo.

Resultado esperado: los estados `Contactado`, `Seguimiento`, `Venta` y `Perdido` ya no regresan automáticamente a `Nuevo` después de refrescar o sincronizar.