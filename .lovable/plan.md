# Dashboard del cliente: Calendario + Campañas + Leads

## Idea general
El mismo enlace que hoy usa cada cliente para su calendario (`/calendario/:token`, sin login) pasa a ser su **dashboard**. Arriba tiene tres pestañas, y Calendario sigue siendo la que abre por defecto:

1. **Calendario** — lo que ya tenemos, sin cambios.
2. **Campañas** — cómo rinden sus anuncios de Meta, explicado en sencillo.
3. **Leads** — cuántas personas los contactaron y de dónde vinieron.

Así no revivimos el portal viejo con login (ese sigue archivado): es el enlace compartido que ya conocen, con más contenido, y se instala igual en la pantalla de inicio.

## Lo que ve el cliente

**Período**: selector arriba con Hoy, Ayer, Últimos 7 días, Este mes, Mes pasado y **rango personalizado** (calendario de inicio y fin). Gráfico con vista por día, semana o mes. Todo el dashboard (campañas, anuncios y leads) usa el mismo período.

**Campañas**
- 4 números grandes: **Inversión**, **Personas alcanzadas**, **Resultados** (mensajes, leads o compras según el objetivo de la campaña) y **Costo por resultado**, cada uno con la flecha de cambio contra el período anterior.
- Gráfico simple de resultados por día.
- Tarjetas por campaña activa: nombre, estado (en circulación / pausada), inversión, resultados, costo por resultado y el anuncio que mejor rinde con su miniatura.
- **Anuncios**: al tocar una campaña se abre un popup con todos sus anuncios ordenados del mejor al peor según el resultado de esa campaña, con medalla para el top 3. Cada anuncio muestra miniatura, resultados, costo por resultado y, si es video, su retención.
- Al tocar un anuncio se abre su detalle: el video o imagen, el texto, las métricas del período y la curva de retención. En celular los popups ocupan toda la pantalla y se cierran con X.
- Sección **"Mejores anuncios"** en el resumen: los 3 mejores de todas las campañas, cada uno comparado dentro de su propio tipo de resultado.
- Una línea en palabras: "Este mes tu campaña generó 42 conversaciones a ₡1.850 cada una".

**Leads**
- Total del período y por fuente (formulario de Meta, mensajes de Instagram, citas de Calendly).
- Mini embudo: alcance → mensajes/leads → citas.
- Lista corta de los últimos leads sin datos sensibles (nombre y fecha, sin teléfonos), configurable.

**Resumen arriba de todo** (opcional por cliente): piezas del mes aprobadas vs. meta de entregas + inversión y resultados del mes.

## Metas variables por cliente y por campaña
Cada cliente tiene campañas distintas (compras, e-commerce, mensajes, leads, visitas, alcance), así que el dashboard no tiene números fijos: se arma según el objetivo de cada campaña.

| Tipo de campaña | Resultado principal | Costo que se muestra | Extra |
| --- | --- | --- | --- |
| Compras / e-commerce | Compras | Costo por compra | Valor vendido y retorno (ROAS) si Meta lo registra |
| Mensajes (IG / WhatsApp / Messenger) | Conversaciones iniciadas | Costo por conversación | Citas agendadas si tiene Calendly |
| Leads (formulario o web) | Leads | Costo por lead | Leads por fuente |
| Tráfico | Visitas a la página | Costo por visita | Clics en el enlace |
| Alcance / reconocimiento | Personas alcanzadas | Costo por mil | Frecuencia y **retención del video**: reproducciones al 25/50/75/100 %, tiempo promedio visto y ThruPlays |


- Si un cliente tiene varias campañas de distinto tipo, cada tarjeta de campaña muestra su propio resultado, y arriba se ven los totales agrupados por tipo (por ejemplo "18 compras" y "64 conversaciones"), nunca sumados entre sí.
- **Metas del mes por cliente**: ustedes definen la meta de cada resultado (por ejemplo 30 compras, ROAS 3, 80 conversaciones o costo por lead máximo ₡2.000) y el cliente ve una barra de avance contra esa meta.
- Si no se define meta, se muestra solo el resultado sin barra.

## Lo que ven ustedes por dentro (configuración)
Una sección nueva en el menú lateral, **"Dashboards de clientes"** (`/agencia/dashboards-clientes`), con permiso propio en "Quién ve qué". Arriba, la lista de clientes con estado de conexión de Meta, metas del mes y botón para copiar el enlace; al entrar a un cliente se configura:

1. **Cuenta publicitaria**: lista desplegable con las cuentas a las que tiene acceso la conexión de Meta de la agencia (la app de Meta que ya usamos). Se elige una o varias por cliente.
2. **Qué campañas mostrar**: todas, o solo las marcadas (así no se ven pruebas ni campañas internas).
3. **Qué cuenta como resultado**: se detecta solo por campaña según su objetivo; se puede corregir por campaña (compras, conversaciones, leads, visitas, alcance).
4. **Metas del mes**: una fila por tipo de resultado del cliente, con meta de cantidad y, opcional, costo máximo o ROAS mínimo.
4. **Moneda que ve el cliente**: USD o CRC (usa la conversión 520 ya acordada).
5. **Pestañas visibles**: prender/apagar Campañas, Leads y el resumen.
6. **Estado de la conexión**: verde si Meta responde, rojo con "Reconectar Meta" si el permiso venció, y la fecha de la última actualización.
7. Botón **"Ver como cliente"** para revisar antes de compartir.

## Cómo se mantiene conectado
- El cliente nunca toca Meta: los datos se piden desde el servidor con la conexión de la agencia; el enlace solo muestra números.
- Los períodos fijos (hoy, 7 días, mes, mes pasado) se guardan listos; un rango personalizado se pide a Meta al momento y se guarda 1 hora para no repetir.
- Se guarda una "foto" de los números cada hora (y al abrir el panel si pasó más de una hora), así carga rápido y no gasta el límite de Meta.
- Si Meta falla, el cliente ve los últimos números guardados con "Actualizado hace X" en vez de un error.

## Detalles técnicos
- Nueva tabla agency-only `client_dashboard_settings` (client_id único, ad_account_ids, campaign_ids visibles, overrides de resultado por campaña, currency, tabs, lead_list_enabled), `client_campaign_goals` (client_id, mes, result_type, target, max_cost, min_roas; único por cliente+mes+tipo) y `client_dashboard_snapshots` (client_id, period, payload jsonb, fetched_at). RLS solo agencia.
- `calendar-public` gana la acción `dashboard` (token → client_id → snapshot), devolviendo solo agregados; nunca tokens ni IDs internos.
- Insights a nivel `ad` con `video_p25/50/75/100_watched_actions`, `video_avg_time_watched_actions`, `video_thruplay_watched_actions`; seguidores reutilizando `account-insights`/`page-info` de `meta-api` sobre las cuentas en `platform_connections`/`agency_meta_accounts`, guardando un conteo diario para calcular crecimiento; `time_range` para rangos personalizados (validado, máximo 13 meses).
- Nueva función `client-dashboard-sync`: usa `agency_meta_connection` + acciones existentes de `meta-api` (`campaigns`, `campaign-insights`, `daily-insights`, `ads`) y cuenta leads desde `instant_form_leads`, mensajes IG `msg_*` y citas Calendly del cliente. Cron horario.
- Frontend: pestañas en `CalendarioPublico.tsx` con componentes nuevos en `src/components/calendario-publico/` (KpiCards, CampaignCards, LeadsFunnel); página nueva `src/pages/agencia/DashboardsClientes.tsx`, entrada en `nav-items.ts`, ruta en `App.tsx` y permiso en el panel de accesos.
- Reglas en `AGENTS.md`; pruebas para costo por resultado, selección de resultado por objetivo y filtro de campañas visibles.

## Por confirmar antes de construir
- ¿Usamos el mismo enlace del calendario o un enlace separado para el dashboard?
- ¿Mostramos los leads con nombre o solo números?
- ¿Arrancamos con un cliente piloto (por ejemplo B-Dental o Aurum)?
