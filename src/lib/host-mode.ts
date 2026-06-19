// Detects which "mode" the app should render based on hostname.
// produ.socialifycr.com (and produ-* preview hosts) → producciones-only experience.
// Everything else → full dashboard.

export type HostMode = 'producciones' | 'main';

export function getHostMode(): HostMode {
  if (typeof window === 'undefined') return 'main';
  const host = window.location.hostname.toLowerCase();
  // Production subdomain
  if (host === 'produ.socialifycr.com') return 'producciones';
  // Any subdomain starting with "produ." (e.g. produ-staging.socialifycr.com)
  if (host.startsWith('produ.')) return 'producciones';
  // Dev override: ?host=produ
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('host') === 'produ') return 'producciones';
  } catch {
    // ignore
  }
  return 'main';
}

export function isProduccionesHost(): boolean {
  return getHostMode() === 'producciones';
}

/**
 * Base path for producciones routes. On the produ.* subdomain we mount the
 * module at the root (/producciones), on the main host it lives under
 * /agencia/producciones.
 */
export function produccionesBasePath(): string {
  return isProduccionesHost() ? '/producciones' : '/agencia/producciones';
}
