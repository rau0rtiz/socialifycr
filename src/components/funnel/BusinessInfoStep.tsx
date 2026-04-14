import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

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

const OptionCard = ({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${
      selected
        ? 'border-[#FF6B35] bg-[#FF6B35]/5 shadow-sm'
        : 'border-gray-200 hover:border-[#FF6B35]/40 hover:bg-gray-50'
    }`}
  >
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
      selected ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-gray-300'
    }`}>
      {selected && <Check className="h-3 w-3 text-white" />}
    </div>
    <span className={`text-base ${selected ? 'text-[#1a1a2e] font-semibold' : 'text-[#1a1a2e]/70'}`}>{label}</span>
  </button>
);

export const BusinessInfoStep = ({ data, onChange, onNext, onBack }: BusinessInfoStepProps) => {
  const canContinue = data.industry && data.timeInBusiness && data.teamSize;

  return (
    <div className="space-y-8 animate-fade-in max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-[#1a1a2e]" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Contanos sobre tu negocio
        </h2>
        <p className="text-[#1a1a2e]/50 mt-2">Esto nos ayuda a personalizar tu estrategia.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-bold text-[#1a1a2e]">¿En qué industria estás?</Label>
          <div className="space-y-2">
            {industries.map((ind) => (
              <OptionCard key={ind} selected={data.industry === ind} label={ind} onClick={() => onChange('industry', ind)} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-bold text-[#1a1a2e]">¿Cuánto tiempo tiene tu negocio?</Label>
          <div className="space-y-2">
            {timeOptions.map((opt) => (
              <OptionCard key={opt.value} selected={data.timeInBusiness === opt.value} label={opt.label} onClick={() => onChange('timeInBusiness', opt.value)} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-bold text-[#1a1a2e]">¿Cuántas personas hay en tu equipo?</Label>
          <div className="space-y-2">
            {teamOptions.map((opt) => (
              <OptionCard key={opt.value} selected={data.teamSize === opt.value} label={opt.label} onClick={() => onChange('teamSize', opt.value)} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="text-[#1a1a2e]/60 hover:text-[#1a1a2e]">
          <ArrowLeft className="h-4 w-4 mr-2" />Atrás
        </Button>
        <Button onClick={onNext} disabled={!canContinue} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold px-8 rounded-xl">
          Siguiente <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
