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
  const clientBrand = clientBrands[selectedClient.id];

  const combinedStyle = {
    '--client-accent': clientBrand?.accentColor || selectedClient.accentColor,
    '--client-secondary': clientBrand?.secondaryColor || selectedClient.secondaryColor,
    '--platform-accent': platformBrand.accentColor,
    ...style,
  } as CSSProperties;

  return (
    <SidebarProvider>
      <div 
        className="min-h-screen flex w-full bg-muted/30"
        style={combinedStyle}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};