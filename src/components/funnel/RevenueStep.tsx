import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

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

export const RevenueStep = ({ data, onChange, onNext, onBack }: RevenueStepProps) => {
  const canContinue = data.revenueRange && data.acquisitionMethod;

  return (
    <div className="space-y-8 animate-fade-in max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-[#1a1a2e]" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Ingresos y adquisición
        </h2>
        <p className="text-[#1a1a2e]/50 mt-2">Esto define el nivel de tu negocio.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-bold text-[#1a1a2e]">¿Cuáles son tus ingresos mensuales aproximados?</Label>
          <div className="space-y-2">
            {revenueOptions.map((opt) => (
              <OptionCard key={opt.value} selected={data.revenueRange === opt.value} label={opt.label} onClick={() => onChange('revenueRange', opt.value)} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-bold text-[#1a1a2e]">¿Cómo conseguís clientes actualmente?</Label>
          <div className="space-y-2">
            {acquisitionOptions.map((opt) => (
              <OptionCard key={opt.value} selected={data.acquisitionMethod === opt.value} label={opt.label} onClick={() => onChange('acquisitionMethod', opt.value)} />
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
