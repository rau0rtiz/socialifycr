# Dashboard del cliente: Calendario + Campañas + Leads

## Idea general
El mismo enlace que hoy usa cada cliente para su calendario (`/calendario/:token`, sin login) pasa a ser su **dashboard**. Arriba tiene tres pestañas, y Calendario sigue siendo la que abre por defecto:

1. **Calendario** — lo que ya tenemos, sin cambios.
2. **Campañas** — cómo rinden sus anuncios de Meta, explicado en sencillo.
3. **Leads** — cuántas personas los contactaron y de dónde vinieron.

Así no revivimos el portal viejo con login (ese sigue archivado): es el enlace compartido que ya conocen, con más contenido, y se instala igual en la pantalla de inicio.

## Lo que ve el cliente

**Campañas** (período: este mes / mes pasado / últimos 7 o 30 días)
- 4 números grandes: **Inversión**, **Personas alcanzadas**, **Resultados** (mensajes, leads o compras según el objetivo de la campaña) y **Costo por resultado**, cada uno con la flecha de cambio contra el período anterior.
- Gráfico simple de resultados por día.
- Tarjetas por campaña activa: nombre, estado (en circulación / pausada), inversión, resultados, costo por resultado y el anuncio que mejor rinde con su miniatura.
- Una línea en palabras: "Este mes tu campaña generó 42 conversaciones a ₡1.850 cada una".

**Leads**
- Total del período y por fuente (formulario de Meta, mensajes de Instagram, citas de Calendly).
- Mini embudo: alcance → mensajes/leads → citas.
- Lista corta de los últimos leads sin datos sensibles (nombre y fecha, sin teléfonos), configurable.

**Resumen arriba de todo** (opcional por cliente): piezas del mes aprobadas vs. meta de entregas + inversión y resultados del mes.

## Lo que ven ustedes por dentro (configuración)
En `/agencia/calendario`, junto al botón del enlace del cliente, un nuevo panel **"Dashboard del cliente"** con:

1. **Cuenta publicitaria**: lista desplegable con las cuentas a las que tiene acceso la conexión de Meta de la agencia (la app de Meta que ya usamos). Se elige una o varias por cliente.
2. **Qué campañas mostrar**: todas, o solo las marcadas (así no se ven pruebas ni campañas internas).
3. **Qué cuenta como resultado**: automático según objetivo, o fijarlo (mensajes, leads, compras, visitas).
4. **Moneda que ve el cliente**: USD o CRC (usa la conversión 520 ya acordada).
5. **Pestañas visibles**: prender/apagar Campañas, Leads y el resumen.
6. **Estado de la conexión**: verde si Meta responde, rojo con "Reconectar Meta" si el permiso venció, y la fecha de la última actualización.
7. Botón **"Ver como cliente"** para revisar antes de compartir.

## Cómo se mantiene conectado
- El cliente nunca toca Meta: los datos se piden desde el servidor con la conexión de la agencia; el enlace solo muestra números.
- Se guarda una "foto" de los números cada hora (y al abrir el panel si pasó más de una hora), así carga rápido y no gasta el límite de Meta.
- Si Meta falla, el cliente ve los últimos números guardados con "Actualizado hace X" en vez de un error.

## Detalles técnicos
- Nueva tabla agency-only `client_dashboard_settings` (client_id único, ad_account_ids, campaign_ids visibles, result_mode, currency, tabs, lead_list_enabled) y `client_dashboard_snapshots` (client_id, period, payload jsonb, fetched_at). RLS solo agencia.
- `calendar-public` gana la acción `dashboard` (token → client_id → snapshot), devolviendo solo agregados; nunca tokens ni IDs internos.
- Nueva función `client-dashboard-sync`: usa `agency_meta_connection` + acciones existentes de `meta-api` (`campaigns`, `campaign-insights`, `daily-insights`, `ads`) y cuenta leads desde `instant_form_leads`, mensajes IG `msg_*` y citas Calendly del cliente. Cron horario.
- Frontend: pestañas en `CalendarioPublico.tsx` con componentes nuevos en `src/components/calendario-publico/` (KpiCards, CampaignCards, LeadsFunnel); panel de configuración en agencia.
- Reglas en `AGENTS.md`; pruebas para costo por resultado, selección de resultado por objetivo y filtro de campañas visibles.

## Por confirmar antes de construir
- ¿Usamos el mismo enlace del calendario o un enlace separado para el dashboard?
- ¿Mostramos los leads con nombre o solo números?
- ¿Arrancamos con un cliente piloto (por ejemplo B-Dental o Aurum)?
