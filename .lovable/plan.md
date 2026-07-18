# Plan: dejar Calma solo con redes, contenido y pauta

Calma CR (`49fce869-…`) no tiene fila en `client_feature_flags`, por lo que hoy todos los flags están en `true` (default). La solución es insertar una fila con todos los flags de Ventas / CRM / Leads apagados y dejar el resto encendido. Es un cambio de configuración de un solo cliente, sin código.

## Qué se apaga (Ventas, CRM y captación de leads)

- `ventas_section` (oculta toda la sección "Ventas" y su navegación)
- `sales_tracking`, `sales_goal`, `pipeline_summary`, `closure_rate`
- `ad_sales_ranking`, `sales_by_product`, `sales_by_brand`
- `lead_source`, `reservations_widget`
- `setter_tracker`, `setter_daily`, `setter_checklist`, `checklist_items`
- `story_store`, `story_revenue_tracker`
- `whatsapp_conversations`, `collections`
- `instant_form_leads`, `funnel`
- `monthly_sales_report`

## Qué se deja encendido (redes, contenido, pauta)

- Dashboard base: `dashboard`, `social_followers`, `reach_chart`, `social_performance`, `stories_section`, `publication_goals`
- Contenido: `contenido_section`, `content_grid`, `content_calendar`, `instagram_posts`, `youtube_videos`, `video_ideas`, `ai_insights`, `competitors`, `giveaway`
- Pauta: `campaigns`, `generador_pauta`
- Reportes de desempeño: `reportes_section`, `ai_report_generator`, `social_performance_report`, `launch_report`
- Setup: `business_setup_section`

## Detalles técnicos

- Un solo `INSERT INTO public.client_feature_flags (client_id, …) VALUES (…)` vía la herramienta de migraciones, con los flags de ventas/CRM en `false`.
- No se toca UI ni hooks: `use-client-features` ya oculta widgets/rutas cuando el flag está en `false`.
- Reversible en cualquier momento desde Accesos → Feature Flags del cliente.

## Dudas antes de aplicar

1. `email_marketing_section` (Comunicaciones / campañas de email): ¿se apaga también o lo dejamos porque sirve para newsletter/contenido?
2. `asistencia_section` (asistencia tipo Speak Up): asumo que no aplica y lo dejo apagado. Confirmar si querés dejarlo encendido.
