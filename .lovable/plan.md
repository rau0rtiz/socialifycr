

# Variantes de Producto en Business Setup

## Problema
Speak Up tiene productos principales (Clases Personalizadas, Clases Grupales, TOEIC) donde cada uno tiene variantes con precios distintos (ej: 2 clases/semana vs 3 clases/semana). Actualmente se usan "Esquemas de pago" que combinan variante + plan de cuotas, lo cual funciona pero la UI no es clara.

## Solución
Renombrar "Esquemas de pago" a **"Variantes"** en la UI y ajustar el flujo para que sea mas intuitivo. No se necesitan cambios en la base de datos: la tabla `product_payment_schemes` ya tiene `name`, `total_price`, `num_installments`, `installment_amount` y `currency` -- todo lo necesario para representar variantes con precios y opciones de cuotas.

Esto aplica para todos los clientes, no solo Speak Up, porque el concepto es universal.

---

## Cambios

### 1. ProductsManager — Renombrar UI y mejorar flujo
**Archivo:** `src/components/ventas/ProductsManager.tsx`

- Renombrar `PaymentSchemesSection` label de "Esquemas de pago" → **"Variantes"**
- Boton: "Agregar esquema" → **"Agregar variante"**
- Placeholder del nombre: "Ej: Pago unico, 3 cuotas..." → **"Ej: 2 clases/semana, Intensivo, Premium..."**
- Empty state: "Sin esquemas de pago" → **"Sin variantes"**, "Agrega variantes con diferentes precios y opciones de cuotas"
- En la card de producto en el listado, mostrar cantidad de variantes como badge (ej: "3 variantes")
- Quitar el campo `price` del producto padre (ya que el precio vive en cada variante) — o dejarlo como "precio base/referencia" opcional

### 2. RegisterSaleDialog — Ajustar labels
**Archivo:** `src/components/dashboard/RegisterSaleDialog.tsx`

- Donde se selecciona el esquema de pago, cambiar label de "Esquema de pago" → **"Variante"**
- El dropdown ya muestra las opciones por producto, solo cambiar textos

### 3. Card de producto — Mostrar variantes inline
**Archivo:** `src/components/ventas/ProductsManager.tsx`

En la tarjeta de cada producto en el listado, en vez de mostrar solo el precio base, mostrar un resumen como:
- "3 variantes · desde ₡85,000" (el precio mas bajo de sus variantes)
- Esto da visibilidad sin abrir el detalle

---

## Detalle tecnico

**Sin migraciones de DB** — la tabla `product_payment_schemes` ya soporta todo.

**Archivos a modificar:**
1. `src/components/ventas/ProductsManager.tsx` — renombrar labels, mostrar badge de variantes, ajustar empty states
2. `src/components/dashboard/RegisterSaleDialog.tsx` — renombrar label del selector de esquema

**Logica de precio en card:**
```typescript
// En la card del producto, calcular rango de precios desde variantes
const minPrice = schemes.length > 0 
  ? Math.min(...schemes.map(s => s.total_price)) 
  : product.price;
```

