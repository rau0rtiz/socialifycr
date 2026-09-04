import {
  LayoutDashboard,
  Users,
  UserPlus,
  Clapperboard,
  FileText,
  Mail,
  Megaphone,
  FolderOpen,
  Wallet,
  Database,
  Palette,
} from 'lucide-react';

export interface AgencyNavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  exact?: boolean;
}

export const AGENCY_NAV: AgencyNavItem[] = [
  { title: 'Resumen', url: '/agencia', icon: LayoutDashboard, exact: true },
  { title: 'Clientes', url: '/agencia/clientes', icon: Users },
  { title: 'CRM', url: '/agencia/crm', icon: UserPlus },
  { title: 'Pagos', url: '/agencia/pagos', icon: Wallet },
  { title: 'Producciones', url: '/agencia/producciones', icon: Clapperboard },
  { title: 'Documentación', url: '/agencia/documentacion', icon: FileText },
  { title: 'Funnels', url: '/agencia/funnels', icon: Megaphone },
  { title: 'Base de datos', url: '/agencia/base-de-datos', icon: Database },
  { title: 'Bases de datos de clientes', url: '/agencia/bases-de-datos-clientes', icon: Users },
  { title: 'Comunicaciones', url: '/agencia/comunicaciones', icon: Mail },
  { title: 'Archivos', url: '/agencia/archivos', icon: FolderOpen },
  { title: 'Ajustes', url: '/agencia/ajustes', icon: Palette },
];

export const isNavActive = (item: AgencyNavItem, pathname: string) =>
  item.exact ? pathname === item.url : pathname.startsWith(item.url);

/** Human title for the current agency route, used by the hub top bar. */
export const agencyRouteTitle = (pathname: string) => {
  const match = [...AGENCY_NAV]
    .filter((i) => !i.exact)
    .sort((a, b) => b.url.length - a.url.length)
    .find((i) => pathname.startsWith(i.url));
  return match?.title ?? 'Resumen';
};
