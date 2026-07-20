# Ocean Clinic — ¿el dashboard está listo?

Respuesta corta: **parcialmente**. Inventario y medición de canales están cubiertos (con ajustes menores). Las agendas por especialista médico y los correos automáticos de confirmación **no existen todavía** y requieren desarrollo.

---

## 1. Inventario — ✅ Listo (con ajuste)

Ya existe un módulo de inventario completo (usado por Tissue y Alma Bendita) con:
- Productos, variantes (talla/color/SKU), stock por variante, movimientos de stock, precio y costo.
- Catálogos de marcas, categorías, colores, tallas.
- Recepción de stock, historial de precios y descuento automático al vender.

**Encaja para una clínica** para: insumos médicos, productos de venta, kits, medicamentos vendidos, etc. Solo hay que activar la sección "Business Setup / Productos" en las feature flags del cliente Ocean Clinic y cargar el catálogo.

Limitación: no maneja lotes ni fechas de vencimiento (importantes en clínica). Si se necesita, es un add-on.

---

## 2. Agendas por especialista médico — ❌ No existe

Lo que hay hoy: `setter_appointments` — agenda de llamadas de venta atadas a un "setter/closer" comercial. **No** modela:
- Especialistas médicos (doctores) como recurso agendable.
- Servicios/tratamientos con duración configurable.
- Disponibilidad y horarios de cada médico.
- Vista de calendario por médico.
- Sala/consultorio.

Se puede construir sobre la infraestructura existente (clients, team_members, notifications, RLS), pero es un **módulo nuevo** — no es un simple toggle.

Alcance mínimo estimado:
- Tabla `clinic_specialists` (nombre, especialidad, color, horario base).
- Tabla `clinic_services` (nombre, duración, precio).
- Tabla `clinic_appointments` (paciente, especialista, servicio, inicio/fin, estado, canal).
- UI: calendario semanal por especialista + vista general, formulario de reserva, estados (confirmada/cancelada/atendida/no-show).

---

## 3. Correos de confirmación de agenda — ❌ No existe para citas

La infraestructura de correos (Resend + edge functions + logs `sent_emails`) **sí existe** y ya se usa para invitaciones, recordatorios de avatar, propuestas, campañas, funnel, etc.

Falta:
- Plantilla "confirmación de cita" con datos del paciente/médico/hora.
- Trigger o edge function que dispare al crear/modificar/cancelar una cita.
- Opcional: recordatorio 24h antes (requiere cron).
- Opcional: reprogramación/cancelación desde el link del correo.

Es trabajo directo una vez exista el módulo de agendas del punto 2.

---

## 4. Medir canales de agenda — ✅ Base lista, pequeño ajuste

Ya existe:
- `instant_form_lead_sources` — múltiples fuentes por cliente (Meta, TikTok, landing, DM, etc.).
- `utm_tracking` — captura UTMs.
- Widget "Lead Source" en Ventas que muestra distribución por canal.
- Funnel público con atribución por origen.

Para agendas de clínica solo hay que:
- Añadir campo `source` / `utm_source` a la nueva tabla `clinic_appointments`.
- Reusar el widget de canales apuntándolo a citas en lugar de a `message_sales`.

---

## Recomendación de fases

1. **Fase 1 — Activar lo que ya sirve (rápido):** habilitar inventario y feature flags de Ocean Clinic, cargar catálogo de servicios/productos.
2. **Fase 2 — Módulo de agendas clínicas:** especialistas, servicios, calendario, estados.
3. **Fase 3 — Correos + medición:** plantilla de confirmación, recordatorio 24h, widget de canales de citas.
4. **Fase 4 (opcional):** portal público para que el paciente agende solo, con captura de UTM.

Confirmame qué fases querés priorizar y armo el plan de implementación detallado de cada una.
