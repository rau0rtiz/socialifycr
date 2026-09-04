// Maps sidebar URLs to their dynamic page imports.
// Calling prefetchRoute(url) warms the chunk cache before navigation,
// so clicking the menu item feels instant instead of triggering the
// Suspense fallback while Vite/Rollup fetches the chunk.

type Loader = () => Promise<unknown>;

const ROUTE_LOADERS: Record<string, Loader> = {
  '/agencia': () => import('@/pages/agencia/Resumen'),
  '/agencia/clientes': () => import('@/pages/Clientes'),
  '/agencia/crm': () => import('@/pages/AgencyCRM'),
  '/agencia/pagos': () => import('@/pages/agencia/Pagos'),
  '/agencia/producciones': () => import('@/pages/Producciones'),
  '/agencia/documentacion': () => import('@/pages/Propuestas'),
  '/agencia/funnels': () => import('@/pages/agencia/Funnels'),
  '/agencia/base-de-datos': () => import('@/pages/agencia/BaseDeDatos'),
  '/agencia/bases-de-datos-clientes': () => import('@/pages/agencia/BasesDeDatosClientes'),
  '/agencia/comunicaciones': () => import('@/pages/Comunicaciones'),
  '/agencia/accesos': () => import('@/pages/Accesos'),
  '/agencia/archivos': () => import('@/pages/Archivos'),
  '/agencia/ajustes': () => import('@/pages/BrandSettings'),
  '/ad-frameworks': () => import('@/pages/AdFrameworks'),
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
