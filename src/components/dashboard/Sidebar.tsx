import { 
  LayoutDashboard, 
  Megaphone, 
  Share2, 
  FileText, 
  BarChart3, 
  Users, 
  Palette, 
  LogOut,
  ChevronLeft
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useBrand } from '@/contexts/BrandContext';

const mainMenuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Campañas', url: '/campaigns', icon: Megaphone },
  { title: 'Redes Sociales', url: '/social', icon: Share2 },
  { title: 'Contenido', url: '/content', icon: FileText },
  { title: 'Reportes', url: '/reports', icon: BarChart3 },
];

const managementMenuItems = [
  { title: 'Clientes', url: '/clients', icon: Users },
  { title: 'Configuración de Marca', url: '/brand-settings', icon: Palette },
];

export const Sidebar = () => {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { platformBrand } = useBrand();

  const isActive = (path: string) => location.pathname === path;

  return (
    <SidebarComponent collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm"
            style={{ backgroundColor: `hsl(${platformBrand.accentColor})` }}
          >
            S
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground text-lg">{platformBrand.name}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      className={cn(
                        "flex items-center gap-3 transition-colors",
                        isActive(item.url) && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 transition-colors",
                        isActive(item.url) && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarComponent>
  );
};
