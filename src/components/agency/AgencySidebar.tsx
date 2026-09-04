import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { prefetchRoute } from '@/lib/route-prefetch';
import { useAuth } from '@/contexts/AuthContext';
import { AGENCY_NAV, isNavActive, type AgencyNavItem } from './nav-items';

export const AgencySidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const [, startTransition] = useTransition();

  const go = (url: string) => startTransition(() => navigate(url));

  const renderLink = (item: AgencyNavItem, active: boolean) => (
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
        'relative flex items-center gap-3 rounded-xl py-2.5 transition-all md:py-2',
        active
          ? 'bg-primary/12 font-semibold text-foreground agency-neon'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      <item.icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)]' : 'opacity-70',
        )}
      />
      <span className="truncate">{item.title}</span>
      {active && !collapsed && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
      )}
    </a>
  );

  return (
    <SidebarComponent collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-primary agency-glow" />
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
              {AGENCY_NAV.map((item) => {
                const active = isNavActive(item, pathname);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} className="h-auto">
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{renderLink(item, active)}</TooltipTrigger>
                          <TooltipContent side="right">{item.title}</TooltipContent>
                        </Tooltip>
                      ) : (
                        renderLink(item, active)
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
