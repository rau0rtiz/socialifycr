import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface ChallengeStepProps {
  data: { challenge: string };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const challenges = [
  { value: 'no_clients', label: 'No consigo suficientes clientes' },
  { value: 'no_systems', label: 'No tengo sistemas ni procesos claros' },
  { value: 'no_team', label: 'No sé cómo delegar o construir equipo' },
  { value: 'no_scale', label: 'Estoy estancado y no puedo escalar' },
  { value: 'no_brand', label: 'Mi marca no se diferencia de la competencia' },
  { value: 'no_time', label: 'No tengo tiempo — hago todo yo' },
  { value: 'no_digital', label: 'No sé cómo usar el marketing digital' },
];

export const ChallengeStep = ({ data, onChange, onNext, onBack }: ChallengeStepProps) => (
  <div className="space-y-8 animate-fade-in max-w-lg mx-auto">
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-foreground">Tu mayor desafío</h2>
      <p className="text-muted-foreground mt-1">¿Qué es lo que más te frena hoy?</p>
    </div>

    <RadioGroup value={data.challenge} onValueChange={(v) => onChange('challenge', v)}>
      {challenges.map((ch) => (
        <div key={ch.value} className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
          <RadioGroupItem value={ch.value} id={`ch-${ch.value}`} />
          <Label htmlFor={`ch-${ch.value}`} className="cursor-pointer flex-1 text-base">{ch.label}</Label>
        </div>
      ))}
    </RadioGroup>

    <div className="flex justify-between pt-4">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Atrás</Button>
      <Button onClick={onNext} disabled={!data.challenge}>Siguiente <ArrowRight className="h-4 w-4 ml-2" /></Button>
    </div>
  </div>
);
