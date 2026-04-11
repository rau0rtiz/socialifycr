

## Plan: Sistema Integral Speak Up — Productos, Estudiantes, Profesores y Ventas

### Resumen

Rediseñar el flujo de Speak Up para manejar: categorías de producto con frecuencia de clases y horarios, una base de datos de estudiantes (con encargados para menores), profesores con disponibilidad, y un flujo de ventas que conecte todo con cobros recurrentes, IVA, descuentos y asignación de profesor.

---

### Fase 1: Base de datos — Nuevas tablas y cambios

**1.1 Tabla `student_contacts` (nueva)** — Reemplaza la dependencia en `setter_appointments` para Speak Up.

| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK | |
| full_name | text NOT NULL | |
| phone | text | |
| email | text | |
| id_number | text | Cédula |
| age | integer | |
| gender | text | |
| notes | text | |
| guardian_name | text | Para menores <18 |
| guardian_phone | text | |
| guardian_id_number | text | |
| guardian_email | text | |
| status | text DEFAULT 'active' | active/inactive |
| created_at, updated_at | timestamps | |

RLS: team members CRUD, admins ALL.

**1.2 Tabla `client_teachers` (nueva)** — Profesores del cliente.

| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK | |
| name | text NOT NULL | |
| email | text | |
| phone | text | |
| available_schedules | jsonb | Array de bloques: `[{day: 'lunes', start: '08:00', end: '12:00'}]` |
| product_ids | uuid[] | Productos que puede impartir |
| audience_types | text[] | `['adults','children','corporate']` |
| status | text DEFAULT 'active' | |
| created_at, updated_at | timestamps | |

RLS: team members CRUD, admins ALL.

**1.3 Cambios en `client_products`** — Agregar campos de categorización y frecuencia.

| Columna nueva | Tipo | Nota |
|---|---|---|
| category | text | `certification`, `private`, `group`, `corporate` |
| audience | text | `adults`, `children`, `all` |
| is_recurring | boolean DEFAULT false | Mensual recurrente vs one-off |
| class_frequency | jsonb | `{sessions_per_week: 3, hours_per_session: 1}` |
| available_schedules | jsonb | Horarios en que se imparte: `[{day:'lunes', start:'09:00', end:'10:00'}]` |
| tax_applicable | boolean DEFAULT false | Si aplica IVA |
| tax_rate | numeric DEFAULT 13 | Porcentaje de IVA |

**1.4 Cambios en `message_sales`** — Vincular con estudiante, profesor, IVA y descuento.

| Columna nueva | Tipo | Nota |
|---|---|---|
| student_contact_id | uuid | FK a `student_contacts` |
| teacher_id | uuid | FK a `client_teachers` |
| assigned_schedule | jsonb | Horarios asignados al estudiante |
| discount_amount | numeric DEFAULT 0 | |
| discount_reason | text | Obligatorio si hay descuento |
| tax_amount | numeric DEFAULT 0 | IVA calculado |
| subtotal | numeric | Monto antes de IVA/descuento |
| payment_day | integer | Día del mes para cobro recurrente (1-31) |

---

### Fase 2: Backend — Business Setup (Profesores)

- Agregar sección **"Profesores"** en `/business-setup` (solo visible para Speak Up)
- CRUD de profesores con: nombre, email, teléfono
- Definir horarios disponibles por día de la semana (bloques de tiempo)
- Seleccionar qué productos pueden impartir (multi-select del catálogo)
- Definir audiencia que manejan (niños, adultos, corporativo)

---

### Fase 3: Productos — Nuevo formato con categorías

- Modificar `ProductsManager` para incluir:
  - Selector de **categoría** (Certificaciones, Clases Personalizadas, Clases Grupales, Corporativo)
  - Selector de **audiencia** (Adultos, Niños, Todos)
  - Toggle **¿Es recurrente mensual?**
  - Configuración de **frecuencia de clases** (sesiones/semana × horas/sesión)
  - Horarios disponibles del servicio
  - Toggle de IVA aplicable + tasa

---

### Fase 4: Base de Estudiantes (Client Database para Speak Up)

- Rediseñar `ClientDatabase.tsx` para Speak Up:
  - Mostrar tabla de `student_contacts` en lugar de `setter_appointments`
  - Campos: nombre, teléfono, cédula, correo, edad, género, notas
  - Si edad < 18: mostrar/requerir datos de encargado
  - Historial de compras del estudiante (ventas vinculadas)
  - Filtros por status (activo/inactivo), búsqueda
  - Importación futura de Excel (preparar pero no implementar aún)

---

### Fase 5: Flujo de Ventas adaptado

- Modificar `RegisterSaleDialog` para Speak Up:
  1. **Paso 1 — Estudiante**: Buscar en `student_contacts` o crear nuevo (con validación de encargado si menor)
  2. **Paso 2 — Producto**: Seleccionar producto → mostrar categoría, frecuencia, variantes
  3. **Paso 3 — Horario + Profesor**: Según frecuencia del producto, seleccionar horarios. Filtrar profesores por: disponibilidad en esos horarios + pueden impartir ese producto + audiencia compatible. Opción "Por definir".
  4. **Paso 4 — Pago**: Monto, IVA (auto si producto lo requiere), descuento (con nota obligatoria). Si recurrente: definir día de pago → generar cobros automáticos. Si one-off con esquema de pago: generar cuotas.
  5. La venta queda vinculada al `student_contact_id`

---

### Fase 6: Widget de últimas ventas

- Nuevo widget tipo "ticker" al lado de `SalesGoalBar` que muestre las últimas 3-5 ventas en texto:
  > "María acaba de vender Clases Grupales Niños a Juan Pérez por ₡85,000"
- Datos de `message_sales` con join a `profiles` (vendedor) y `student_contacts` (cliente)

---

### Fase 7: Cobros y tracking de alumnos activos

- Cuando una venta es recurrente: generar `payment_collections` mensuales usando el `payment_day` definido
- En la vista de cobros (`CollectionsWidget`), mostrar próximo cobro por estudiante
- Vista de "Alumnos Activos": estudiantes con al menos 1 cobro pendiente o reciente (último mes)

---

### Detalle técnico

**Migraciones SQL** (7 statements):
1. CREATE TABLE `student_contacts`
2. CREATE TABLE `client_teachers`
3. ALTER TABLE `client_products` ADD columns (category, audience, is_recurring, class_frequency, available_schedules, tax_applicable, tax_rate)
4. ALTER TABLE `message_sales` ADD columns (student_contact_id, teacher_id, assigned_schedule, discount_amount, discount_reason, tax_amount, subtotal, payment_day)
5. RLS policies para `student_contacts` y `client_teachers`
6. Trigger `update_updated_at` en las nuevas tablas

**Archivos nuevos** (~5):
- `src/hooks/use-student-contacts.ts`
- `src/hooks/use-client-teachers.ts`
- `src/components/ventas/TeachersManager.tsx`
- `src/components/ventas/RecentSalesTicker.tsx`
- `src/components/ventas/StudentForm.tsx`

**Archivos modificados** (~8):
- `src/hooks/use-client-products.ts` — nuevos campos
- `src/components/ventas/ProductsManager.tsx` — categorías, frecuencia, horarios
- `src/components/dashboard/RegisterSaleDialog.tsx` — flujo Speak Up con estudiante, profesor, IVA, descuento
- `src/pages/ClientDatabase.tsx` — vista de estudiantes para Speak Up
- `src/pages/BusinessSetup.tsx` — sección Profesores
- `src/pages/Ventas.tsx` — widget ticker de ventas recientes
- `src/hooks/use-sales-tracking.ts` — nuevos campos
- `src/components/ventas/SpeakUpSalesSummary.tsx` — ajustes

