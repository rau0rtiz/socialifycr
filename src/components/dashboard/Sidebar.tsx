import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Palette, 
  LogOut,
  ShoppingCart,
  History
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';


const mainMenuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Contenido', url: '/content', icon: FileText },
];

// Client-only menu items (simplified)
const clientMenuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Contenido', url: '/content', icon: FileText },
];

const managementMenuItems = [
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Ajustes del Dashboard', url: '/brand-settings', icon: Palette },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { platformBrand, selectedClient } = useBrand();
  const { signOut } = useAuth();
  const { isAgency, loading: roleLoading } = useUserRole();
  

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Determine which menu items to show based on user role
  const baseMenuItems = isAgency ? mainMenuItems : clientMenuItems;
  
  // Always include Ventas in menu
  const menuItems = [...baseMenuItems.slice(0, 1), { title: 'Ventas', url: '/ventas', icon: ShoppingCart }, ...baseMenuItems.slice(1)];

  return (
    <SidebarComponent collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {platformBrand.logoUrl ? (
            <img 
              src={platformBrand.logoUrl} 
              alt={platformBrand.name} 
              className="w-8 h-8 rounded-lg object-contain"
            />
          ) : (
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden"
              style={{ backgroundColor: `hsl(${platformBrand.primaryColor})` }}
            >
              {platformBrand.name.charAt(0)}
            </div>
          )}
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
              {menuItems.map((item) => (
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

        {/* Only show management section for agency users */}
        {isAgency && (
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
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
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
