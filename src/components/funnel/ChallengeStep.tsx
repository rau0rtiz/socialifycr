import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

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

const OptionCard = ({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left px-3.5 py-3 md:p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${
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
    <span className={`text-sm md:text-base ${selected ? 'text-[#1a1a2e] font-semibold' : 'text-[#1a1a2e]/70'}`}>{label}</span>
  </button>
);

export const ChallengeStep = ({ data, onChange, onNext, onBack }: ChallengeStepProps) => (
  <div className="space-y-6 md:space-y-8 animate-fade-in max-w-lg mx-auto">
    <div>
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1a1a2e]">
        Tu mayor desafío
      </h2>
      <p className="text-[#1a1a2e]/50 mt-1 text-sm md:text-base">¿Qué es lo que más te frena hoy?</p>
    </div>

    <div className="space-y-1.5 md:space-y-2">
      {challenges.map((ch) => (
        <OptionCard key={ch.value} selected={data.challenge === ch.value} label={ch.label} onClick={() => onChange('challenge', ch.value)} />
      ))}
    </div>

    <div className="flex justify-between pt-2 md:pt-4">
      <Button variant="ghost" onClick={onBack} className="text-[#1a1a2e]/60 hover:text-[#1a1a2e] text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" />Atrás
      </Button>
      <Button onClick={onNext} disabled={!data.challenge} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold px-6 md:px-8 rounded-xl text-sm md:text-base">
        Siguiente <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  </div>
);
