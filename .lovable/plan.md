

User wants a speed/performance diagnostic of the dashboard load. This is an investigation task, not a code change. I should plan how to diagnose, then present findings as a plan with potential optimizations.

Let me think about what I know about the dashboard:
- Multi-client architecture with many widgets
- Already uses TanStack Query with `staleTime: 5m` and disabled `refetchOnMount`
- Uses `React.useTransition` for navigation
- Has conditional fetching via `enabled` parameter mapped to feature flags
- Many hooks: use-ads-data, use-campaigns-data, use-kpi-data, use-content-data, use-meta-api, use-stories, use-daily-metrics, use-ai-insights, etc.
- Multiple edge function calls (meta-api, youtube-api, linkedin-api)

To do a proper diagnostic I need to:
1. Use `browser--performance_profile` on /dashboard to get Web Vitals, long tasks, resource counts
2. Use `browser--start_profiling` + reproduce + `stop_profiling` to find slow JS
3. Read network requests to count parallel API calls and identify slow ones
4. Check Dashboard.tsx and key hooks for potential bottlenecks (parallel queries, bundle size, lazy loading)
5. Check edge function logs for slow responses

This needs default mode (browser tools + profiling). Present plan and execute after approval.

## Plan: Diagnóstico de velocidad de carga del Dashboard

### Objetivo
Identificar cuellos de botella reales en el tiempo de carga del `/dashboard` (Web Vitals, JS pesado, llamadas a APIs lentas, render cascada) y entregar un reporte priorizado con recomendaciones accionables.

### Pasos del diagnóstico

**1. Métricas en navegador (browser tools)**
- `navigate_to_sandbox` a `/dashboard` con un cliente activo.
- `performance_profile`: capturar LCP, FCP, TTI, CLS, total de recursos, tamaño de transferencia, long tasks, complejidad del DOM.
- `start_profiling` → recargar dashboard → `stop_profiling`: identificar funciones JS más costosas (renders, hooks, parsing).

**2. Análisis de red**
- `list_network_requests` con `resource_types=all`: contar requests paralelos, identificar los más lentos, detectar requests duplicados o en cascada (waterfalls).
- Revisar llamadas a `meta-api`, `youtube-api`, `linkedin-api`, `ai-insights`, `gamma-report`.

**3. Logs de Edge Functions**
- `supabase--edge_function_logs` para `meta-api`, `youtube-api`, `ai-insights`: tiempos de ejecución (`execution_time_ms`) y errores.

**4. Auditoría de código (lectura estática)**
- `Dashboard.tsx`: mapear cuántos widgets se montan en paralelo y qué hooks dispara cada uno al inicio.
- Hooks pesados (`use-kpi-data`, `use-campaigns-data`, `use-content-data`, `use-stories`, `use-ai-insights`): verificar `enabled`, `staleTime`, `select`, paginación.
- Verificar lazy-loading: ¿se importan widgets pesados con `React.lazy` o todos al inicio?
- Bundle: revisar `vite.config.ts` para code-splitting y chunks manuales.

**5. Reporte final**
Entregaré un reporte con:
- Web Vitals actuales (LCP/FCP/TTI/CLS) vs targets recomendados.
- Top 5 requests más lentos y top 3 long tasks JS.
- Lista de widgets que disparan fetches al montar y cuáles se podrían diferir.
- Recomendaciones priorizadas (quick wins vs cambios estructurales): por ejemplo lazy-loading de widgets bajo el fold, virtualizar grids, consolidar queries, agregar `select` para reducir payload, deferir `ai-insights` hasta interacción, etc.

### Notas
- Solo lectura/diagnóstico — no se modifica código en este paso.
- Tras revisar el reporte, podés aprobar la implementación de las optimizaciones priorizadas en un segundo plan.
- El diagnóstico tarda ~1-2 minutos de ejecución de herramientas.

