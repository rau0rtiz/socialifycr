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
import socialifyLogo from '@/assets/socialify-wordmark.png.asset.json';

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
        'relative flex items-center rounded-xl transition-all',
        collapsed
          ? '!h-10 !w-10 !justify-center !p-0'
          : 'gap-3 py-2.5 px-3 md:py-2',
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
      <span className="truncate group-data-[collapsible=icon]/sidebar:hidden">
        {item.title}
      </span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] group-data-[collapsible=icon]/sidebar:hidden" />
      )}
    </a>
  );

  return (
    <SidebarComponent collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          {!collapsed ? (
            <img
              src={socialifyLogo.url}
              alt="Socialify"
              className="h-4 w-auto object-contain object-left drop-shadow-[0_0_10px_hsl(var(--primary)/0.25)]"
            />
          ) : (
            <div className="h-8 w-8 shrink-0 rounded-xl bg-primary agency-glow" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              'text-[10px] uppercase tracking-[0.2em] text-muted-foreground',
              collapsed && 'sr-only',
            )}
          >
            Operación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {AGENCY_NAV.map((item) => {
                const active = isNavActive(item, pathname);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-auto group-data-[collapsible=icon]/sidebar:mx-auto"
                    >
                      {renderLink(item, active)}
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
              className={cn(
                'text-muted-foreground hover:text-foreground transition-all',
                collapsed && 'h-10 w-10 justify-center p-0 mx-auto',
              )}
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarComponent>
  );
};
