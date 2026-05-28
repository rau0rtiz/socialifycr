## Objetivo

Reorientar `/agencia/crm` para que sirva específicamente para:
1. Registrar las **ventas que cierra Lucía** (clientes nuevos).
2. Definir el **cronograma de cobros** de cada cliente (cualquier cantidad de pagos al mes, en fechas configurables).
3. Marcar cuándo cada cuota fue **realmente cobrada**.
4. Calcular **automáticamente la comisión de Lucía** por cada cobro:
   - **15%** durante los **primeros 3 meses de servicio** del cliente.
   - **8% perpetuo** desde el mes 4 hasta que el cliente cancela.

Aprovechamos las tablas existentes (`agency_contracts`, `agency_collections`) en lugar de duplicarlas.

## Lógica de comisión (clave)

Para cada registro en `agency_collections` con `status = 'paid'`:

```
mes_de_servicio = meses_calendario_entre(contract.start_date, collection.paid_at) + 1
tasa = (mes_de_servicio <= 3) ? 0.15 : 0.08
comisión = collection.paid_amount * tasa
```

Casos especiales:
- **Pago trimestral/anual prepagado adelantado:** si el cobro ocurre en el mes 1, todo va al 15% (tu indicación: "si hace un trimestral es el monto de golpe").
- **Pago atrasado:** la tasa se determina por la fecha de cobro real (`paid_at`), no por la fecha de vencimiento.
- Una vez que el contrato cumple 3 meses de servicio, todos los cobros futuros son al 8% sin importar a qué cuota correspondan.

## Cambios en base de datos

### `agency_contracts` (agregar)
- `seller_name TEXT` — por ahora hardcoded "Lucía", queda preparado para más vendedores.
- `commission_rate_initial NUMERIC DEFAULT 15` — % primeros 3 meses.
- `commission_rate_perpetual NUMERIC DEFAULT 8` — % desde mes 4.
- `commission_initial_months INTEGER DEFAULT 3` — duración de la tasa alta.
- `crm_lead_id UUID` — link al lead origen en `agency_crm_leads`.

### Nueva tabla `agency_payment_schedules`
Define el cronograma recurrente del cliente (independiente de los cobros individuales):
- `contract_id` (FK)
- `payments_per_month INTEGER` (1, 2, 4…)
- `payment_days INTEGER[]` — días del mes en que se cobra (ej. `[15, 30]` para quincenal, `[1]` para mensual el primero).
- `amount_per_payment NUMERIC` — cuánto se cobra por cuota.

Esto permite **autogenerar** las cuotas en `agency_collections` para los próximos N meses con un botón.

### `agency_collections` (agregar)
- `contract_id UUID` — link al contrato para conocer fecha de inicio.
- `commission_rate NUMERIC` — tasa aplicada (se congela al marcar como pagado).
- `commission_amount NUMERIC` — monto de comisión calculado.
- `service_month INTEGER` — mes de servicio en que se cobró (1, 2, 3, 4…).

Un **trigger** al cambiar `status='paid'` calcula `service_month`, busca la tasa correspondiente y guarda `commission_amount`.

### Nueva tabla `agency_commission_payouts`
Para registrar cuándo se le pagó la comisión a Lucía:
- `seller_name TEXT`
- `period_start / period_end DATE` (ej. mes calendario)
- `total_commission NUMERIC`
- `paid_at TIMESTAMP`
- `notes TEXT`

## Cambios en UI

### `/agencia/crm` — rediseño completo

Reemplazamos la tabla actual (que se parece a un mini-pipeline genérico que ya tienen en ClickUp) por **3 secciones**:

**1. Header con KPIs del mes seleccionado:**
- Cobrado en el mes
- Comisión devengada de Lucía
- Clientes activos
- Clientes en mes 1–3 (al 15%) vs mes 4+ (al 8%)

**2. Lista "Clientes de Lucía" (cards):**
Cada card muestra:
- Nombre del cliente, paquete, MRR
- Mes de servicio actual (badge "Mes 2/3 al 15%" o "Mes 8 al 8%")
- Próximo cobro programado (fecha + monto)
- Estado: Activo / Pausado / Churned
- Acciones: marcar cobro como pagado, ver historial

**3. Tabla "Cobros del período":**
Filtros por mes/rango. Columnas: cliente, vencimiento, cobrado el, monto, mes de servicio, **tasa aplicada**, **comisión**. Total al pie.

### Wizard "Nueva venta de Lucía" (reemplaza el dialog actual del CRM)

3 pasos:
1. **Cliente:** nombre, contacto, paquete vendido, fecha de inicio del servicio.
2. **Esquema de pago:**
   - Monto del paquete por ciclo
   - Pagos por mes (1, 2, o personalizado)
   - Selector de días del mes (chips: 1, 15, 30, etc.)
   - Cuántos meses generar de cuotas (default 12)
3. **Comisión (preconfigurada):** 15% por 3 meses → 8% perpetuo. Editable por si cambia para algún cliente.

Al guardar: crea registro en `agency_contracts`, `agency_payment_schedules`, y **autogenera** las cuotas en `agency_collections` con `status='pending'`.

### Vista "Comisiones de Lucía" (nueva sub-ruta o tab)

- Selector de mes
- Lista detallada de cobros del mes con su comisión
- Total a pagar
- Botón "Registrar pago de comisión" → crea registro en `agency_commission_payouts`
- Historial de pagos a Lucía

## Relación con lo existente

- `agency_finances` ya tiene `/agencia/finanzas` con MRR, churn, contracts. **No lo tocamos** — sigue siendo la vista financiera global de la agencia.
- El CRM actual (`agency_crm_leads`) queda como **fuente del lead** (info de prospección). Al marcar como `cliente`, se abre el wizard para crear el contrato con cronograma. El lead queda linkeado vía `crm_lead_id`.
- Los campos `sale_*` que se agregaron antes a `agency_crm_leads` quedan como histórico simple del cierre; los datos canónicos pasan a `agency_contracts` + `agency_collections`.

## Detalles técnicos

- Función SQL `calc_commission_for_collection(collection_id UUID)` reutilizable.
- Trigger `AFTER UPDATE ON agency_collections` cuando `status` pasa a `'paid'`.
- `service_month` se calcula con `EXTRACT(MONTH FROM AGE(paid_at, start_date)) + EXTRACT(YEAR FROM AGE(paid_at, start_date))*12 + 1`.
- Cuando un contrato se marca `churned` o `discontinued`, las cuotas futuras `pending` se cancelan automáticamente (`status='cancelled'`).
- RLS: mismas políticas que el resto de tablas `agency_*` (solo agency members).
- Todo en zona horaria Costa Rica (UTC-6), consistente con el resto del proyecto.

## Fuera de scope (para iteraciones futuras)

- Múltiples vendedores con reglas distintas (queda preparado pero no se expone).
- Notificaciones automáticas cuando vence una cuota.
- Integración con pasarela de pago para auto-marcar cobros.
- Reporte de churn impact sobre comisiones de Lucía.
