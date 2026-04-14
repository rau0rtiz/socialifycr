import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => (
  <div className="flex flex-col items-center justify-center text-center space-y-8 animate-fade-in min-h-[60vh]">
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
      <Zap className="h-4 w-4" />
      Quiz gratuito · 2 minutos
    </div>

    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground max-w-3xl leading-tight">
      Descubrí en qué nivel está tu negocio
    </h1>

    <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
      Respondé unas preguntas rápidas y recibí una estrategia personalizada para llevar tu negocio al siguiente nivel.
    </p>

    <Button
      size="lg"
      onClick={onNext}
      className="text-lg px-8 py-6 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all"
    >
      Comenzar ahora
      <ArrowRight className="h-5 w-5" />
    </Button>

    <p className="text-xs text-muted-foreground">
      Sin costo · Sin compromisos · Resultados inmediatos
    </p>
  </div>
);
