import { useTransition } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Clapperboard,
  FileText,
  Mail,
  KeyRound,
  FolderOpen,
  Wallet,
  Palette,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { prefetchRoute } from '@/lib/route-prefetch';
import { useAuth } from '@/contexts/AuthContext';

const items = [
  { title: 'Resumen', url: '/agencia', icon: LayoutDashboard, exact: true },
  { title: 'Clientes', url: '/agencia/clientes', icon: Users },
  { title: 'CRM', url: '/agencia/crm', icon: UserPlus },
  { title: 'Pagos', url: '/agencia/pagos', icon: Wallet },
  { title: 'Producciones', url: '/agencia/producciones', icon: Clapperboard },
  { title: 'Documentación', url: '/agencia/documentacion', icon: FileText },
  { title: 'Comunicaciones', url: '/agencia/comunicaciones', icon: Mail },
  { title: 'Accesos', url: '/agencia/accesos', icon: KeyRound },
  { title: 'Archivos', url: '/agencia/archivos', icon: FolderOpen },
  { title: 'Ajustes', url: '/agencia/ajustes', icon: Palette },
];

export const AgencySidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const [, startTransition] = useTransition();

  const go = (url: string) => startTransition(() => navigate(url));

  const isActive = (item: (typeof items)[number]) =>
    item.exact ? pathname === item.url : pathname.startsWith(item.url);

  return (
    <SidebarComponent collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <button
          onClick={() => go('/')}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {!collapsed && <span>Volver al dashboard</span>}
        </button>
        {!collapsed && (
          <div className="mt-3 flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              Interno · Agencia
            </p>
            <p className="font-wordmark uppercase text-foreground text-base tracking-tight leading-tight">
              Socialify Internal<br />Marketing Tool
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <a
                        href={item.url}
                        onMouseEnter={() => prefetchRoute(item.url)}
                        onFocus={() => prefetchRoute(item.url)}
                        onTouchStart={() => prefetchRoute(item.url)}
                        onClick={(e) => {
                          e.preventDefault();
                          go(item.url);
                        }}
                        className={cn(
                          'flex items-center gap-3 rounded-lg transition-colors relative',
                          active
                            ? 'bg-foreground/[0.06] text-foreground font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-foreground'
                            : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarComponent>
  );
};
