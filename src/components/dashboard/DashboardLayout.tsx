import { ReactNode, CSSProperties, useRef, useState, useCallback, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useBrand } from '@/contexts/BrandContext';
import { Loader2 } from 'lucide-react';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

export interface DashboardLayoutProps {
  children: ReactNode;
  style?: CSSProperties;
}

export const DashboardLayout = ({ children, style }: DashboardLayoutProps) => {
  const { platformBrand, selectedClient, clientBrands } = useBrand();
  const mainRef = useRef<HTMLElement>(null);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = mainRef.current;
    if (el && el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPulling(true);
      setPullDistance(Math.min(diff * 0.4, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      window.location.reload();
    }
    setPulling(false);
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
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
      </div>
    </SidebarProvider>
  );
};