

## Plan: Simplify Alma Bendita Story Sale Registration & Edit Dialog

### What changes

**Goal**: Make the StoryStoreSales create form and the general RegisterSaleDialog edit view match for Alma Bendita, with only these 6 fields:
1. **Cliente** (required) + **Teléfono**
2. **Marca** (brand)
3. **Monto** (₡)
4. **Fecha** (default: today)
5. **Vendedor** (default: current user's name from profile)
6. **Notas adicionales**

### Database migration

Add two new columns to `message_sales`:
- `customer_phone TEXT` — phone number
- `brand TEXT` — brand/marca

These are nullable so they don't break existing sales.

### File changes

**1. `src/components/ventas/StoryStoreSales.tsx`**
- Replace current form fields (Producto, Monto, Fecha, Cliente optional, Notas) with the 6 new fields
- Make `customerName` required (validation before submit)
- Add state for `customerPhone`, `brand`, `sellerName` (default from profile query)
- Fetch current user's profile name on mount for seller default
- Update `handleSubmit` to pass new fields (`customer_phone`, `brand`, `closer_name` for seller) to `addSale`
- Update the "Vendidas" tab sold card overlay to show brand if available

**2. `src/hooks/use-sales-tracking.ts`**
- Add `customer_phone` and `brand` to `SaleInput` and `MessageSale` interfaces
- Include them in the insert/update mutations and select queries

**3. `src/components/dashboard/RegisterSaleDialog.tsx`**
- Detect `isAlmaBendita` from `selectedClient`
- When Alma Bendita + editing: skip the multi-step wizard, render a single-view form with the same 6 fields (Cliente + Teléfono, Marca, Monto, Fecha, Vendedor, Notas)
- Pre-populate from `editingSale` data
- On submit, pass the simplified fields

**4. `src/components/dashboard/SalesTrackingSection.tsx`**
- No structural changes needed; it already passes `editingSale` to `RegisterSaleDialog`

### Technical notes
- `closer_name` column (already exists) will store the "Vendedor" value
- `product` field renamed to "Marca" in the UI for Alma Bendita context
- Current user name fetched via `supabase.from('profiles').select('full_name').eq('id', user.id)` for default seller

