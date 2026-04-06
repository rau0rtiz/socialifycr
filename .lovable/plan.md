# Cambiar sección Speak Up a español completo

## Problema

La sección de Speak Up está en inglés ("Sales", "Register Sale", "Student Database", etc.) pero el usuario quiere todo en español. Además, "Cash Collected" no refleja bien el modelo — lo que realmente mide es el **ingreso total** del mes (monto de ventas registradas), no necesariamente efectivo cobrado.

## Cambios

### 2. Página Ventas (header)

`**src/pages/Ventas.tsx**`

- Quitar condicionales `isSpkUp` del título y subtítulo — usar siempre "Ventas" / "Seguimiento y análisis de ventas"

### 3. SpeakUpSalesSummary (KPIs)

`**src/components/ventas/SpeakUpSalesSummary.tsx**`

- "Total Sales" → **"Ventas del mes"**
- "Cash Collected" → **"Ingresos"** (más preciso para el modelo: representa el monto total vendido)
- "Pending" → **"Por cobrar"**
- "New Students" → **"Nuevos estudiantes"**

### 4. SalesTrackingSection

`**src/components/dashboard/SalesTrackingSection.tsx**`

- Quitar condicional `isSpkUp` para el botón — usar siempre "Registrar Venta"
- Quitar condicional `isSpkUp` del título — usar siempre "Ventas"

### 5. Client Database

`**src/pages/ClientDatabase.tsx**`

- "Student Database" → **"Base de Estudiantes"**
- "Total Students" → **"Total estudiantes"**
- "Sold" → **"Vendidos"** (ya existe)
- "Active" → **"Activos"** (ya existe)
- "No students found" → **"No se encontraron estudiantes"**
- "students" → **"estudiantes"**

## Nota sobre "Cash Collected" → "Ingresos"

El KPI actual suma `amount` de ventas activas, que es el monto total de cada venta (no lo que se ha cobrado efectivamente). Renombrarlo a **"Ingresos"** es más preciso. El KPI de "Por cobrar" ya cubre las cuotas pendientes, así que queda claro: Ingresos = vendido total, Por cobrar = cuotas sin pagar.