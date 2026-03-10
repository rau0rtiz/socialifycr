import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Palette, 
  LogOut,
  ShoppingCart,
  History,
  BarChart3,
  CreditCard,
  Image,
  Eye,
  KeyRound,
  Mail,
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
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useBrand } from '@/contexts/BrandContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useClientFeatures } from '@/hooks/use-client-features';

const managementMenuItems = [
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Accesos', url: '/accesos', icon: KeyRound },
  { title: 'Facturación', url: '/facturacion', icon: CreditCard },
  { title: 'Historial', url: '/historial', icon: History },
  { title: 'Image DB', url: '/image-db', icon: Image },
  { title: 'Ajustes del Dashboard', url: '/brand-settings', icon: Palette },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { platformBrand, selectedClient } = useBrand();
  const { signOut } = useAuth();
  const { isAgency, systemRole, loading: roleLoading } = useUserRole();
  const { flags } = useClientFeatures(selectedClient?.id ?? null);

  const isOwnerOrAdmin = !roleLoading && (systemRole === 'owner' || systemRole === 'admin');

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleClientView = () => {
    if (selectedClient) {
      navigate(`/?preview=${selectedClient.id}`);
    }
  };

  

  // Build menu items based on feature flags
  const menuItems: { title: string; url: string; icon: React.ElementType; dataTour?: string }[] = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  ];

  // For agency users, always show all sections. For clients, respect flags.
  const showVentas = isAgency || flags.ventas_section;
  const showContenido = isAgency || flags.contenido_section;
  const showReportes = isAgency || flags.reportes_section;
  const showEmailMarketing = isAgency || flags.email_marketing_section;

  if (showVentas) {
    menuItems.push({ title: 'Ventas', url: '/ventas', icon: ShoppingCart, dataTour: 'ventas-link' });
  }
  if (showContenido) {
    menuItems.push({ title: 'Contenido', url: '/content', icon: FileText, dataTour: 'contenido-link' });
  }
  if (showReportes) {
    menuItems.push({ title: 'Reportes', url: '/reportes', icon: BarChart3 });
  }
  if (showEmailMarketing) {
    menuItems.push({ title: 'Email Marketing', url: '/email-marketing', icon: Mail });
  }

  return (
    <SidebarComponent collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4" data-tour="sidebar-nav">
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
                      data-tour={item.dataTour}
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
                {isOwnerOrAdmin && selectedClient && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleClientView}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Vista Cliente</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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
