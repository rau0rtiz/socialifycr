// Maps sidebar URLs to their dynamic page imports.
// Calling prefetchRoute(url) warms the chunk cache before navigation,
// so clicking the menu item feels instant instead of triggering the
// Suspense fallback while Vite/Rollup fetches the chunk.

type Loader = () => Promise<unknown>;

const ROUTE_LOADERS: Record<string, Loader> = {
  '/': () => import('@/pages/Dashboard'),
  '/ventas': () => import('@/pages/Ventas'),
  '/ordenes': () => import('@/pages/Ordenes'),
  '/asistencia': () => import('@/pages/Asistencia'),
  '/comisiones': () => import('@/pages/Comisiones'),
  '/funnel': () => import('@/pages/Funnel'),
  '/agency-leads': () => import('@/pages/AgencyLeads'),
  '/business-setup': () => import('@/pages/BusinessSetup'),
  '/client-database': () => import('@/pages/ClientDatabase'),
  '/clientes': () => import('@/pages/Clientes'),
  '/comunicaciones': () => import('@/pages/Comunicaciones'),
  '/accesos': () => import('@/pages/Accesos'),
  '/ad-frameworks': () => import('@/pages/AdFrameworks'),
  '/widget-catalog': () => import('@/pages/WidgetCatalog'),
  '/agencia/finanzas': () => import('@/pages/AgencyFinances'),
  '/historial': () => import('@/pages/Historial'),
  '/archivos': () => import('@/pages/Archivos'),
  '/brand-settings': () => import('@/pages/BrandSettings'),
};

const prefetched = new Set<string>();

export const prefetchRoute = (url: string) => {
  // Strip query params — chunk is the same regardless of ?param=value
  const path = url.split('?')[0];
  if (prefetched.has(path)) return;
  const loader = ROUTE_LOADERS[path];
  if (!loader) return;
  prefetched.add(path);
  // Fire and forget; errors will bubble up if the user actually navigates
  loader().catch(() => prefetched.delete(path));
};
