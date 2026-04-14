import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => (
  <div className="flex flex-col items-center justify-center text-center space-y-8 md:space-y-10 animate-fade-in min-h-[65vh]">
    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#212121] max-w-3xl leading-[1.1]">
      Obtené tu<br />
      <span className="text-[#FF6B35]">Roadmap de Crecimiento Personalizado</span><br />
      En menos de 2 minutos
    </h1>

    <Button
      size="lg"
      onClick={onNext}
      className="text-base md:text-lg px-10 md:px-14 py-6 md:py-7 rounded-2xl gap-2 shadow-xl hover:shadow-2xl transition-all font-semibold uppercase tracking-wide bg-[#FF6B35] hover:bg-[#e55a2b] text-white border-0"
    >
      Empezar ahora
      <ArrowRight className="h-5 w-5" />
    </Button>

    <div className="space-y-2 pt-2">
      <p className="flex items-center justify-center gap-2 text-sm md:text-base font-semibold text-[#212121]">
        <Sparkles className="h-4 w-4 text-[#FF6B35]" />
        Obtené tu Roadmap en menos de 2 minutos
      </p>
      <p className="flex items-center justify-center gap-2 text-sm md:text-base font-semibold text-[#212121]">
        <Sparkles className="h-4 w-4 text-[#FF6B35]" />
        Usado por más de 30 dueños de negocio
      </p>
    </div>

    <p className="text-[10px] md:text-xs text-[#212121]/40 max-w-md leading-relaxed">
      Al completar este formulario aceptás que Socialify te contacte por correo electrónico con tu estrategia personalizada. No compartimos tu información con terceros.
    </p>
  </div>
);
