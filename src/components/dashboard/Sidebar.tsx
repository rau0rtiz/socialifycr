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
  
  Eye,
  FolderOpen,
  Mail,
  KeyRound,
  X,
  Briefcase,
  Database,
  Loader2,
  DollarSign,
  Layers,
  GraduationCap,
  Package,
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
  { title: 'Comunicaciones', url: '/comunicaciones', icon: Mail },
  { title: 'Accesos', url: '/accesos', icon: KeyRound },
  { title: 'Ad Frameworks', url: '/ad-frameworks', icon: Layers },
  
  { title: 'Widget Catalog', url: '/widget-catalog', icon: Eye },
  { title: 'Finanzas Agencia', url: '/agencia/finanzas', icon: DollarSign },
  { title: 'Historial', url: '/historial', icon: History },
  { title: 'Archivos', url: '/archivos', icon: FolderOpen },
  { title: 'Ajustes del Dashboard', url: '/brand-settings', icon: Palette },
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

  if (showVentas) {
    const ventasLabel = 'Ventas';
    menuItems.push({ title: ventasLabel, url: '/ventas', icon: ShoppingCart, dataTour: 'ventas-link' });
  }

  // Órdenes — solo para negocios retail (Alma Bendita, Tissue)
  const isAlmaBenditaClient = selectedClient?.name?.toLowerCase().includes('alma bendita');
  const isTissueRetail = selectedClient?.name?.toLowerCase().includes('tissue');
  const isRetailClient = isAlmaBenditaClient || isTissueRetail;
  if (isRetailClient && (effectiveAgency || flags.ventas_section)) {
    menuItems.push({ title: 'Órdenes', url: '/ordenes', icon: Package });
  }

  const isTissueClient = selectedClient?.name?.toLowerCase().includes('tissue');
  const showAsistencia = (effectiveAgency || (flags as any).asistencia_section) && !isTissueClient;
  if (showAsistencia) {
    menuItems.push({ title: 'Asistencia', url: '/asistencia', icon: ClipboardCheck });
  }

  // Comisiones — only for The Mind Coach, visible to owners/admins/account managers
  const isMindCoach = selectedClient?.name?.toLowerCase().includes('mind coach');
  const isAccountManager = selectedClient
    ? clientAccess.some(a => a.clientId === selectedClient.id && a.role === 'account_manager')
    : false;
  const canSeeCommissions = isMindCoach && (canManage || isAccountManager) && !isPreviewMode;
  if (canSeeCommissions) {
    menuItems.push({ title: 'Comisiones', url: '/comisiones', icon: DollarSign });
  }
  // Frameworks — exclusive section for The Mind Coach (visible to all team members)
  if (isMindCoach) {
    menuItems.push({ title: 'Frameworks', url: '/masterclass', icon: GraduationCap });
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
              loading="eager"
              decoding="async"
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
            <span className="font-wordmark uppercase text-foreground text-xl tracking-tight">{platformBrand.name}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item.url.split('?')[0]);
                return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={active}>
                    <a 
                      href={item.url}
                      data-tour={item.dataTour}
                      onClick={(e) => {
                        e.preventDefault();
                        transitionNavigate(item.url);
                      }}
                      className={cn(
                        "flex items-center gap-3 transition-colors relative",
                        active
                          ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-primary"
                          : "hover:bg-primary/5 hover:text-primary"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
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
                {managementMenuItems.map((item) => {
                  const active = isActive(item.url);
                  return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <a 
                        href={item.url}
                        onClick={(e) => {
                          e.preventDefault();
                          transitionNavigate(item.url);
                        }}
                        className={cn(
                          "flex items-center gap-3 transition-colors relative",
                          active
                            ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-primary"
                            : "hover:bg-primary/5 hover:text-primary"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  );
                })}
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
