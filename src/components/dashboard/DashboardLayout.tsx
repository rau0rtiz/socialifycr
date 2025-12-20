import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useBrand } from '@/contexts/BrandContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { platformBrand, selectedClient, clientBrands } = useBrand();
  const clientBrand = clientBrands[selectedClient.id];

  return (
    <SidebarProvider>
      <div 
        className="min-h-screen flex w-full bg-muted/30"
        style={{
          '--client-accent': clientBrand?.accentColor || selectedClient.accentColor,
          '--client-secondary': clientBrand?.secondaryColor || selectedClient.secondaryColor,
          '--platform-accent': platformBrand.accentColor,
        } as React.CSSProperties}
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