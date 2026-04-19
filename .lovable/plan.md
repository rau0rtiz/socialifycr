

## Implementar 4 mejoras a Productos & Servicios

### 1. Categorías custom por cliente
- **Nueva tabla** `client_product_categories` (id, client_id, name, color, sort_order, created_at). RLS: team members read, admins manage.
- **UI**: dentro del `ProductFormDialog`, el campo "Categoría" se vuelve un selector con las categorías del cliente + opción "+ Nueva categoría" (crea inline).
- **Para Speak Up**: mantener compat con las 5 categorías hardcodeadas — si no hay categorías custom creadas, mostrar las predefinidas. Si el admin crea aunque sea una, usa solo las custom (o ambas, decidimos: **ambas concatenadas**).
- **Filtro**: en `ProductsManager` agregar dropdown "Categoría: Todas / X / Y / Z" junto a los demás filtros.
- **Visual**: chip de color en la tarjeta del producto.
- **Gestión**: agregar mini-pestaña "Categorías" dentro de la sección Productos & Servicios para CRUD de categorías (admin).

### 2. Histórico de cambios de precio
- **Nueva tabla** `product_price_history` (id, product_id, client_id, old_price, new_price, old_cost, new_cost, currency, changed_by, changed_at, reason).
- **Trigger** en `client_products` que detecta cambios en `price` o `cost` y graba automáticamente. `changed_by = auth.uid()`.
- **UI**: en el detalle del producto (al expandir), nueva sección "Historial de precios" con tabla compacta (fecha, precio anterior → nuevo, costo anterior → nuevo, quién, %). Sparkline mini opcional.
- **Hook**: `useProductPriceHistory(productId)`.

### 3. Importar productos desde CSV
- **UI**: botón "Importar CSV" arriba del listado (admin only). Abre dialog con:
  - Drop zone para `.csv`
  - Preview de las primeras 10 filas con mapeo de columnas (Nombre → name, Precio → price, etc.)
  - Plantilla descargable: link "Descargar plantilla CSV" con headers correctos y 2 filas ejemplo (1 producto + 1 servicio).
  - Selector de comportamiento: "Solo crear nuevos" / "Actualizar existentes por nombre" / "Reemplazar todo" (este último con confirmación fuerte).
- **Parser**: usar `papaparse` (ya común en stack) o parser nativo simple. Validación: nombre obligatorio, precio numérico, type ∈ {producto, servicio}.
- **Reporte final**: "Creados: X | Actualizados: Y | Errores: Z" con lista de filas con error.

### 4. Etiquetas/tags por producto
- **Nuevas tablas**:
  - `client_product_tags` (id, client_id, name, color, created_at) — catálogo de tags del cliente
  - `product_tag_assignments` (product_id, tag_id) — junction
- **RLS** estándar (team read, admin manage).
- **UI en `ProductFormDialog`**: nueva sección "Etiquetas" con multi-select (similar a `MultiTagSelector` de contenido) + botón "+ Crear nueva".
- **UI en `ProductCard`**: chips pequeños de tags debajo del nombre (max 3 visibles, "+N" para el resto).
- **Filtro**: en `ProductsManager` agregar filtro "Etiqueta" (multi-select). Producto debe tener TODAS las etiquetas seleccionadas para aparecer.

---

### Cambios técnicos resumidos

**Migración SQL (1 archivo):**
- 4 tablas nuevas: `client_product_categories`, `product_price_history`, `client_product_tags`, `product_tag_assignments`
- 1 trigger: `track_product_price_changes` en `client_products`
- RLS para todas

**Frontend:**
- `src/hooks/use-client-products.ts`: agregar fetch de tag IDs por producto
- `src/hooks/use-client-product-categories.ts` (nuevo)
- `src/hooks/use-client-product-tags.ts` (nuevo)
- `src/hooks/use-product-price-history.ts` (nuevo)
- `src/components/ventas/ProductFormDialog.tsx`: integrar selector de categoría custom + multi-tag
- `src/components/ventas/ProductsManager.tsx`:
  - Filtros: agregar Categoría + Etiqueta
  - Tarjeta: chip de categoría + chips de tags
  - Botones: "Importar CSV" + "Categorías"
  - Detalle: sección "Historial de precios"
- `src/components/ventas/ProductCategoriesDialog.tsx` (nuevo) — CRUD de categorías
- `src/components/ventas/ProductImportDialog.tsx` (nuevo) — wizard de import CSV
- `src/components/ventas/ProductPriceHistory.tsx` (nuevo) — tabla compacta

---

### Decisiones tomadas (te aviso si querés cambiar alguna)
- **Speak Up**: las 5 categorías hardcodeadas siguen disponibles + las que el admin agregue (concatenadas). Si querés migrarlas a la nueva tabla y borrar el hardcode, decímelo.
- **Tags = multi**: un producto puede tener varias.
- **Historial de precios**: arranca desde el momento en que se aplica esta migración (no se backfilea). Productos existentes muestran "Sin cambios registrados".
- **CSV**: solo admin puede importar (no editores). Encoding esperado UTF-8.
- **Eliminar categoría con productos asignados**: bloqueado con mensaje "X productos usan esta categoría, reasignalos primero".

