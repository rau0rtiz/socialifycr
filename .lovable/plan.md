
## Objetivo
Permitir registrar ventas de TikTok (canal manual, sin lead) para Comfortex y verlas reflejadas en el Dashboard sin saturar los widgets existentes de Instant Form.

## Cómo se guardan (fuente única: `message_sales`)
Reutilizamos la tabla `message_sales` con `source = 'tiktok'` para que:
- No creemos tablas nuevas.
- Las ventas TikTok convivan con las de Instant Form pero se puedan filtrar aparte.
- La atribución por canal quede limpia (`source='ad'` = Instant Form / Meta, `source='tiktok'` = TikTok manual).

Campos que se llenan al registrar:
- `client_id`, `created_by`, `sale_date` (hoy)
- `source = 'tiktok'`, `currency = 'CRC'`
- `customer_name`, `customer_phone`
- `subtotal`, `tax_amount` (IVA), `amount` (total = subtotal + IVA)
- `product` = etiqueta con la cantidad de camisas (formato compatible con `parseFormSaleNotes` / `buildSaleProductLabel` para que el widget de volumen sume las camisas)
- `notes` con quantity embebida (mismo formato que Instant Form) para reutilizar `parseFormSaleNotes`
- `status = 'completed'`

No se crea `instant_form_lead` ni se toca la cola del CRM; TikTok es un canal aparte.

## 1. Registro manual desde el CRM del vendedor (`/mis-leads`)

En `SellerCrm.tsx` agregar un botón secundario en el header: **"+ Venta TikTok"** (icono TikTok o Music2, discreto, al lado de Actualizar/Notificaciones).

Nuevo componente `TikTokSaleDialog.tsx` (en `src/components/seller-crm/`):
- Formulario simple de 1 paso:
  - Nombre (input)
  - Teléfono (input)
  - Cantidad de camisas (number, default 1)
  - Monto sin IVA (subtotal)
  - IVA (%, default 13, editable)
  - Total (calculado, read-only, resaltado)
  - Notas opcionales
- Canal fijo mostrado como badge "TikTok" (no editable)
- Botón "Registrar venta"
- Al guardar: llama a nueva mutación `useRegisterTiktokSale(clientId)` y muestra toast.

Vista manager (owner/admin/manager): mismo botón, pero requiere `selectedClient` (usa el cliente activo del `BrandContext`).
Vista vendedor (self): sin cliente activo — resolvemos el `client_id` a partir del cliente donde el vendedor está en `client_team_members` (Comfortex). Si el vendedor pertenece a varios clientes, mostramos un `Select` de cliente dentro del dialog.

## 2. Nuevo hook `useTiktokSales` y mutación

Archivo nuevo: `src/hooks/use-tiktok-sales.ts`
- `useTiktokSales(clientId)` — query `message_sales` filtrando `source='tiktok'` (mismo shape que `InstantFormSale`).
- `useRegisterTiktokSale(clientId)` — inserta en `message_sales` con la lógica descrita arriba. Usa los helpers `buildSaleProductLabel` / `buildSaleNotes` ya existentes en `use-instant-form-leads.ts` (los exportamos si no lo están).
- `useDeleteTiktokSale(clientId)` — para el widget del dashboard.

## 3. Widget en Dashboard: `TiktokSalesWidget`

Archivo nuevo: `src/components/dashboard/TiktokSalesWidget.tsx`, clonando la estructura de `InstantFormSalesWidget` pero:
- Título "Ventas TikTok" con icono (Music2)
- Lista compacta de las últimas ventas con nombre, cantidad, total, fecha
- Filtro de rango (Hoy / 7d / 30d / Mes / Todo)
- KPIs arriba: total ventas, monto total, camisas totales
- Acciones por fila: editar / eliminar (opcional en v1, dejamos solo eliminar)

Se agrega en `Dashboard.tsx` justo debajo del `InstantFormSalesWidget` dentro del bloque Comfortex (`isComfortex`), en la misma grid de 2 columnas para no saturar.

## 4. Atribución en los widgets existentes (sin saturar)

Para que las ventas TikTok también se reflejen sin duplicar UI:
- **`ComfortexVolumeWidget`**: extender el `useMemo` de ventas reales para sumar también los `message_sales` de `source='tiktok'` del rango. El widget mostrará "camisas vendidas (real)" incluyendo ambos canales. Añadir una nota pequeña: "Instant Form + TikTok".
- **`ComfortexSalesByAdWidget`**: NO se modifica (es específico de ads de Meta). TikTok no aplica ahí.
- **`InstantFormSalesWidget`**: NO se modifica (sigue mostrando solo ventas ligadas a leads Instant Form).

Así el nuevo widget de TikTok es el único lugar donde se ve el detalle por venta TikTok, y el volumen total consolidado ya suma ambos canales.

## 5. Detalles técnicos

- Los helpers `buildSaleProductLabel` y `buildSaleNotes` de `use-instant-form-leads.ts` se exportan (hoy son internos) para reutilizarlos.
- `parseFormSaleNotes` ya parsea `notes` y saca `quantity`; funcionará igual para ventas TikTok.
- Feature flag: usar el mismo criterio actual (`isComfortex` por `client_id`). No agregamos flag nuevo en esta iteración.
- Tabla `message_sales` no requiere migración; `source` es texto libre y ya se usa con valores como `ad`, `story`, `other`.

## Archivos afectados
- **Nuevos**: `src/hooks/use-tiktok-sales.ts`, `src/components/seller-crm/TikTokSaleDialog.tsx`, `src/components/dashboard/TiktokSalesWidget.tsx`
- **Editar**: `src/hooks/use-instant-form-leads.ts` (exportar helpers), `src/pages/SellerCrm.tsx` (botón + dialog), `src/pages/Dashboard.tsx` (montar widget), `src/components/dashboard/ComfortexVolumeWidget.tsx` (sumar TikTok al volumen real).

## Fuera de alcance (v1)
- Editar ventas TikTok (solo crear/eliminar).
- Vincular una venta TikTok a un video específico o URL de TikTok (se puede agregar después con un campo `notes` o `utm_source`).
- Métricas de TikTok Ads API.
