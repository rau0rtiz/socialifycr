
# Plan: Tissue — inventario por variantes + flujo de venta + apartados

Cliente "Tissue" ya existe en BD (`1dc03e21-…`). Reutilizamos toda la base de Alma Bendita (CRC, story store, customer DB, productos) y agregamos lo que falta: **variantes de talla/color con stock y precio por variante**, **dropdowns canónicos** (marca, tipo de prenda, talla, color) y **flujo de apartados**.

---

## 1. Base de datos (migración)

**Catálogos compartidos por cliente** — alimentan los dropdowns:
- `product_brands` (id, client_id, name) — con UNIQUE(client_id, name).
- `product_categories_catalog` (id, client_id, name) — tipos de prenda (Camisa, Pantalón, Vestido…).
- `product_sizes` (id, client_id, name, sort_order) — XS/S/M/L o numéricas.
- `product_colors` (id, client_id, name, hex_code) — con swatch.

Todas con RLS estándar `has_client_access`. Botones "+ Agregar" en cada dropdown insertan en estos catálogos.

**Variantes**:
- `product_variants` (id, product_id, client_id, size, color, sku, price, photo_url, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
- UNIQUE(product_id, size, color).
- Trigger: si el producto tiene variantes, `client_products.stock_quantity` se vuelve la **suma** de variantes (vista derivada).

**Movimientos de stock por variante**:
- Agregar columna `variant_id uuid` a `product_stock_movements`.
- Agregar `variant_id` a `message_sales` para que cada venta descuente la variante exacta.

**Apartados** (reutilizamos lo existente de Alma Bendita):
- `message_sales.status` ya soporta valores; agregamos uso de `'apartado'` con `reservation_expires_at date` y `deposit_amount numeric`. La venta queda visible pero **no cuenta para meta** hasta pasar a `'completed'` (igual que la lógica actual de apartados).

---

## 2. Foto/cámara (subida a Storage)

- Reutilizamos bucket público existente `content-images` con prefijo `tissue/products/{product_id}/...` y `tissue/variants/{variant_id}/...`.
- Componente `<PhotoCapture>` nuevo: input `<input type="file" accept="image/*" capture="environment">` para abrir cámara en móvil + fallback a galería en desktop. Compresión client-side a max 1280px / ~300KB antes de subir (canvas + `toBlob`). Subida directa con `supabase.storage`.
- **Test de funcionamiento**: el flujo se valida vía script `e2e` que mockea `File`, ejecuta el helper de compresión y hace upload contra el bucket. Se reportan los resultados en consola.

---

## 3. UI — Business Setup

Nueva pestaña **"Inventario"** dentro de Business Setup, visible cuando el cliente es Tissue (y reutilizable):

a. **Catálogos** (panel colapsable arriba): chips editables para Marcas / Tipos / Tallas / Colores. "+" inline crea entrada nueva.

b. **Lista de productos** (reusa `ProductsManager` con extensiones):
   - Tabla con thumbnail, nombre, marca, categoría, **stock total** (suma de variantes), # variantes, precio mín–máx.
   - Click → abre **ProductDetailDrawer** con tabs: *General* | *Variantes* | *Movimientos*.

c. **ProductFormDialog v2** (rápido y poco denso):
   - Paso 1: foto (cámara o galería) + nombre + marca (dropdown+add) + tipo de prenda (dropdown+add) + descripción opcional.
   - Paso 2 (opcional): "¿Tiene variantes?" → tabla rápida talla×color con price y stock inicial. Si no, precio simple + stock simple.
   - Botón "Guardar y agregar otro" para carga rápida.

d. **Ingreso de mercadería** (botón "Recibir mercadería" en el drawer del producto):
   - Grid talla×color con inputs de cantidad + foto opcional por variante.
   - Al guardar inserta `product_stock_movements` con `movement_type='in'` y actualiza `product_variants.stock_quantity`.

---

## 4. UI — Flujo de venta (Tissue)

Extendemos `RegisterSaleDialog` con bloque condicional `isTissue`:

- **Paso producto**: dropdown de productos del catálogo (con thumbnail). Al seleccionar:
  - Si tiene variantes → muestra grid de variantes disponibles (chips talla/color con swatch + stock restante en vivo). Bloquea variantes con stock 0.
  - Precio se autocompleta desde la variante (editable si hace falta).
- **Cliente**: autocompletar contra `customer_contacts` (ya existe). Si no existe, se crea inline con teléfono.
- **Origen**: dropdown "Tienda física" / "Publicidad" / "DM orgánico" / "Story". Si "Publicidad" → aparece selector de campaña/anuncio (ya implementado en `AdGridSelector`).
- **Vendedora**: dropdown con las 2 closers (se cargan vía `client_team_members` rol `closer`). Persistido en `closer_name`.
- **Tipo de transacción**: toggle "Venta" / "Apartado".
  - Apartado pide `deposit_amount` y `reservation_expires_at` (default +14 días). Marca `status='apartado'`.
- **Confirmar** → inserta `message_sales` con `variant_id`, descuenta stock vía trigger (insert automático en `product_stock_movements` `movement_type='sale'`).

---

## 5. UI — Página `/ventas` para Tissue

Reutiliza el shell de Alma Bendita pero adapta widgets:
- KPIs: ventas hoy / semana / mes (CRC).
- **Apartados activos** (kanban "Próximos a vencer / Vencidos / Concretados") usando filtros sobre `status='apartado'`.
- **Top productos / top marcas / top tallas** (reusa `SalesByBrandChart`, `SalesByProductChart`, `SalesBySizeChart`).
- **Stock bajo**: lista de variantes con `stock_quantity <= low_stock_threshold`.
- **CRM** (`/clientes`): ya existe `customer_contacts`; se enriquecerá `garment_sizes` y `preferred_brands` automáticamente con cada compra.

---

## 6. Archivos a crear / editar

**Nuevos**
- `supabase/migrations/<ts>_tissue_inventory.sql` — catálogos, `product_variants`, columnas `variant_id`, triggers de stock.
- `src/hooks/use-product-catalogs.ts`, `use-product-variants.ts`.
- `src/components/inventory/CatalogManager.tsx` (chips + add).
- `src/components/inventory/VariantMatrix.tsx` (grid talla×color).
- `src/components/inventory/ReceiveStockDialog.tsx`.
- `src/components/common/PhotoCapture.tsx` (cámara + compresión).
- `src/pages/Ventas` bloque `TissueSalesView` (o reutilizar el de Alma con flag).

**Editar**
- `src/components/ventas/ProductFormDialog.tsx` — wizard con foto, marca, categoría, variantes opcionales.
- `src/components/ventas/ProductsManager.tsx` — drawer con tabs y stock total.
- `src/components/dashboard/RegisterSaleDialog.tsx` — rama `isTissue` con selector de variante y modo apartado.
- `src/pages/Ventas.tsx` — `const isTissue = …'tissue'…` y wiring.
- `src/pages/BusinessSetup.tsx` — pestaña Inventario.

---

## 7. Verificaciones post-build

- Subir foto desde móvil real (cámara) y desktop (file picker) — confirmar URL pública del bucket.
- Crear producto "Camisa Oversize Negra" con variantes S/M/L × Negro/Blanco, precios distintos, stock inicial.
- Registrar venta seleccionando variante M-Negro → stock baja en vivo, movimiento `'sale'` queda registrado, cliente queda en CRM con talla M.
- Registrar apartado con vencimiento +14d → no cuenta para meta, aparece en kanban.

---

## Notas técnicas

- Reuso del bucket `content-images` (público, 5MB límite) — no se crea bucket nuevo.
- Inventario es **opt-in por producto** (`track_stock=true`). Productos sin variantes mantienen comportamiento actual.
- Catálogos por `client_id` para no contaminar otros clientes.
- Las dos vendedoras se gestionan vía `client_team_members` rol `closer` (ya soportado), no requiere modelo nuevo.
- No se duplica el cliente: una sola "Tissue" cubre las dos cuentas IG; si más adelante quieren separar, se agrega una columna `ig_account` opcional al `message_sales`.
