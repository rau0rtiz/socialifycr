import { useTransition } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Clapperboard,
  FileText,
  Mail,
  Megaphone,
  KeyRound,
  FolderOpen,
  Wallet,
  Database,
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
  { title: 'Funnels', url: '/agencia/funnels', icon: Megaphone },
  { title: 'Base de datos', url: '/agencia/base-de-datos', icon: Database },
  { title: 'Bases de datos de clientes', url: '/agencia/bases-de-datos-clientes', icon: Users },
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
    <SidebarComponent collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4 pt-[max(1rem,env(safe-area-inset-top))]">

        <button
          onClick={() => go('/')}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {!collapsed && <span>Volver al dashboard</span>}
        </button>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-primary" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span
                data-agency-display
                className="text-base font-bold tracking-tight text-foreground"
              >
                Socialify
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                Internal tool
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Operación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} className="h-auto">
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
                          'flex items-center gap-3 rounded-xl transition-colors relative py-2.5 md:py-2',
                          active
                            ? 'bg-accent text-foreground font-semibold'
                            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                        )}
                      >
                        <item.icon
                          className={cn('h-4 w-4', active ? 'text-primary' : 'opacity-70')}
                        />
                        <span className="truncate">{item.title}</span>
                        {active && !collapsed && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </a>

                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>


      <SidebarFooter className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border/60">
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
