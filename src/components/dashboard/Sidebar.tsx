import { useTransition } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Palette, 
  LogOut,
  ShoppingCart,
  ClipboardCheck,
  History,
  BarChart3,
  CreditCard,
  Image,
  Eye,
  Mail,
  KeyRound,
  X,
  Briefcase,
  Database,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  { title: 'Emails', url: '/emails-log', icon: Mail },
  { title: 'Accesos', url: '/accesos', icon: KeyRound },
  { title: 'Facturación', url: '/facturacion', icon: CreditCard },
  { title: 'Widget Catalog', url: '/widget-catalog', icon: Eye },
  { title: 'Historial', url: '/historial', icon: History },
  { title: 'Image DB', url: '/image-db', icon: Image },
  { title: 'Ajustes del Dashboard', url: '/brand-settings', icon: Palette },
  { title: 'Lead Funnel', url: '/funnel', icon: Megaphone },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { platformBrand, selectedClient } = useBrand();
  const { signOut } = useAuth();
  const { isAgency, canManage, systemRole, clientAccess, loading: roleLoading } = useUserRole();
  const { flags } = useClientFeatures(selectedClient?.id ?? null);
  const [isPending, startTransition] = useTransition();

  const isPreviewMode = !!searchParams.get('preview');
  const isOwnerOrAdmin = !roleLoading && (systemRole === 'owner' || systemRole === 'admin');

  const isActive = (path: string) => location.pathname === path;

  const transitionNavigate = (path: string) => {
    startTransition(() => {
      navigate(path);
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleClientView = () => {
    if (selectedClient) {
      transitionNavigate(`/?preview=${selectedClient.id}`);
    }
  };

  const handleExitPreview = () => {
    transitionNavigate('/');
  };

  // In preview mode, behave like a client — respect feature flags
  const effectiveAgency = isAgency && !isPreviewMode;

  // Build menu items based on feature flags
  const menuItems: { title: string; url: string; icon: React.ElementType; dataTour?: string }[] = [
    { title: 'Dashboard', url: isPreviewMode ? `/?preview=${searchParams.get('preview')}` : '/', icon: LayoutDashboard },
  ];

  // For agency users (not in preview), always show all sections. Otherwise respect flags.
  const showVentas = effectiveAgency || flags.ventas_section;
  const showContenido = effectiveAgency || flags.contenido_section;
  const showReportes = effectiveAgency || flags.reportes_section;

  if (showVentas) {
    const ventasLabel = 'Ventas';
    menuItems.push({ title: ventasLabel, url: '/ventas', icon: ShoppingCart, dataTour: 'ventas-link' });
  }

  const showAsistencia = effectiveAgency || (flags as any).asistencia_section;
  if (showAsistencia) {
    menuItems.push({ title: 'Asistencia', url: '/asistencia', icon: ClipboardCheck });
  }
  if (showContenido) {
    menuItems.push({ title: 'Contenido', url: '/content', icon: FileText, dataTour: 'contenido-link' });
  }
  if (showReportes) {
    menuItems.push({ title: 'Reportes', url: '/reportes', icon: BarChart3 });
  }
  menuItems.push({ title: 'Client Database', url: '/client-database', icon: Database });
  const showBusinessSetup = effectiveAgency || (flags as any).business_setup_section;
  if (showBusinessSetup) {
    menuItems.push({ title: 'Business Setup', url: '/business-setup', icon: Briefcase });
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
                  <SidebarMenuButton asChild isActive={isActive(item.url.split('?')[0])}>
                    <a 
                      href={item.url}
                      data-tour={item.dataTour}
                      onClick={(e) => {
                        e.preventDefault();
                        transitionNavigate(item.url);
                      }}
                      className={cn(
                        "flex items-center gap-3 transition-colors",
                        isActive(item.url.split('?')[0]) && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Preview mode: show exit button instead of management */}
        {isPreviewMode && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleExitPreview}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                    <span>Salir de Vista Cliente</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(canManage && !isPreviewMode) && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestión</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <a 
                        href={item.url}
                        onClick={(e) => {
                          e.preventDefault();
                          transitionNavigate(item.url);
                        }}
                        className={cn(
                          "flex items-center gap-3 transition-colors",
                          isActive(item.url) && "bg-accent text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
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
