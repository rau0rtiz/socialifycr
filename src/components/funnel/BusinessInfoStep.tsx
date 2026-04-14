import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface BusinessInfoStepProps {
  data: { industry: string; timeInBusiness: string; teamSize: string };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const industries = [
  'E-commerce / Tienda online',
  'Servicios profesionales',
  'Educación / Cursos',
  'Salud / Bienestar',
  'Gastronomía / Restaurantes',
  'Tecnología / Software',
  'Otro',
];

const timeOptions = [
  { value: 'not_started', label: 'Aún no he empezado' },
  { value: 'less_1', label: 'Menos de 1 año' },
  { value: '1_3', label: '1 – 3 años' },
  { value: '3_plus', label: 'Más de 3 años' },
];

const teamOptions = [
  { value: 'solo', label: 'Solo yo' },
  { value: '2_5', label: '2 – 5 personas' },
  { value: '6_15', label: '6 – 15 personas' },
  { value: '15_plus', label: 'Más de 15 personas' },
];

export const BusinessInfoStep = ({ data, onChange, onNext, onBack }: BusinessInfoStepProps) => {
  const canContinue = data.industry && data.timeInBusiness && data.teamSize;

  return (
    <div className="space-y-8 animate-fade-in max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Contanos sobre tu negocio</h2>
        <p className="text-muted-foreground mt-1">Esto nos ayuda a personalizar tu estrategia.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">¿En qué industria estás?</Label>
          <RadioGroup value={data.industry} onValueChange={(v) => onChange('industry', v)}>
            {industries.map((ind) => (
              <div key={ind} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value={ind} id={`ind-${ind}`} />
                <Label htmlFor={`ind-${ind}`} className="cursor-pointer flex-1">{ind}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">¿Cuánto tiempo tiene tu negocio?</Label>
          <RadioGroup value={data.timeInBusiness} onValueChange={(v) => onChange('timeInBusiness', v)}>
            {timeOptions.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value={opt.value} id={`time-${opt.value}`} />
                <Label htmlFor={`time-${opt.value}`} className="cursor-pointer flex-1">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">¿Cuántas personas hay en tu equipo?</Label>
          <RadioGroup value={data.teamSize} onValueChange={(v) => onChange('teamSize', v)}>
            {teamOptions.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value={opt.value} id={`team-${opt.value}`} />
                <Label htmlFor={`team-${opt.value}`} className="cursor-pointer flex-1">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Atrás</Button>
        <Button onClick={onNext} disabled={!canContinue}> Siguiente <ArrowRight className="h-4 w-4 ml-2" /></Button>
      </div>
    </div>
  );
};
