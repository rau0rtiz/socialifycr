## Objetivo
1. En **TODOS los flujos de Tissue** (catálogo en BusinessSetup, atajo de venta, inventario), usar `TissueProductDialog` y permitir crear **variantes con foto en el mismo momento** que se crea el producto (sin doble paso).
2. Cada variante puede tener su propia **foto**.
3. **Mega-optimización móvil / PWA** del flujo de creación.
4. **Eliminar el drag lateral** (swipe horizontal / pull-to-refresh / overscroll) en todo el PWA.

---

## 1. Rediseñar `TissueProductDialog.tsx` — variantes en draft

Hoy obliga a guardar primero el producto para luego crear variantes (necesita `productId`). Cambio:

- Estado local `draftVariants: DraftVariant[]` con `{ tempId, size, color, price, stock, photoUrl }`.
- Componente nuevo `DraftVariantList` (inline, no usa `useProductVariants` para drafts):
  - Una fila por variante con: foto (PhotoCapture sm), talla (select), color (select), precio, stock, eliminar.
  - Botón flotante "+ Variante" abajo, mobile-first (full-width, h-11, sticky).
- Atajos rápidos: chips "Generar tallas: XS S M L XL" → crea 5 variantes en blanco con esa talla.
- En modo edición carga las variantes reales como drafts (`useProductVariants`) y al guardar hace upsert/diff.
- `handleSave`:
  1. Crea/actualiza producto base (1 query).
  2. Por cada variante draft: si tiene `tempId` → insert; si tiene `id` real → update; los reales que se quitaron → delete.
  3. Las fotos ya están subidas (PhotoCapture sube on-pick).

## 2. Foto por variante
Ya soportado en schema (`product_variants.photo_url`) y `PhotoCapture` lo permite con `folder="tissue/variants/draft-{tempId}"`. En la fila draft se muestra como avatar 56x56 con cámara/galería.

## 3. Optimización móvil / PWA del dialog
- `DialogContent`: `max-w-lg`, `h-[100dvh] sm:h-auto sm:max-h-[90vh]`, full-screen en mobile (`sm:rounded-xl rounded-none`), header sticky, footer sticky con CTA grande.
- Inputs `h-11` (44px touch target), labels compactos.
- Selects nativos (ya están) — funcionan mejor en mobile que Radix Select.
- Foto principal y de variantes priorizando `capture="environment"` (cámara directa).
- Grid 2 cols en variantes para que entren en celular.
- Botón principal "Guardar producto" sticky abajo, ancho completo, h-12.

## 4. Usar `TissueProductDialog` en todos los flujos
- **`ProductsManager.tsx`** (Catálogo en Business Setup): cuando `isTissue`, abrir `TissueProductDialog` en vez de `ProductFormDialog`.
- **`RegisterSaleDialog.tsx`** (registro de venta general): cuando `isTissue`, atajo de "Crear producto" abre `TissueProductDialog`.
- **`TissueInventoryView.tsx`**: ya usa `TissueProductDialog` (queda igual, hereda mejoras).
- **`TissueSaleDialog.tsx`**: ya usa `TissueProductDialog` (queda igual).

## 5. Quitar drag lateral en PWA (global)
En `src/index.css`:
```css
html, body {
  overflow-x: hidden;
  overscroll-behavior: none; /* bloquea pull-to-refresh y swipe lateral */
  touch-action: pan-y;       /* solo permite scroll vertical */
}
@media (display-mode: standalone) {
  html, body { overscroll-behavior: contain; }
  body { -webkit-user-select: none; user-select: none; }
}
```
También en `index.html` agregar meta `viewport-fit=cover` si no está, y `apple-mobile-web-app-capable=yes` (verificar — probable que ya esté).

---

## Archivos editados
- `src/components/inventory/TissueProductDialog.tsx` — rediseño con drafts + foto por variante + mobile-first.
- `src/components/ventas/ProductsManager.tsx` — gating `isTissue` para abrir `TissueProductDialog`.
- `src/components/dashboard/RegisterSaleDialog.tsx` — gating `isTissue` para abrir `TissueProductDialog`.
- `src/index.css` — bloquear gestos horizontales / overscroll.

## Notas
- No tocar `VariantEditor.tsx` (sigue siendo el editor "live" para edición ya guardada en Inventory si se sigue usando, pero el nuevo dialog lo reemplaza para creación).
- Schema sin cambios.
