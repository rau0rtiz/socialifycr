import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Calendar, Crown, ArrowRight, Lock, Loader2 } from 'lucide-react';

interface ResultsStepProps {
  level: number;
  onSubmitContact: (name: string, email: string) => Promise<boolean>;
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

export const ResultsStep = ({ level, onSubmitContact, onCalendlyClick }: ResultsStepProps) => {
  const [revealed, setRevealed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const current = levelData[level - 1];
  const qualifiesForSession = level >= 3 && level <= 5;
  const isPremium = level === 6;
  const canSubmit = name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const ok = await onSubmitContact(name, email);
    setIsSubmitting(false);
    if (ok) setRevealed(true);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in max-w-2xl mx-auto">
      {/* Results section — blurred until revealed */}
      <div className={`text-center transition-all duration-700 ${!revealed ? 'blur-md select-none pointer-events-none' : ''}`}>
        <div>
          <p className="text-[#212121]/50 mb-1 text-sm">Tu resultado</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#212121]">
            {revealed ? name : 'Tu Negocio'}
          </h2>
        </div>

        {/* Level meter */}
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
                <span className={`text-[9px] md:text-xs max-w-[52px] leading-tight ${isActive ? 'font-bold text-[#212121]' : 'text-[#212121]/40'}`}>
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
              <h3 className="text-lg md:text-xl font-bold text-[#212121]">Nivel {level}: {current.name}</h3>
              <p className="text-xs md:text-sm text-[#212121]/50">{current.revenue}</p>
            </div>
          </div>
          <p className="text-sm md:text-base text-[#212121]/70 leading-relaxed">{current.desc}</p>
        </div>
      </div>

      {/* Contact form — shown when not yet revealed */}
      {!revealed && (
        <div className="space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#212121]">
              Desbloqueá tu Roadmap de Crecimiento Digital
            </h2>
            <p className="text-[#212121]/50 mt-1 text-sm md:text-base">
              Ingresá tus datos para ver tu resultado y descargar tu estrategia.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-semibold text-[#212121] text-sm">Nombre *</Label>
              <Input
                id="name"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="h-12 md:h-14 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-sm md:text-base px-4"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-semibold text-[#212121] text-sm">Correo electrónico *</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className="h-12 md:h-14 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-sm md:text-base px-4"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] md:text-xs text-[#212121]/40 justify-center">
            <Lock className="h-3 w-3" />
            Tu información está segura y no será compartida.
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="lg"
            className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold rounded-xl text-sm md:text-base py-6"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Ver mi resultado
          </Button>
        </div>
      )}

      {/* Actions — shown after reveal */}
      {revealed && (
        <div className="space-y-4 text-center animate-fade-in">
          {/* PDF Download */}
          <Button
            size="lg"
            className="w-full py-5 md:py-7 text-sm md:text-base gap-2 rounded-2xl font-semibold uppercase tracking-wide bg-[#212121] hover:bg-[#333] text-white"
            onClick={() => {
              const link = document.createElement('a');
              link.href = `/roadmaps/Nivel-${level}.pdf`;
              link.download = `Roadmap-Nivel-${level}.pdf`;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="h-5 w-5" />
            Descargar mi estrategia (PDF)
          </Button>

          {qualifiesForSession && (
            <div className="p-5 md:p-6 rounded-2xl bg-[#FF6B35]/5 border-2 border-[#FF6B35]/20 space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 justify-center">
                <Calendar className="h-5 w-5 text-[#FF6B35]" />
                <h3 className="text-base md:text-lg font-bold text-[#212121]">¡Calificás para una sesión gratuita!</h3>
              </div>
              <p className="text-[#212121]/50 text-xs md:text-sm">
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
                <h3 className="text-base md:text-lg font-bold text-[#212121]">Consultoría Premium</h3>
              </div>
              <p className="text-[#212121]/50 text-xs md:text-sm">
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
            <p className="text-xs md:text-sm text-[#212121]/40">
              Descargá tu estrategia y empezá a implementar. Cuando tu negocio crezca, estaremos acá para ayudarte a escalar. 🚀
            </p>
          )}
        </div>
      )}
    </div>
  );
};
