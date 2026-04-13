

## Agregar funcion de Apartado en Ventas por Historia

### Concepto
Usar el campo `status` existente en `message_sales` (actualmente siempre `'completed'`) con un nuevo valor `'reserved'` para apartados. No se necesitan cambios en la base de datos.

### Cambios en `src/components/ventas/StoryStoreSales.tsx`

1. **Boton "Apartar" en el dialog de registro** — Agregar un segundo boton debajo de "Registrar Venta" con un color diferente (amber/yellow). Al hacer click, ejecuta el mismo flujo de registro pero con `status: 'reserved'` en lugar de `'completed'`.

2. **Nuevo Tab "Apartados"** — Agregar un tab entre "Vendidas" y las demas que muestre las historias con `status = 'reserved'`. Usar un icono y color diferenciado (amber).

3. **Query de apartados** — Modificar la query de `sold-story-ids` para traer tambien el `status`, y crear sets separados: `soldSet` (completed) y `reservedSet` (reserved). Las historias apartadas no deben aparecer como disponibles para vender.

4. **StoryCard para apartados** — En el grid de apartados, mostrar overlay amber (en vez de verde). Incluir un boton o click para "Confirmar venta" que actualice el status de `'reserved'` a `'completed'`.

5. **Visual en cards generales** — Si una historia esta apartada, mostrar un badge amber con icono de reloj/bookmark en vez del check verde de vendida.

### Detalle tecnico

- `handleSubmit` recibe un parametro `asReserved: boolean` — si true, pasa `status: 'reserved'` al `SaleInput`
- El hook `use-sales-tracking` ya soporta el campo `status` en el insert ya que la tabla lo acepta
- Para confirmar un apartado: `supabase.from('message_sales').update({ status: 'completed' }).eq('id', saleId)`
- Query actualizada: `select('story_id, amount, currency, customer_name, sale_date, product, brand, status, id')`

### Flujo del usuario
1. Click en historia → se abre dialog
2. Llena datos → puede elegir "Registrar Venta" (verde) o "Apartar" (amber)
3. Si aparta → la historia aparece en tab "Apartados" con overlay amber
4. Desde tab "Apartados" puede hacer click → confirmar la venta (cambia a completed)

