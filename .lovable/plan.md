## Objetivo

Crear una sección interna **/agencia/finanzas** (solo agencia) que reemplace tu uso de Zoho con vistas claras de:
- **MRR** del mes y crecimiento mes a mes
- **Churn rate** y clientes en riesgo
- **Tabla maestra** de clientes con monto, frecuencia de publicación y gasto Meta
- **Cohortes y LTV** por cliente
- Soporte especial para **paraguas (Hilda Lopez)** que factura por varios sub-clientes
- Conexión a **pauta Meta** vía nueva conexión OAuth dedicada del Business Manager de la agencia

---

## Modelo de datos (nuevas tablas)

**`agency_billing_accounts`** — el "pagador" (puede ser un cliente directo o un paraguas como Hilda)
- `id`, `name`, `contact_email`, `notes`, `created_at`

**`agency_contracts`** — un contrato por cliente
- `client_id` (FK clients), `billing_account_id` (FK agency_billing_accounts)
- `monthly_amount`, `currency` (USD/CRC), `billing_frequency` ('monthly' | 'quarterly' | 'annual')
- `posts_per_month` (entero), `services` (jsonb: pauta, contenido, reportes, etc.)
- `start_date`, `end_date` (null = activo), `status` ('active' | 'paused' | 'churned')
- `churn_reason` (text, opcional)

**`agency_meta_accounts`** — ad accounts del BM de la agencia mapeadas al cliente que pertenecen
- `id`, `meta_ad_account_id`, `account_name`, `client_id` (FK, nullable hasta asignar), `currency`

MRR se calcula derivado: `SUM(monthly_amount normalizado a mensual)` de contratos `status='active'`. Churn mensual = contratos que pasaron a `churned` en el mes / activos al inicio del mes. LTV = `monthly_amount * meses_activo` (histórico real desde `start_date`).

---

## Conexión Meta dedicada de la agencia (Business Manager)

Reusamos la infraestructura OAuth de Meta existente, pero guardamos el token en una nueva tabla **`agency_meta_connection`** (no ligada a `client_id`). Una sola fila por agencia. Una nueva edge function **`agency-meta-spend`** consulta el endpoint `/me/adaccounts` y luego `insights` por ad_account para el rango de fechas pedido y devuelve gasto agregado + por ad_account.

El admin mapea cada `meta_ad_account_id` a un `client_id` desde la UI (tabla `agency_meta_accounts`). Las cuentas no mapeadas aparecen en una sección "Sin asignar".

---

## UI — Página `/agencia/finanzas`

Acceso restringido a roles `owner | admin | manager` (sidebar item solo visible para agencia, igual que Widget Catalog).

**Layout vertical:**

1. **Hero KPIs (4 cards)**
   - MRR actual (USD) + delta % vs mes pasado + sparkline 12 meses
   - Clientes activos + altas/bajas del mes
   - Churn rate del mes + tendencia
   - Pauta Meta total del mes (BM agencia) + delta %

2. **Gráfico MRR 12 meses** (line chart, verde estándar). Toggle entre MRR neto / nuevo MRR / MRR perdido.

3. **Tabla maestra de clientes** (sortable, filtros por estado y paraguas)
   - Columnas: Cliente · Paraguas · Monto/mes · Frecuencia publicación · Gasto Meta mes · LTV acumulado · Antigüedad · Estado
   - Agrupable por `billing_account` (Hilda Lopez expandible muestra sus sub-clientes)
   - Acciones por fila: editar contrato, marcar churn

4. **Cohortes** — heatmap mes de alta vs meses de retención (clásico, % retenidos).

5. **Clientes en riesgo** — lista automática:
   - Sin pauta Meta activa últimos 30 días
   - Contrato venciendo en <30 días
   - Caída >50% en gasto Meta vs mes anterior

6. **Cuentas Meta sin asignar** — accordion con ad accounts del BM que no tienen `client_id` mapeado, con dropdown para asignar.

---

## Gestión de contratos

Modal de "Nuevo contrato / editar":
- Selector cliente (existente)
- Selector o creación rápida de billing_account (paraguas)
- Monto + moneda + frecuencia
- Posts/mes + servicios (multiselect chips: Pauta, Contenido orgánico, Reportes, Setter, Closer, Frameworks)
- Fechas inicio/fin
- Notas

Para Hilda: creas un `billing_account` "Hilda Lopez" y asignás todos sus sub-clientes (cada uno con su propio contrato). MRR consolidado por paraguas en la tabla.

---

## Pasos de implementación

1. **Migración DB**: crear `agency_billing_accounts`, `agency_contracts`, `agency_meta_connection`, `agency_meta_accounts` con RLS restringido a `is_agency_member(auth.uid())`.
2. **Edge function** `agency-meta-spend` (verify_jwt: false, service role) que lee `agency_meta_connection`, llama Graph API v21, devuelve gasto por ad account y agregado.
3. **Edge function** `agency-meta-oauth-callback` para conectar el BM (reusa patrón de meta-oauth pero guarda en `agency_meta_connection`).
4. **Hooks**: `use-agency-finances.ts` (MRR, churn, cohortes — derivados client-side de contratos), `use-agency-meta-spend.ts`.
5. **Página** `src/pages/AgencyFinances.tsx` con los 6 bloques descritos.
6. **Componentes**: `MrrKpiCards`, `MrrTrendChart`, `ContractsTable` (con agrupación por paraguas), `CohortHeatmap`, `AtRiskList`, `UnmappedMetaAccounts`, `ContractFormDialog`, `BillingAccountFormDialog`.
7. **Sidebar**: añadir item "Finanzas Agencia" con icono `TrendingUp`, visible solo si `isAgencyMember`.
8. **Ruta** `/agencia/finanzas` en `App.tsx` con guard `requireAgency`.
9. **Seed inicial**: una vez creado, te abro un modal donde pegás tu lista de clientes + montos + frecuencia para poblar contratos rápidamente (bulk import por CSV o tabla editable).
10. **Memoria**: registrar feature en `mem://features/agency/finances-dashboard`.

---

## Notas

- No se toca el flujo OAuth Meta de cada cliente — la conexión BM agencia es independiente.
- Si en algún cliente no querés migrar de su Meta personal, la tabla maestra muestra "—" en gasto Meta hasta mapearlo.
- Tu lista preliminar de clientes no llegó adjunta en este turno; en la primera carga de la página aparece un CTA "Importar clientes" con tabla editable para pegarla.
- Toda la sección queda invisible para clientes (RLS + sidebar guard).