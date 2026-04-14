import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Check, Download, Calendar, Crown, Lock, Loader2 } from 'lucide-react';

const CALENDLY_URL = 'https://calendly.com/socialifycr';

// ─── Data ────────────────────────────────────────────────────────
const industries = [
  'E-commerce / Tienda online', 'Servicios profesionales', 'Educación / Cursos',
  'Salud / Bienestar', 'Gastronomía / Restaurantes', 'Tecnología / Software', 'Otro',
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
  { value: 'content', label: 'Marketing de contenido (blog, YouTube)' },
  { value: 'cold_outreach', label: 'Prospección en frío' },
  { value: 'mixed', label: 'Combinación de varias' },
];

const challenges = [
  { value: 'no_clients', label: 'No consigo suficientes clientes' },
  { value: 'no_systems', label: 'No tengo sistemas ni procesos claros' },
  { value: 'no_team', label: 'No sé cómo delegar o construir equipo' },
  { value: 'no_scale', label: 'Estoy estancado y no puedo escalar' },
  { value: 'no_brand', label: 'Mi marca no se diferencia' },
  { value: 'no_time', label: 'No tengo tiempo — hago todo yo' },
  { value: 'no_digital', label: 'No sé cómo usar el marketing digital' },
];

const levelData = [
  { name: 'Idea Stage', revenue: '$0', desc: 'Tenés una idea pero aún no la has lanzado. Tu plan te guiará con los primeros pasos para validar y monetizar.', color: '#94a3b8' },
  { name: 'Startup', revenue: '$0 – $3K/mes', desc: 'Ya lanzaste y estás consiguiendo tus primeros clientes. Tu estrategia se enfoca en tracción y consistencia.', color: '#3b82f6' },
  { name: 'Growing', revenue: '$3K – $15K/mes', desc: 'Tenés ingresos consistentes. Es hora de construir sistemas y escalar tu adquisición.', color: '#22c55e' },
  { name: 'Scaling', revenue: '$15K – $50K/mes', desc: 'Tu equipo está en su lugar. Necesitás optimizar operaciones y multiplicar canales.', color: '#FF6B35' },
  { name: 'Established', revenue: '$50K – $200K/mes', desc: 'Sistemas sólidos. Estás listo para multiplicar y expandir a nuevos mercados.', color: '#8b5cf6' },
  { name: 'Empire', revenue: '$200K+/mes', desc: 'Operación multi-canal. Tu enfoque es liderazgo, legado y crecimiento exponencial.', color: '#ef4444' },
];

// ─── Helpers ─────────────────────────────────────────────────────
const calculateLevel = (revenueRange: string, teamSize: string, timeInBusiness: string): number => {
  const revenueMap: Record<string, number> = { '0': 1, '0_3k': 2, '3k_15k': 3, '15k_50k': 4, '50k_200k': 5, '200k_plus': 6 };
  let base = revenueMap[revenueRange] ?? 1;
  if (base === 1 && timeInBusiness !== 'not_started') base = 2;
  if (base === 2 && (teamSize === '6_15' || teamSize === '15_plus')) base = 3;
  return Math.min(6, Math.max(1, base));
};

// ─── Reusable option card ────────────────────────────────────────
const OptionCard = ({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
      selected
        ? 'border-[#FF6B35] bg-[#FF6B35]/5 shadow-md scale-[1.02]'
        : 'border-gray-200 hover:border-[#FF6B35]/40 hover:bg-gray-50'
    }`}
  >
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
      selected ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-gray-300'
    }`}>
      {selected && <Check className="h-3.5 w-3.5 text-white" />}
    </div>
    <span className={`text-base md:text-lg ${selected ? 'text-[#1a1a2e] font-semibold' : 'text-[#1a1a2e]/70'}`}>{label}</span>
  </button>
);

// ─── Step indicator ──────────────────────────────────────────────
const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-3">
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i < current ? 'w-8 bg-[#FF6B35]' : i === current ? 'w-8 bg-[#FF6B35]/40' : 'w-4 bg-gray-200'
          }`}
        />
      ))}
    </div>
    <span className="text-sm font-medium text-[#1a1a2e]/40 tabular-nums">{current + 1}/{total}</span>
  </div>
);

// ─── Main component ──────────────────────────────────────────────
const QUESTION_STEPS = 7; // industry, time, team, revenue, acquisition, challenge, contact

const Funnel = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(-1); // -1 = welcome, 0-6 = questions, 7 = results
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessLevel, setBusinessLevel] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);

  const [answers, setAnswers] = useState({
    industry: '', timeInBusiness: '', teamSize: '',
    revenueRange: '', acquisitionMethod: '', challenge: '',
    name: '', email: '', phone: '',
  });

  const set = useCallback((field: string, value: string) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  }, []);

  const goNext = useCallback(() => {
    setDirection('forward');
    setStep(s => s + 1);
  }, []);

  const goBack = useCallback(() => {
    setDirection('back');
    setStep(s => s - 1);
  }, []);

  // Auto-advance on single-select questions
  const selectAndAdvance = useCallback((field: string, value: string) => {
    set(field, value);
    setTimeout(() => {
      setDirection('forward');
      setStep(s => s + 1);
    }, 300);
  }, [set]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const level = calculateLevel(answers.revenueRange, answers.teamSize, answers.timeInBusiness);
    setBusinessLevel(level);

    try {
      const { data, error } = await supabase.from('funnel_leads').insert({
        name: answers.name.trim().slice(0, 100),
        email: answers.email.trim().toLowerCase().slice(0, 255),
        phone: answers.phone.trim().slice(0, 20) || null,
        business_level: level,
        industry: answers.industry,
        revenue_range: answers.revenueRange,
        team_size: answers.teamSize,
        challenge: answers.challenge,
        answers: { timeInBusiness: answers.timeInBusiness, acquisitionMethod: answers.acquisitionMethod },
      }).select('id').single();

      if (error) throw error;
      setLeadId(data.id);
      setDirection('forward');
      setStep(QUESTION_STEPS);
    } catch {
      toast({ title: 'Error', description: 'No pudimos guardar tus datos. Intentá de nuevo.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalendlyClick = async () => {
    if (leadId) {
      await supabase.from('funnel_leads').update({ calendly_clicked: true }).eq('id', leadId);
    }
    window.open(CALENDLY_URL, '_blank');
  };

  const canSubmitContact = answers.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email);

  // Animation class based on direction
  const animClass = direction === 'forward'
    ? 'animate-[slideInRight_0.35s_ease-out]'
    : 'animate-[slideInLeft_0.35s_ease-out]';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Custom animations */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <header className="bg-[#1a1a2e] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-black text-xl tracking-wider text-white uppercase" style={{ fontFamily: "'Poppins', sans-serif" }}>
            SOCIALIFY
          </span>
          {step >= 0 && step < QUESTION_STEPS && (
            <StepIndicator current={step} total={QUESTION_STEPS} />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-10 md:py-16">
        <div className="w-full max-w-lg">

          {/* ── Welcome ── */}
          {step === -1 && (
            <div className="flex flex-col items-center text-center space-y-10 animate-fade-in">
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[#1a1a2e] leading-[1.1]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Obtené tu{' '}
                <span className="text-[#FF6B35]">Roadmap de Crecimiento</span>{' '}
                personalizado
              </h1>
              <p className="text-lg md:text-xl text-[#1a1a2e]/50 max-w-md">
                Respondé unas preguntas rápidas y recibí una estrategia diseñada para tu nivel.
              </p>
              <Button
                size="lg"
                onClick={goNext}
                className="text-lg px-12 py-7 rounded-2xl gap-3 shadow-xl hover:shadow-2xl transition-all font-bold uppercase tracking-wide bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
              >
                Empezar ahora
                <ArrowRight className="h-5 w-5" />
              </Button>
              <p className="text-sm text-[#1a1a2e]/30 font-medium">Sin costo · Sin compromisos · Resultados inmediatos</p>
            </div>
          )}

          {/* ── Q1: Industry ── */}
          {step === 0 && (
            <div key="q0" className={animClass}>
              <QuestionScreen
                question="¿En qué industria está tu negocio?"
                subtitle="Seleccioná la que mejor describa tu actividad."
                onBack={() => setStep(-1)}
                showBack
              >
                <div className="space-y-2">
                  {industries.map(ind => (
                    <OptionCard key={ind} selected={answers.industry === ind} label={ind} onClick={() => selectAndAdvance('industry', ind)} />
                  ))}
                </div>
              </QuestionScreen>
            </div>
          )}

          {/* ── Q2: Time in business ── */}
          {step === 1 && (
            <div key="q1" className={animClass}>
              <QuestionScreen question="¿Cuánto tiempo tiene tu negocio?" onBack={goBack} showBack>
                <div className="space-y-2">
                  {timeOptions.map(opt => (
                    <OptionCard key={opt.value} selected={answers.timeInBusiness === opt.value} label={opt.label} onClick={() => selectAndAdvance('timeInBusiness', opt.value)} />
                  ))}
                </div>
              </QuestionScreen>
            </div>
          )}

          {/* ── Q3: Team size ── */}
          {step === 2 && (
            <div key="q2" className={animClass}>
              <QuestionScreen question="¿Cuántas personas hay en tu equipo?" onBack={goBack} showBack>
                <div className="space-y-2">
                  {teamOptions.map(opt => (
                    <OptionCard key={opt.value} selected={answers.teamSize === opt.value} label={opt.label} onClick={() => selectAndAdvance('teamSize', opt.value)} />
                  ))}
                </div>
              </QuestionScreen>
            </div>
          )}

          {/* ── Q4: Revenue ── */}
          {step === 3 && (
            <div key="q3" className={animClass}>
              <QuestionScreen question="¿Cuáles son tus ingresos mensuales?" subtitle="Aproximado está bien." onBack={goBack} showBack>
                <div className="space-y-2">
                  {revenueOptions.map(opt => (
                    <OptionCard key={opt.value} selected={answers.revenueRange === opt.value} label={opt.label} onClick={() => selectAndAdvance('revenueRange', opt.value)} />
                  ))}
                </div>
              </QuestionScreen>
            </div>
          )}

          {/* ── Q5: Acquisition ── */}
          {step === 4 && (
            <div key="q4" className={animClass}>
              <QuestionScreen question="¿Cómo conseguís clientes?" onBack={goBack} showBack>
                <div className="space-y-2">
                  {acquisitionOptions.map(opt => (
                    <OptionCard key={opt.value} selected={answers.acquisitionMethod === opt.value} label={opt.label} onClick={() => selectAndAdvance('acquisitionMethod', opt.value)} />
                  ))}
                </div>
              </QuestionScreen>
            </div>
          )}

          {/* ── Q6: Challenge ── */}
          {step === 5 && (
            <div key="q5" className={animClass}>
              <QuestionScreen question="¿Cuál es tu mayor desafío hoy?" subtitle="Seleccioná el que más te frena." onBack={goBack} showBack>
                <div className="space-y-2">
                  {challenges.map(ch => (
                    <OptionCard key={ch.value} selected={answers.challenge === ch.value} label={ch.label} onClick={() => selectAndAdvance('challenge', ch.value)} />
                  ))}
                </div>
              </QuestionScreen>
            </div>
          )}

          {/* ── Q7: Contact info ── */}
          {step === 6 && (
            <div key="q6" className={animClass}>
              <QuestionScreen question="¡Último paso!" subtitle="Ingresá tus datos para ver tu resultado." onBack={goBack} showBack>
                <div className="space-y-4">
                  <Input
                    placeholder="Tu nombre *"
                    value={answers.name}
                    onChange={e => set('name', e.target.value)}
                    maxLength={100}
                    className="h-14 rounded-2xl border-2 border-gray-200 focus:border-[#FF6B35] text-base px-5 bg-white"
                  />
                  <Input
                    type="email"
                    placeholder="tu@email.com *"
                    value={answers.email}
                    onChange={e => set('email', e.target.value)}
                    maxLength={255}
                    className="h-14 rounded-2xl border-2 border-gray-200 focus:border-[#FF6B35] text-base px-5 bg-white"
                  />
                  <Input
                    type="tel"
                    placeholder="+506 8888-8888 (opcional)"
                    value={answers.phone}
                    onChange={e => set('phone', e.target.value)}
                    maxLength={20}
                    className="h-14 rounded-2xl border-2 border-gray-200 focus:border-[#FF6B35] text-base px-5 bg-white"
                  />
                  <div className="flex items-center gap-2 text-xs text-[#1a1a2e]/30 justify-center pt-1">
                    <Lock className="h-3 w-3" /> Tu información está segura.
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmitContact || isSubmitting}
                    className="w-full h-14 rounded-2xl text-lg font-bold uppercase tracking-wide bg-[#FF6B35] hover:bg-[#e55a2b] text-white mt-2"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Ver mi resultado
                  </Button>
                </div>
              </QuestionScreen>
            </div>
          )}

          {/* ── Results ── */}
          {step === QUESTION_STEPS && (
            <div key="results" className="animate-fade-in">
              <ResultsView level={businessLevel} name={answers.name} onCalendlyClick={handleCalendlyClick} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Socialify · Todos los derechos reservados
      </footer>
    </div>
  );
};

// ─── Question screen wrapper ─────────────────────────────────────
const QuestionScreen = ({
  question, subtitle, children, onBack, showBack,
}: {
  question: string; subtitle?: string; children: React.ReactNode; onBack?: () => void; showBack?: boolean;
}) => (
  <div className="space-y-8">
    <div>
      <h2 className="text-2xl md:text-3xl font-black text-[#1a1a2e] leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {question}
      </h2>
      {subtitle && <p className="text-[#1a1a2e]/40 mt-2 text-base">{subtitle}</p>}
    </div>
    {children}
    {showBack && (
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-[#1a1a2e]/40 hover:text-[#1a1a2e]/70 transition-colors pt-2">
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>
    )}
  </div>
);

// ─── Results view ────────────────────────────────────────────────
const ResultsView = ({ level, name, onCalendlyClick }: { level: number; name: string; onCalendlyClick: () => void }) => {
  const current = levelData[level - 1];
  const qualifiesForSession = level >= 3 && level <= 5;
  const isPremium = level === 6;

  return (
    <div className="space-y-8 text-center max-w-2xl mx-auto">
      <div>
        <p className="text-[#1a1a2e]/40 mb-1 text-sm uppercase tracking-widest font-medium">Resultado para</p>
        <h2 className="text-3xl md:text-4xl font-black text-[#1a1a2e]" style={{ fontFamily: "'Poppins', sans-serif" }}>{name}</h2>
      </div>

      {/* Level meter */}
      <div className="flex items-center justify-center gap-1 md:gap-2 py-4">
        {levelData.map((l, i) => {
          const isActive = i + 1 === level;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-sm md:text-lg transition-all ${
                  isActive ? 'scale-110 text-white' : i + 1 < level ? 'opacity-60 text-white' : 'opacity-30 bg-gray-200 text-gray-400'
                }`}
                style={{
                  backgroundColor: i + 1 <= level ? levelData[i].color : undefined,
                  boxShadow: isActive ? `0 0 0 4px ${levelData[i].color}30, 0 4px 20px ${levelData[i].color}40` : undefined,
                }}
              >
                {i + 1}
              </div>
              <span className={`text-[10px] md:text-xs max-w-[60px] leading-tight ${isActive ? 'font-bold text-[#1a1a2e]' : 'text-[#1a1a2e]/30'}`}>
                {l.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current level card */}
      <div className="p-6 md:p-8 text-left space-y-4 rounded-2xl border-2 bg-white" style={{ borderColor: current.color }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: current.color }}>
            {level}
          </div>
          <div>
            <h3 className="text-xl font-black text-[#1a1a2e]">Nivel {level}: {current.name}</h3>
            <p className="text-sm text-[#1a1a2e]/40">{current.revenue}</p>
          </div>
        </div>
        <p className="text-[#1a1a2e]/60 leading-relaxed">{current.desc}</p>
      </div>

      <Button
        size="lg"
        className="w-full py-7 text-base gap-2 rounded-2xl font-bold uppercase tracking-wide bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white"
        onClick={() => alert('Los PDFs serán subidos próximamente.')}
      >
        <Download className="h-5 w-5" /> Descargar mi estrategia (PDF)
      </Button>

      {qualifiesForSession && (
        <div className="p-6 rounded-2xl bg-[#FF6B35]/5 border-2 border-[#FF6B35]/20 space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Calendar className="h-5 w-5 text-[#FF6B35]" />
            <h3 className="text-lg font-black text-[#1a1a2e]">¡Calificás para una sesión gratuita!</h3>
          </div>
          <p className="text-[#1a1a2e]/50 text-sm">Basado en tu nivel, te ofrecemos una sesión de planificación estratégica sin costo.</p>
          <Button size="lg" className="gap-2 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold px-8 rounded-xl" onClick={onCalendlyClick}>
            Agendar sesión gratuita <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isPremium && (
        <div className="p-6 rounded-2xl bg-[#FF6B35]/5 border-2 border-[#FF6B35]/20 space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Crown className="h-5 w-5 text-[#FF6B35]" />
            <h3 className="text-lg font-black text-[#1a1a2e]">Consultoría Premium</h3>
          </div>
          <p className="text-[#1a1a2e]/50 text-sm">Tu negocio está en un nivel avanzado. Te ofrecemos una consultoría premium personalizada.</p>
          <Button size="lg" className="gap-2 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold px-8 rounded-xl" onClick={onCalendlyClick}>
            Solicitar consultoría <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {level <= 2 && (
        <p className="text-sm text-[#1a1a2e]/40">
          Descargá tu estrategia y empezá a implementar. Cuando crezcas, estaremos acá para ayudarte a escalar. 🚀
        </p>
      )}
    </div>
  );
};

export default Funnel;
