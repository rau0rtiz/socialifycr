

## Plan: Grupos de Clases, Asistencia y Mejoras al Flujo de Ventas Grupales

### Resumen

Agregar el concepto de **Grupos** para clases grupales (con capacidad, rango de edad, nivel de inglés, profesor, aula y horarios), una herramienta de **Asistencia** para marcar entrada/salida de estudiantes, y adaptar el flujo de ventas para que al vender un producto grupal se seleccione el grupo correspondiente.

---

### Fase 1: Base de datos — Nuevas tablas

**1.1 Tabla `class_groups` (nueva)** — Grupos de clases grupales.

| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK | |
| product_id | uuid | FK a `client_products` (producto grupal) |
| name | text NOT NULL | Ej: "Grupo A - Niños Principiantes" |
| capacity | integer DEFAULT 10 | Cupo máximo |
| age_range_min | integer | Edad mínima |
| age_range_max | integer | Edad máxima |
| english_level | text | Dropdown CEFR: Pre-A1, A1, A2, B1, B2, C1, C2 |
| teacher_id | uuid | FK a `client_teachers` |
| classroom | text | Nombre del aula |
| schedules | jsonb | `[{day:'lunes', start:'09:00', end:'10:00'}]` — heredados/compatibles con producto |
| status | text DEFAULT 'active' | active/inactive |
| created_at, updated_at | timestamps | |

RLS: mismos patrones existentes (team members CRUD, admins ALL).

**1.2 Tabla `class_group_members` (nueva)** — Alumnos asignados a grupos.

| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| group_id | uuid FK | FK a `class_groups` |
| student_contact_id | uuid FK | FK a `student_contacts` |
| sale_id | uuid | FK a `message_sales` (la venta que originó la inscripción) |
| enrolled_at | timestamp DEFAULT now() | |
| status | text DEFAULT 'active' | active/withdrawn |

RLS: basado en client_id del grupo (join).

**1.3 Tabla `attendance_records` (nueva)** — Registro de asistencia.

| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK | |
| student_contact_id | uuid FK | |
| group_id | uuid | NULL para clases personalizadas |
| class_date | date NOT NULL | |
| check_in | timestamptz | Hora de entrada |
| check_out | timestamptz | Hora de salida |
| status | text DEFAULT 'present' | present/absent/late |
| notes | text | |
| marked_by | uuid | Usuario que marcó |
| created_at | timestamp | |

RLS: team members CRUD por client_id.

**1.4 Cambio en `message_sales`** — Agregar `group_id uuid` para vincular venta a un grupo.

---

### Fase 2: Gestión de Grupos (UI)

- Nueva sección **"Grupos"** en Business Setup (solo Speak Up, junto a Profesores)
- CRUD de grupos con:
  - Nombre del grupo
  - Producto asociado (solo productos con category='group')
  - Capacidad máxima
  - Rango de edad (min-max)
  - Nivel de inglés (dropdown CEFR: Pre-A1 → C2)
  - Profesor asignado (filtrado por producto/audiencia)
  - Aula
  - Horarios (heredados del producto, editables)
- Vista de alumnos inscritos en cada grupo con indicador de ocupación (ej: 8/12)

**Archivo nuevo**: `src/components/ventas/GroupsManager.tsx`
**Hook nuevo**: `src/hooks/use-class-groups.ts`

---

### Fase 3: Flujo de Ventas — Selección de Grupo

- Modificar `RegisterSaleDialog.tsx` (flujo Speak Up):
  - Cuando el producto seleccionado es `category='group'`: mostrar paso intermedio para seleccionar grupo
  - Dropdown de grupos activos del producto, mostrando: nombre, nivel, horario, ocupación (X/Y)
  - Al seleccionar grupo, autocompletar horarios y profesor
  - Guardar `group_id` en la venta
  - Al confirmar venta, insertar registro en `class_group_members`

---

### Fase 4: Herramienta de Asistencia

- Nueva vista/widget de asistencia accesible desde Ventas (Speak Up)
- Selector de fecha y grupo (o estudiante para personalizadas)
- Lista de alumnos del grupo con checkboxes para:
  - Marcar entrada (check-in timestamp)
  - Marcar salida (check-out timestamp)
  - Estado: presente / ausente / tardanza
- Para clases personalizadas: buscar estudiante, marcar asistencia individual
- Resumen: total presentes, ausentes, tasa de asistencia

**Archivo nuevo**: `src/components/ventas/AttendanceTracker.tsx`
**Hook nuevo**: `src/hooks/use-attendance.ts`

---

### Detalle técnico

**Migración SQL** (1 migración con):
1. CREATE TABLE `class_groups`
2. CREATE TABLE `class_group_members`
3. CREATE TABLE `attendance_records`
4. ALTER TABLE `message_sales` ADD `group_id uuid`
5. RLS policies (6 policies)
6. Triggers `update_updated_at` en tablas nuevas

**Archivos nuevos** (~4):
- `src/hooks/use-class-groups.ts` — CRUD grupos + miembros
- `src/hooks/use-attendance.ts` — CRUD asistencia
- `src/components/ventas/GroupsManager.tsx` — UI gestión de grupos
- `src/components/ventas/AttendanceTracker.tsx` — UI asistencia

**Archivos modificados** (~4):
- `src/pages/BusinessSetup.tsx` — agregar sección Grupos
- `src/components/dashboard/RegisterSaleDialog.tsx` — paso de selección de grupo
- `src/hooks/use-sales-tracking.ts` — campo group_id
- `src/pages/Ventas.tsx` — widget/tab de asistencia

