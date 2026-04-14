import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface RevenueStepProps {
  data: { revenueRange: string; acquisitionMethod: string };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const revenueOptions = [
  { value: '0', label: '$0 — Aún no genero ingresos' },
  { value: '0_3k', label: '$1 – $3,000 / mes' },
  { value: '3k_15k', label: '$3,000 – $15,000 / mes' },
  { value: '15k_50k', label: '$15,000 – $50,000 / mes' },
  { value: '50k_200k', label: '$50,000 – $200,000 / mes' },
  { value: '200k_plus', label: 'Más de $200,000 / mes' },
];

const acquisitionOptions = [
  { value: 'organic', label: 'Redes sociales orgánicas' },
  { value: 'paid_ads', label: 'Publicidad pagada (Meta, Google, etc.)' },
  { value: 'referrals', label: 'Referidos / boca a boca' },
  { value: 'content', label: 'Marketing de contenido (blog, YouTube, etc.)' },
  { value: 'cold_outreach', label: 'Prospección en frío' },
  { value: 'mixed', label: 'Combinación de varias' },
];

export const RevenueStep = ({ data, onChange, onNext, onBack }: RevenueStepProps) => {
  const canContinue = data.revenueRange && data.acquisitionMethod;

  return (
    <div className="space-y-8 animate-fade-in max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Ingresos y adquisición</h2>
        <p className="text-muted-foreground mt-1">Esto define el nivel de tu negocio.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">¿Cuáles son tus ingresos mensuales aproximados?</Label>
          <RadioGroup value={data.revenueRange} onValueChange={(v) => onChange('revenueRange', v)}>
            {revenueOptions.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value={opt.value} id={`rev-${opt.value}`} />
                <Label htmlFor={`rev-${opt.value}`} className="cursor-pointer flex-1">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">¿Cómo conseguís clientes actualmente?</Label>
          <RadioGroup value={data.acquisitionMethod} onValueChange={(v) => onChange('acquisitionMethod', v)}>
            {acquisitionOptions.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value={opt.value} id={`acq-${opt.value}`} />
                <Label htmlFor={`acq-${opt.value}`} className="cursor-pointer flex-1">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Atrás</Button>
        <Button onClick={onNext} disabled={!canContinue}>Siguiente <ArrowRight className="h-4 w-4 ml-2" /></Button>
      </div>
    </div>
  );
};
