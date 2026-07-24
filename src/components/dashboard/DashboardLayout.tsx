import { ReactNode, CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { AgencySidebar } from '@/components/agency/AgencySidebar';
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
          <TopBar />
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