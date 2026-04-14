import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => (
  <div className="flex flex-col items-center justify-center text-center space-y-6 md:space-y-10 animate-fade-in min-h-[60vh]">
    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#1a1a2e] max-w-2xl leading-[1.15]">
      Obtené tu{' '}
      <span className="text-[#FF6B35]">Roadmap de Crecimiento</span>{' '}
      personalizado… en menos de 2 minutos.
    </h1>

    <p className="text-base md:text-lg text-[#1a1a2e]/55 max-w-md leading-relaxed">
      Respondé unas preguntas rápidas sobre tu negocio y recibí una estrategia diseñada para tu nivel actual.
    </p>

    <Button
      size="lg"
      onClick={onNext}
      className="text-base md:text-lg px-10 md:px-12 py-6 md:py-7 rounded-2xl gap-2 shadow-xl hover:shadow-2xl transition-all font-semibold uppercase tracking-wide bg-[#FF6B35] hover:bg-[#e55a2b] text-white border-0"
    >
      Empezar ahora
      <ArrowRight className="h-5 w-5" />
    </Button>

    <p className="text-xs md:text-sm text-[#1a1a2e]/40 font-medium">
      Sin costo · Sin compromisos · Resultados inmediatos
    </p>
  </div>
);
