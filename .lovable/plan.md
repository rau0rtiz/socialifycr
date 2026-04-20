

The user approved the cleanup. Plan: start removing AI + Reports, and ask about ambiguous widget groups in parallel via questions during implementation. Keep this plan tight.

## Plan: Limpieza profunda — Fase 1

### Fase 1A — Eliminar IA (todos los puntos de uso)
**Componentes a borrar:**
- `src/components/dashboard/AIInsightsPanel.tsx`
- `src/components/dashboard/AIContextDialog.tsx`
- `src/components/clientes/AIContextEditor.tsx`
- `src/components/dashboard/AvatarPrompt.tsx`
- `src/components/dashboard/DevelopIdeaModal.tsx`
- `src/components/dashboard/VideoIdeasSection.tsx`
- `src/components/files/HtmlDesigner.tsx`
- `src/components/reports/AIReportGenerator.tsx`

**Hooks a borrar:**
- `src/hooks/use-ai-insights.ts`
- `src/hooks/use-video-ideas.ts`

**Edge functions a borrar (incluye llamada a `supabase--delete_edge_functions`):**
- `ai-insights`, `polish-context`, `generate-copy`, `generate-html-design`

**Limpieza de referencias:**
- `Dashboard.tsx`: quitar imports y renders de AI panels, AvatarPrompt
- `Contenido.tsx`: quitar VideoIdeasSection y DevelopIdeaModal
- `Clientes.tsx` / `ClientDetailPanel.tsx`: quitar AIContextEditor
- `Archivos.tsx`: quitar HtmlDesigner si está
- `client_feature_flags`: deprecar columnas `ai_insights`, `ai_report_generator`, `video_ideas` (las dejo en DB para no romper, pero las saco de UI de Accesos)

### Fase 1B — Eliminar Reportería
**Páginas a borrar:**
- `src/pages/Reports.tsx` (`/reports`)
- `src/pages/Reportes.tsx` (`/reportes`)

**Componentes a borrar:**
- `src/components/reports/` completa: `GammaReportGenerator`, `MonthlySalesReport`, `ReportPreview`, `SavedReportsList`, `SocialContentOverview`, `SocialPerformanceReport`

**Hooks a borrar:**
- `src/hooks/use-saved-reports.ts`
- `src/hooks/use-gamma-report.ts`

**Edge functions a borrar:**
- `generate-report`, `generate-monthly-sales-report`, `prepare-gamma-report`, `gamma-report`

**Limpieza:**
- `App.tsx`: quitar rutas `/reports` y `/reportes`
- `Sidebar.tsx`: quitar entrada "Reportes"
- `client_feature_flags`: deprecar `reportes_section`, `monthly_sales_report`, `social_performance_report` en UI de Accesos
- Pantalla Accesos / `ClientFeatureFlags.tsx`: ocultar los toggles eliminados

### Fase 2 — Widgets candidatos (te pregunto antes de borrar)
Cuando termine 1A+1B, te lanzo un `ask_questions` agrupando los widgets dudosos para que decidas qué cae:

- **Grupo Contenido/Social**: `ContentCalendar`, `PublicationGoalsSection`, `StoriesSection`, `TopPostsSection`, `InstagramTopPosts`, `YouTubeTopVideos`, `ReachChart`, `SocialPerformanceChart`, `ContentGrid`, `SocialFollowersSection` → ¿borramos toda la sección `/contenido` o solo widgets específicos?
- **Funnels públicos**: `/funnel` (quiz lead-gen) + `AdvancedFunnelModule` + `FunnelModule` del dashboard
- **Competidores**: `CompetitorsPanel` + `/competitors`
- **Generador de pauta estática**: `/generador-pauta`
- **Giveaway widget** (Petshop2go)
- **Banner/branding decorativo**: hero banner del dashboard

### Orden de ejecución
1. Crear migración para limpiar flags (opcional, primero solo ocultar en UI)
2. Borrar componentes/hooks IA → fix imports rotos
3. Borrar componentes/hooks Reports → fix imports rotos + rutas
4. Borrar edge functions con `supabase--delete_edge_functions`
5. Verificar que `/dashboard`, `/ventas`, `/clientes`, `/contenido` siguen renderizando
6. Preguntarte sobre widgets de Fase 2

### Notas técnicas
- No toco DB schema todavía (las columnas de flags quedan, solo se ocultan) — así si algo sale mal, revertir es trivial.
- Si un componente sobrevive pero importa algo borrado, lo limpio sobre la marcha.
- Edge functions: borrar archivo + llamar a `supabase--delete_edge_functions` para que se desplieguen los cambios.

Arrancamos por IA.

