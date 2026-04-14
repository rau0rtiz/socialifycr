import { Button } from '@/components/ui/button';
import { Download, Calendar, Crown, ArrowRight } from 'lucide-react';

interface ResultsStepProps {
  level: number;
  name: string;
  onCalendlyClick: () => void;
}

const levelData = [
  { name: 'Idea', revenue: '$0', desc: 'Tenés una idea pero aún no la has lanzado. Tu plan te guiará con los primeros pasos para validar y monetizar.', color: '#94a3b8' },
  { name: 'Startup', revenue: '$0 – $3K/mes', desc: 'Ya lanzaste y estás consiguiendo tus primeros clientes. Tu estrategia se enfoca en tracción y consistencia.', color: '#3b82f6' },
  { name: 'Growing', revenue: '$3K – $15K/mes', desc: 'Tenés ingresos consistentes. Es hora de construir sistemas y escalar tu adquisición.', color: '#22c55e' },
  { name: 'Scaling', revenue: '$15K – $50K/mes', desc: 'Tu equipo está en su lugar. Necesitás optimizar operaciones y multiplicar canales.', color: '#FF6B35' },
  { name: 'Established', revenue: '$50K – $200K/mes', desc: 'Sistemas sólidos. Estás listo para multiplicar y expandir a nuevos mercados.', color: '#8b5cf6' },
  { name: 'Empire', revenue: '$200K+/mes', desc: 'Operación multi-canal. Tu enfoque es liderazgo, legado y crecimiento exponencial.', color: '#ef4444' },
];

export const ResultsStep = ({ level, name, onCalendlyClick }: ResultsStepProps) => {
  const current = levelData[level - 1];
  const qualifiesForSession = level >= 3 && level <= 5;
  const isPremium = level === 6;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      <div>
        <p className="text-[#1a1a2e]/50 mb-1 text-sm">Resultado para</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a1a2e]">
          {name}
        </h2>
      </div>

      {/* Level meter — scrollable on mobile */}
      <div className="flex items-center justify-center gap-1 py-4 md:py-6 overflow-x-auto scrollbar-hide">
        {levelData.map((l, i) => {
          const isActive = i + 1 === level;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 min-w-[48px] md:min-w-[64px]">
              <div
                className={`w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-xs md:text-base transition-all ${
                  isActive
                    ? 'ring-4 scale-110 shadow-lg text-white'
                    : i + 1 < level
                    ? 'opacity-60 text-white'
                    : 'opacity-30 bg-gray-200 text-gray-400'
                }`}
                style={{
                  backgroundColor: i + 1 <= level ? levelData[i].color : undefined,
                  boxShadow: isActive ? `0 0 0 4px ${levelData[i].color}40` : undefined,
                }}
              >
                {i + 1}
              </div>
              <span className={`text-[9px] md:text-xs max-w-[52px] leading-tight ${isActive ? 'font-bold text-[#1a1a2e]' : 'text-[#1a1a2e]/40'}`}>
                {l.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current level card */}
      <div className="p-5 md:p-8 text-left space-y-3 md:space-y-4 rounded-2xl border-2 bg-white" style={{ borderColor: current.color }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl"
            style={{ backgroundColor: current.color }}
          >
            {level}
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-[#1a1a2e]">Nivel {level}: {current.name}</h3>
            <p className="text-xs md:text-sm text-[#1a1a2e]/50">{current.revenue}</p>
          </div>
        </div>
        <p className="text-sm md:text-base text-[#1a1a2e]/70 leading-relaxed">{current.desc}</p>
      </div>

      {/* PDF Download */}
      <Button
        size="lg"
        className="w-full py-5 md:py-7 text-sm md:text-base gap-2 rounded-2xl font-semibold uppercase tracking-wide bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white"
        onClick={() => {
          alert('Los PDFs serán subidos próximamente. Por ahora este es un placeholder.');
        }}
      >
        <Download className="h-5 w-5" />
        Descargar mi estrategia (PDF)
      </Button>

      {/* CTA based on level */}
      {qualifiesForSession && (
        <div className="p-5 md:p-6 rounded-2xl bg-[#FF6B35]/5 border-2 border-[#FF6B35]/20 space-y-3 md:space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Calendar className="h-5 w-5 text-[#FF6B35]" />
            <h3 className="text-base md:text-lg font-bold text-[#1a1a2e]">¡Calificás para una sesión gratuita!</h3>
          </div>
          <p className="text-[#1a1a2e]/50 text-xs md:text-sm">
            Basado en tu nivel de negocio, te ofrecemos una sesión de planificación estratégica sin costo.
          </p>
          <Button
            size="lg"
            className="gap-2 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold px-6 md:px-8 rounded-xl text-sm md:text-base"
            onClick={onCalendlyClick}
          >
            Agendar sesión gratuita
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isPremium && (
        <div className="p-5 md:p-6 rounded-2xl bg-[#FF6B35]/5 border-2 border-[#FF6B35]/20 space-y-3 md:space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Crown className="h-5 w-5 text-[#FF6B35]" />
            <h3 className="text-base md:text-lg font-bold text-[#1a1a2e]">Consultoría Premium</h3>
          </div>
          <p className="text-[#1a1a2e]/50 text-xs md:text-sm">
            Tu negocio está en un nivel avanzado. Te ofrecemos una consultoría premium personalizada.
          </p>
          <Button
            size="lg"
            className="gap-2 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold px-6 md:px-8 rounded-xl text-sm md:text-base"
            onClick={onCalendlyClick}
          >
            Solicitar consultoría
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {level <= 2 && (
        <p className="text-xs md:text-sm text-[#1a1a2e]/40">
          Descargá tu estrategia y empezá a implementar. Cuando tu negocio crezca, estaremos acá para ayudarte a escalar. 🚀
        </p>
      )}
    </div>
  );
};
