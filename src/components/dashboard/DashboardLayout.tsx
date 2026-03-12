import { ReactNode, CSSProperties } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useBrand } from '@/contexts/BrandContext';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

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
        className="min-h-screen flex w-full bg-muted/30"
        style={combinedStyle}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main ref={mainRef} className="flex-1 p-3 md:p-6 overflow-auto relative">
            {pulling && (
              <div 
                className="flex items-center justify-center transition-transform"
                style={{ height: pullDistance, minHeight: pullDistance > 10 ? 24 : 0 }}
              >
                <Loader2 
                  className="h-5 w-5 text-muted-foreground animate-spin" 
                  style={{ opacity: Math.min(pullDistance / 60, 1) }}
                />
              </div>
            )}
            {children}
          </main>
        </div>
        <OnboardingTour />
      </div>
    </SidebarProvider>
  );
};