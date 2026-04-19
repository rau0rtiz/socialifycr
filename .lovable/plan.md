

User wants a major overhaul of the products section for Dra Silvia. Let me check the current ProductsManager to understand what exists.
<lov-tool-use id="toolu_vrtx_01HT5jyJdAZ72ACNrem788xt" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/ventas/ProductsManager.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01BPFEn7DvsfR98FRKMLSctY" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/ventas/ProductsManager.tsx\"}">
</lov-tool-use>
I have enough context. Let me also check briefly the ProductFormDialog area for the broken inventory toggle issue.
<lov-tool-use id="toolu_vrtx_014btvC3m7m72bVDw3AWgjnW" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/ventas/ProductsManager.tsx\", \"lines\": \"500-799\"}">
</lov-tool-use>
Found the bug — `ProductsManager.tsx` has its **own local edit dialog** (lines 686–780) that **doesn't include the inventory fields** at all, which is why the toggle "no aparece" cuando se edita desde la sección Productos. The standalone `ProductFormDialog` sí los tiene, pero no se está usando aquí.

Now I have a clear picture. Let me present the plan.

<lov-plan>

## Resumen de mejoras a Productos & Servicios

### Bug confirmado
El dialog de **editar producto** en `ProductsManager.tsx` (líneas 686-780) es una versión vieja que **no incluye los campos de inventario** — por eso no podés activar "Llevar control de inventario" al editar. El `ProductFormDialog` reusable sí los tiene pero no se usa en esta sección. Solución: reemplazar el dialog inline por el componente reusable (que ya tiene todo).

---

### Cambios propuestos

#### 1. Renombrar sección → "Productos y Servicios"
Card title + ícono dual (Package / Wrench).

#### 2. Tipo: Producto vs Servicio (color-coded)
- Nueva columna `product_type` en `client_products` (`'product' | 'service'`, default `'product'`).
- Selector en el form: tarjetitas grandes con ícono.
- En la tarjeta del listado: chip de color (azul = Producto, púrpura = Servicio) + barra lateral del mismo color.
- Servicios ocultan automáticamente la sección de inventario (muestran "No aplica para servicios").

#### 3. Información visible en cada tarjeta (sin abrir)
Layout enriquecido del `ProductCard`:
- Nombre + chip tipo (producto/servicio)
- Precio | Costo | **Profit** (calculado: precio − costo, con color verde/ámbar/rojo según margen)
- **Stock con color**: verde (OK), ámbar (≤ umbral), **rojo grande con ⚠** (sin stock o crítico)
- Duración estimada (ej: "45 min") con ícono de reloj
- Para servicios: solo precio + duración (sin stock)

#### 4. Buscador + filtros
Barra arriba del listado con:
- **Input de búsqueda** (filtra nombre + descripción, en vivo)
- **Filtro tipo**: Todos / Productos / Servicios
- **Filtro stock**: Todos / Bajo stock / Sin stock / OK (solo aplica a productos)
- **Orden**: Nombre / Precio / Stock / Margen
- Contador de resultados ("12 de 34")

#### 5. Fix dialog de edición
Reemplazar el form inline (líneas 686-780) con `<ProductFormDialog>` que ya tiene:
- Toggle "Llevar control de inventario" funcional
- Campos stock_quantity / low_stock_threshold / stock_unit
Agregar al `ProductFormDialog`:
- Tipo (producto/servicio)
- Duración estimada en minutos (`estimated_duration_min`)
- Validación: si tipo=servicio, oculta sección de inventario completa

#### 6. Profit visible
- En la tarjeta: badge "Profit: ₡X (margen Y%)" cuando hay precio + costo
- En el detalle: ya existe pero refinado

#### 7. Stock "No aplica" para servicios
En la sección de inventario del detalle, si es servicio: muestra mensaje "Los servicios no llevan inventario" en lugar del estado actual.

---

### Cambios a base de datos
Migración:
```sql
ALTER TABLE client_products
  ADD COLUMN product_type text NOT NULL DEFAULT 'product' 
    CHECK (product_type IN ('product','service')),
  ADD COLUMN estimated_duration_min integer;
```

Backfill: nada — todos los productos existentes quedan como `'product'`. La Dra Silvia puede marcar consultas/tratamientos como servicio después.

---

### Archivos a editar
- **Migración SQL**: agregar `product_type` + `estimated_duration_min`.
- `src/hooks/use-client-products.ts`: agregar campos al interface + `buildPayload`.
- `src/components/ventas/ProductFormDialog.tsx`: agregar selector tipo, campo duración, ocultar inventario si tipo=servicio.
- `src/components/ventas/ProductsManager.tsx`:
  - Renombrar título.
  - Agregar barra de búsqueda + filtros (estado local + `useMemo`).
  - Enriquecer `ProductCard` (chip tipo, profit, duración, alerta stock más prominente).
  - **Eliminar** dialog inline de edición y usar `ProductFormDialog` reusable.
  - Ajustar `StockSection` para mostrar "No aplica" cuando es servicio.

---

### Lo que sentí que falta y agregué a la propuesta
1. **Color lateral** en la tarjeta (no solo un chip) para distinguir tipo de un vistazo.
2. **Profit visible en la tarjeta** (no solo en detalle).
3. **Filtro por estado de stock** (no solo búsqueda por nombre).
4. **Ordenamiento** (útil cuando hay >20 productos como en la clínica).
5. **Contador de resultados** filtrados.

### Lo que NO incluyo (decímelo si querés que sí)
- Categorías custom por cliente (ya existe el campo `category` pero solo Speak Up lo usa con grupos predefinidos). Para Dra Silvia podría agregarse ("Tratamientos faciales", "Inyectables", "Consultas"…) — ¿lo agregamos?
- Histórico de cambios de precio.
- Importar productos desde CSV.
- Etiquetas/tags por producto.

¿Procedo con esta implementación o ajustás algo (por ejemplo agregar categorías custom para clínica)?

