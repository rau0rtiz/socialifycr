import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  description: string;
}

const agencySteps: TourStep[] = [
  {
    target: 'sidebar-nav',
    title: '¡Bienvenido a Socialify! 🎉',
    description: 'Este es tu menú de navegación principal. Desde aquí accedes a todas las secciones: Dashboard, Ventas, Contenido y más.',
  },
  {
    target: 'client-selector',
    title: 'Selector de Clientes',
    description: 'Aquí puedes cambiar entre tus clientes para ver sus métricas, contenido y ventas de forma individual.',
  },
  {
    target: 'kpi-section',
    title: 'Métricas Clave (KPIs)',
    description: 'Estas tarjetas muestran las métricas más importantes del cliente seleccionado: alcance, engagement, seguidores y más.',
  },
  {
    target: 'ventas-link',
    title: 'Registro de Ventas',
    description: 'Lleva control de las ventas generadas por mensajes directos, WhatsApp y otros canales. Vincula ventas con campañas publicitarias.',
  },
  {
    target: 'contenido-link',
    title: 'Gestión de Contenido',
    description: 'Organiza ideas de contenido, clasifica publicaciones con etiquetas y modelos, y analiza el rendimiento de cada pieza.',
  },
  {
    target: 'user-menu',
    title: 'Tu Perfil',
    description: 'Desde aquí puedes editar tu perfil, cambiar el tema y cerrar sesión. ¡Estás listo para comenzar!',
  },
];

const clientSteps: TourStep[] = [
  {
    target: 'sidebar-nav',
    title: '¡Bienvenido! 🎉',
    description: 'Este es tu panel personalizado. Desde el menú puedes navegar entre las secciones disponibles para ti.',
  },
  {
    target: 'kpi-section',
    title: 'Tus Métricas',
    description: 'Aquí ves un resumen de las métricas más importantes de tu marca: alcance, engagement y crecimiento.',
  },
  {
    target: 'contenido-link',
    title: 'Tu Contenido',
    description: 'Revisa las ideas de contenido, el rendimiento de tus publicaciones y las próximas piezas planificadas.',
  },
  {
    target: 'user-menu',
    title: 'Tu Perfil',
    description: 'Edita tu información personal y preferencias. ¡Bienvenido a bordo!',
  },
];

export const OnboardingTour = () => {
  const { user } = useAuth();
  const { isAgency, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowSide: 'top' | 'bottom' }>({ top: 0, left: 0, arrowSide: 'top' });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const { data: onboardingCompleted, isLoading } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return true;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();
      if (error) return true;
      return data?.onboarding_completed ?? false;
    },
    enabled: !!user?.id,
  });

  const completeTour = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', user?.id] });
    },
  });

  const steps = isAgency ? agencySteps : clientSteps;

  useEffect(() => {
    if (!isLoading && !roleLoading && onboardingCompleted === false) {
      // Small delay to let DOM render
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, roleLoading, onboardingCompleted]);

  const positionTooltip = useCallback(() => {
    const step = steps[currentStep];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
    const tooltipWidth = Math.min(360, window.innerWidth - 32);

    let top: number;
    let arrowSide: 'top' | 'bottom' = 'top';

    // Prefer below the element
    if (rect.bottom + tooltipHeight + 16 < window.innerHeight) {
      top = rect.bottom + 12;
      arrowSide = 'top';
    } else {
      top = rect.top - tooltipHeight - 12;
      arrowSide = 'bottom';
    }

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    setTooltipPos({ top, left, arrowSide });
  }, [currentStep, steps]);

  useEffect(() => {
    if (!isVisible) return;
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    return () => window.removeEventListener('resize', positionTooltip);
  }, [isVisible, currentStep, positionTooltip]);

  // Highlight effect
  useEffect(() => {
    if (!isVisible) return;
    const step = steps[currentStep];
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement;
    if (!el) return;

    el.style.position = 'relative';
    el.style.zIndex = '60';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 0 0 4000px rgba(0,0,0,0.5), 0 0 0 4px hsl(var(--primary) / 0.5)';
    el.style.transition = 'box-shadow 0.3s ease';

    return () => {
      el.style.position = '';
      el.style.zIndex = '';
      el.style.boxShadow = '';
      el.style.borderRadius = '';
      el.style.transition = '';
    };
  }, [isVisible, currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleFinish = () => {
    setIsVisible(false);
    completeTour.mutate();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay for click-blocking */}
      <div className="fixed inset-0 z-50" onClick={(e) => e.stopPropagation()} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[70] w-[calc(100vw-2rem)] max-w-[360px] bg-card border border-border rounded-xl shadow-lg p-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Close button */}
        <button
          onClick={handleFinish}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground font-medium">
            {currentStep + 1} / {steps.length}
          </span>
        </div>

        <h3 className="text-base font-semibold text-foreground mb-1">
          {steps[currentStep].title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {steps[currentStep].description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-6 bg-primary' : i < currentStep ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <Button size="sm" onClick={handleNext} className="gap-1">
            {currentStep === steps.length - 1 ? '¡Empezar!' : 'Siguiente'}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
};
