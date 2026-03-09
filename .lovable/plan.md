

## Plan: Flujo por pasos + Grid visual de anuncios en RegisterSaleDialog y AppointmentFormDialog

### Cambios en ambos dialogs

Convertir los dos formularios (Registrar Venta y Nuevo Lead) de un formulario largo a un **wizard multi-step** con botones "Anterior" y "Continuar", y cambiar la selección de anuncios de una lista vertical a un **grid visual de tarjetas**.

---

### Estructura de pasos

**RegisterSaleDialog (Ventas):**
- **Paso 1 - Información**: Monto, moneda, fecha, fuente, plataforma de mensaje, producto, cliente, notas, estado (si edita)
- **Paso 2 - Anuncio vinculado** *(solo si fuente = "ad" y hay ad account)*: Grid de anuncios con thumbnails en tarjetas 2 columnas. Si fuente != "ad", este paso se salta y se envía directo.

**AppointmentFormDialog (Leads):**
- **Paso 1 - Información del Lead**: Nombre, meta del cliente, vendedor asignado, estado, valor estimado, moneda, notas
- **Paso 2 - Fuente y Anuncio** *(solo si fuente = "ads" y hay ad account)*: Selector de fuente + grid visual de anuncios. Si fuente != "ads", se puede completar sin seleccionar anuncio.

---

### Grid visual de anuncios (compartido)

Crear un componente reutilizable `AdGridSelector` que:
- Muestra anuncios en un **grid de 2 columnas** con tarjetas
- Cada tarjeta: thumbnail (aspect-ratio 9:16 o cuadrado), nombre del anuncio, nombre de campaña, gasto, badge de estado
- Tarjeta seleccionada con borde de highlight (ring primary)
- Skeleton loading en grid
- Estado vacío centrado

### Navegación del wizard

- Indicador de paso (ej: "Paso 1 de 2") en la parte superior
- Progress bar sutil con dots o línea
- Footer con botones: "Anterior" (ghost, paso > 1), "Continuar" (paso < último), "Registrar/Guardar" (último paso)
- Validación por paso antes de avanzar (ej: paso 1 requiere campos obligatorios)

### Archivos a crear/editar

1. **Crear** `src/components/ventas/AdGridSelector.tsx` — componente reutilizable del grid de anuncios
2. **Editar** `src/components/dashboard/RegisterSaleDialog.tsx` — convertir a wizard 2 pasos, usar AdGridSelector
3. **Editar** `src/components/ventas/AppointmentFormDialog.tsx` — convertir a wizard 2 pasos, usar AdGridSelector

### Detalles técnicos

- Estado `step` (1 o 2) controlado con `useState`
- Lógica `maxStep`: si la fuente requiere anuncio y hay ad account → 2, sino → 1
- Al cambiar fuente en paso 1, resetear ad seleccionado
- Al abrir en modo edición, empezar en paso 1 con datos precargados
- El grid usa `useAllAds` existente, fetching solo cuando el paso de anuncio está activo

