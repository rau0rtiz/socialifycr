import { ReactNode, CSSProperties } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

import { useBrand } from '@/contexts/BrandContext';


export interface DashboardLayoutProps {
  children: ReactNode;
  style?: CSSProperties;
}

export const DashboardLayout = ({ children, style }: DashboardLayoutProps) => {
  const { platformBrand, selectedClient, clientBrands } = useBrand();
  
  const clientBrand = selectedClient ? clientBrands[selectedClient.id] : null;
  const clientAccentColor = clientBrand?.accentColor || selectedClient?.accent_color || '217 91% 60%';
  const clientSecondaryColor = clientBrand?.secondaryColor || '199 89% 48%';

  const combinedStyle = {
    '--client-accent': clientAccentColor,
    '--client-secondary': clientSecondaryColor,
    '--platform-accent': platformBrand.accentColor,
    ...style,
  } as CSSProperties;

  return (
    <SidebarProvider>
      <div 
        className="h-[100dvh] flex w-full bg-background overflow-hidden"
        style={combinedStyle}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <TopBar />
           <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden relative dashboard-bg-decor overscroll-contain [-webkit-overflow-scrolling:touch]" key="main-content">
             {children}
           </main>
        </div>
        
      </div>
    </SidebarProvider>
  );
};