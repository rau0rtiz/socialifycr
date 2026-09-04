import { ReactNode, CSSProperties, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { AgencySidebar } from '@/components/agency/AgencySidebar';
import { AgencyTopBar } from '@/components/agency/AgencyTopBar';
import { TopBar } from './TopBar';

import { useBrand } from '@/contexts/BrandContext';
import { isProduccionesHost } from '@/lib/host-mode';
import { cn } from '@/lib/utils';



export interface DashboardLayoutProps {
  children: ReactNode;
  style?: CSSProperties;
}

export const DashboardLayout = ({ children, style }: DashboardLayoutProps) => {
  const { platformBrand, selectedClient, clientBrands } = useBrand();
  const { pathname } = useLocation();
  const isAgencyHub = pathname.startsWith('/agencia');

  // The agency hub is always dark. The class lives on <html> so portalled
  // surfaces (dialogs, dropdowns, toasts) inherit the same dark tokens.
  useEffect(() => {
    const root = document.documentElement;
    if (isAgencyHub) root.classList.add('agency-theme', 'dark');
    else root.classList.remove('agency-theme', 'dark');
    return () => root.classList.remove('agency-theme', 'dark');
  }, [isAgencyHub]);


  const clientBrand = selectedClient ? clientBrands[selectedClient.id] : null;
  const clientAccentColor = clientBrand?.accentColor || selectedClient?.accent_color || '217 91% 60%';
  const clientSecondaryColor = clientBrand?.secondaryColor || '199 89% 48%';

  const combinedStyle = {
    '--client-accent': clientAccentColor,
    '--client-secondary': clientSecondaryColor,
    '--platform-accent': platformBrand.accentColor,
    ...style,
  } as CSSProperties;

  // On the produ.* subdomain we render a chrome-less layout so the
  // Producciones module looks like a standalone app.
  if (isProduccionesHost()) {
    return (
      <div
        className="h-[100dvh] w-full bg-background overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] dashboard-bg-decor"
        style={combinedStyle}
      >
        <main className="p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div
        className={cn(
          'h-[100dvh] flex w-full overflow-hidden',
          isAgencyHub ? 'agency-shell bg-background' : 'bg-background',
        )}
        style={combinedStyle}
      >
        {isAgencyHub ? <AgencySidebar /> : <Sidebar />}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {!isAgencyHub && <TopBar />}
          {isAgencyHub && (
            <>
              <AgencyTopBar />
              {/* Thumb-reachable trigger on phones */}
              <SidebarTrigger
                aria-label="Abrir menú"
                className="md:hidden fixed left-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 h-12 w-12 rounded-full border border-border bg-card text-foreground shadow-lg"
              />
            </>
          )}

          <main
            className={cn(
              'flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden relative overscroll-contain [-webkit-overflow-scrolling:touch]',
              !isAgencyHub && 'dashboard-bg-decor',
            )}
            key="main-content"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};