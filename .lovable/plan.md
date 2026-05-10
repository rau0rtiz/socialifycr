## Crear nueva clienta: Dra. Clara Valdez

Crear el registro de la clienta y habilitar las secciones/widgets relevantes para una práctica dental enfocada en servicios (consultas, tratamientos, ortodoncia, etc.).

### 1. Crear cliente en la base de datos
- Insertar en `clients`:
  - `name`: "Dra. Clara Valdez"
  - `industry`: "Salud / Odontología"
  - `preferred_region`: "CR"
  - Colores por defecto (se pueden ajustar luego en Ajustes del Dashboard)

### 2. Habilitar feature flags relevantes
Crear fila en `client_feature_flags` con estos widgets/secciones activos:

**Ventas (enfocado en servicios)**
- `ventas_section`, `sales_tracking`, `sales_goal`, `pipeline_summary`, `closure_rate`
- `sales_by_product` (para ver ventas por tipo de servicio)
- `collections` (cobros / pagos a plazos de tratamientos)
- `lead_source`, `setter_daily`, `setter_tracker`, `setter_checklist`
- `reservations_widget` (apartado de citas)

**Contenido y redes**
- `contenido_section`, `content_grid`, `content_calendar`
- `social_followers`, `instagram_posts`, `youtube_videos`
- `stories_section`, `publication_goals`
- `reach_chart`, `social_performance`, `ai_insights`, `video_ideas`
- `competitors`

**Marketing y campañas**
- `funnel`, `campaigns`, `ad_sales_ranking`, `generador_pauta`

**Comunicación**
- `whatsapp_conversations`
- `email_marketing_section`

**Reportes**
- `reportes_section`, `monthly_sales_report`, `ai_report_generator`, `social_performance_report`

**Ya activos por defecto:** `dashboard`, `business_setup_section`, `asistencia_section`

**Excluidos** (no aplican a una clínica dental):
- `story_store`, `story_revenue_tracker`, `sales_by_brand` (son para retail / Alma Bendita)
- `giveaway` (exclusivo Petshop2go)

### 3. Notas
- No se invitan miembros de equipo aún — eso se hará después desde la sección Clientes → Dra. Clara Valdez → Equipo.
- No se conectan plataformas (Meta, Instagram, etc.) todavía.
- Productos/servicios se cargan después en Business Setup.

### Detalles técnicos
- Usar `supabase--insert` con dos `INSERT` (uno a `clients`, otro a `client_feature_flags` referenciando el id devuelto, en una sola transacción con CTE `WITH new_client AS (INSERT ... RETURNING id)`).