import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Lock, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ResultsStepProps {
  level: number;
  onSubmitContact: (name: string, email: string) => Promise<boolean>;
  onCalendlyClick: () => void;
}

const levelData = [
  { name: 'Idea', revenue: '$0', desc: 'Tu estrategia de marketing digital debería enfocarse en validar tu idea con contenido orgánico y construir una audiencia inicial antes de invertir en pauta.', color: '#94a3b8' },
  { name: 'Startup', revenue: '$0 – $3K/mes', desc: 'Tu estrategia de marketing digital debería enfocarse en generar tracción con contenido consistente y campañas de bajo presupuesto para atraer tus primeros clientes.', color: '#3b82f6' },
  { name: 'Growing', revenue: '$3K – $15K/mes', desc: 'Tu estrategia de marketing digital debería enfocarse en sistematizar tu contenido, escalar pauta pagada y construir embudos de conversión automatizados.', color: '#22c55e' },
  { name: 'Scaling', revenue: '$15K – $50K/mes', desc: 'Tu estrategia de marketing digital debería enfocarse en diversificar canales, optimizar el costo por adquisición y delegar la operación creativa.', color: '#FF6B35' },
  { name: 'Established', revenue: '$50K – $200K/mes', desc: 'Tu estrategia de marketing digital debería enfocarse en expandir a nuevos mercados, fortalecer tu marca personal y maximizar el retorno de cada canal.', color: '#8b5cf6' },
  { name: 'Empire', revenue: '$200K+/mes', desc: 'Tu estrategia de marketing digital debería enfocarse en liderazgo de marca, alianzas estratégicas y crecimiento exponencial a través de múltiples plataformas.', color: '#ef4444' },
];

export const ResultsStep = ({ level, onSubmitContact, onCalendlyClick }: ResultsStepProps) => {
  const [revealed, setRevealed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const current = levelData[level - 1];
  const qualifiesForSession = level >= 4;
  const isExploratory = level === 6;
  const canSubmit = name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const ok = await onSubmitContact(name, email);
    setIsSubmitting(false);
    if (ok) {
      setRevealed(true);
      // Meta Pixel: Lead event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', { content_name: 'Roadmap Funnel', business_level: level });
      }
      // Fire-and-forget: send the funnel result email
      supabase.functions.invoke('send-funnel-result', {
        body: { name, email, business_level: level },
      }).catch((err) => console.error('Email send error:', err));
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Results section — blurred until revealed */}
      <div className={`text-center transition-all duration-700 ${!revealed ? 'blur-md select-none pointer-events-none' : ''}`}>
        <div>
          <p className="text-[#212121]/50 mb-0.5 text-xs md:text-sm">Tu resultado</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#212121]">
            {revealed ? name : 'Tu Negocio'}
          </h2>
        </div>

        {/* Level meter */}
        <div className="flex items-center justify-center gap-1 py-3 md:py-4 overflow-x-auto scrollbar-hide">
          {levelData.map((l, i) => {
            const isActive = i + 1 === level;
            return (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[44px] md:min-w-[60px]">
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all ${
                    isActive
                      ? 'ring-3 scale-110 shadow-lg text-white'
                      : i + 1 < level
                      ? 'opacity-60 text-white'
                      : 'opacity-30 bg-gray-200 text-gray-400'
                  }`}
                  style={{
                    backgroundColor: i + 1 <= level ? levelData[i].color : undefined,
                    boxShadow: isActive ? `0 0 0 3px ${levelData[i].color}40` : undefined,
                  }}
                >
                  {i + 1}
                </div>
                <span className={`text-[8px] md:text-[10px] max-w-[48px] leading-tight ${isActive ? 'font-bold text-[#212121]' : 'text-[#212121]/40'}`}>
                  {l.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current level card */}
        <div className="p-4 md:p-6 text-left space-y-2 md:space-y-3 rounded-2xl border-2 bg-white" style={{ borderColor: current.color }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white font-bold text-base md:text-lg"
              style={{ backgroundColor: current.color }}
            >
              {level}
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-[#212121]">Nivel {level}: {current.name}</h3>
              <p className="text-xs text-[#212121]/50">{current.revenue}</p>
            </div>
          </div>
          <p className="text-xs md:text-sm text-[#212121]/70 leading-relaxed">{current.desc}</p>
        </div>
      </div>

      {/* Contact form — shown when not yet revealed */}
      {!revealed && (
        <div className="space-y-4 max-w-md mx-auto animate-fade-in">
          <div className="text-center">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#212121]">
              Desbloqueá tu Roadmap de Crecimiento Digital
            </h2>
            <p className="text-[#212121]/50 mt-0.5 text-xs md:text-sm">
              Ingresá tus datos para ver tu resultado y descargar tu estrategia.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="name" className="font-semibold text-[#212121] text-xs md:text-sm">Nombre *</Label>
              <Input
                id="name"
                autoComplete="given-name"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="h-10 md:h-12 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-sm px-4 bg-white text-black placeholder:text-gray-400 funnel-autofill"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="font-semibold text-[#212121] text-xs md:text-sm">Correo electrónico *</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className="h-10 md:h-12 rounded-xl border-2 border-gray-200 focus:border-[#FF6B35] text-sm px-4 bg-white text-black placeholder:text-gray-400 funnel-autofill"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[#212121]/40 justify-center">
            <Lock className="h-3 w-3" />
            Tu información está segura y no será compartida.
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="lg"
            className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold rounded-xl text-sm py-5"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Ver mi resultado
          </Button>
        </div>
      )}

      {/* Actions — shown after reveal */}
      {revealed && (
        <div className="space-y-4 text-center animate-fade-in">
          {/* Email confirmation */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-xs md:text-sm text-left text-green-800">
              Te enviamos tu estrategia personalizada a <span className="font-semibold">{email}</span>
            </p>
          </div>

          {/* Session CTA — only for levels 4+ */}
          {qualifiesForSession && (
            <div className="p-4 md:p-5 rounded-xl border border-gray-200 bg-white text-left space-y-2">
              <h3 className="text-sm md:text-base font-bold text-[#212121]">
                {isExploratory ? '¿Querés llevar tu marca al siguiente nivel?' : '¿Querés ayuda para implementarlo?'}
              </h3>
              <p className="text-xs md:text-sm text-[#212121]/60 leading-relaxed">
                {isExploratory
                  ? <>Agendá una sesión exploratoria donde analizamos tu contexto y definimos un plan preliminar de trabajo. <strong>Lo ejecutés con nosotros o no, el plan es tuyo.</strong></>
                  : <>Agendá una sesión gratuita de 1 hora donde definimos un plan concreto para tu negocio. <strong>Lo ejecutés con nosotros o no, el plan es tuyo.</strong></>
                }
              </p>
              <Button
                size="lg"
                className="w-full gap-2 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold rounded-xl text-sm py-4"
                onClick={() => {
                  // Meta Pixel: Schedule event
                  if (typeof window !== 'undefined' && (window as any).fbq) {
                    (window as any).fbq('track', 'Schedule', { content_name: 'Roadmap Funnel', business_level: level });
                  }
                  onCalendlyClick();
                }}
              >
                {isExploratory ? 'Agendar sesión exploratoria' : 'Agendar sesión gratuita'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
