import { useState, useCallback, useRef } from 'react';
import { WelcomeStep } from '@/components/funnel/WelcomeStep';
import { FunnelQuestion } from '@/components/funnel/FunnelQuestion';
import { EmailCaptureStep } from '@/components/funnel/EmailCaptureStep';
import { ResultsStep } from '@/components/funnel/ResultsStep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import '@fontsource/nunito/700.css';

const CALENDLY_URL = 'https://calendly.com/socialifycr';
const FONT = "'DM Sans', sans-serif";
const AUTO_ADVANCE_DELAY = 450; // ms

const industries = [
  { value: 'ecommerce', label: 'E-commerce / Tienda online' },
  { value: 'servicios', label: 'Servicios profesionales' },
  { value: 'educacion', label: 'Educación / Cursos' },
  { value: 'salud', label: 'Salud / Bienestar' },
  { value: 'gastronomia', label: 'Gastronomía / Restaurantes' },
  { value: 'tecnologia', label: 'Tecnología / Software' },
  { value: 'otro', label: 'Otro' },
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
  { value: 'content', label: 'Marketing de contenido (blog, YouTube, etc.)' },
  { value: 'cold_outreach', label: 'Prospección en frío' },
  { value: 'mixed', label: 'Combinación de varias' },
];

const challenges = [
  { value: 'no_clients', label: 'No consigo suficientes clientes' },
  { value: 'no_systems', label: 'No tengo sistemas ni procesos claros' },
  { value: 'no_team', label: 'No sé cómo delegar o construir equipo' },
  { value: 'no_scale', label: 'Estoy estancado y no puedo escalar' },
  { value: 'no_brand', label: 'Mi marca no se diferencia de la competencia' },
  { value: 'no_time', label: 'No tengo tiempo — hago todo yo' },
  { value: 'no_digital', label: 'No sé cómo usar el marketing digital' },
];

const calculateLevel = (revenueRange: string, teamSize: string, timeInBusiness: string): number => {
  const revenueMap: Record<string, number> = {
    '0': 1, '0_3k': 2, '3k_15k': 3, '15k_50k': 4, '50k_200k': 5, '200k_plus': 6,
  };
  let base = revenueMap[revenueRange] ?? 1;
  if (base === 1 && timeInBusiness !== 'not_started') base = 2;
  if (base === 2 && (teamSize === '6_15' || teamSize === '15_plus')) base = 3;
  return Math.min(6, Math.max(1, base));
};

// Steps: 0=welcome, 1=industry, 2=time, 3=team, 4=revenue, 5=acquisition, 6=challenge, 7=email, 8=results
const TOTAL_QUESTION_STEPS = 7; // steps 1-7

const Funnel = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessLevel, setBusinessLevel] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [answers, setAnswers] = useState({
    industry: '',
    timeInBusiness: '',
    teamSize: '',
    revenueRange: '',
    acquisitionMethod: '',
    challenge: '',
  });
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '' });

  const progressPercent = step === 0 || step >= 8 ? 0 : Math.round((step / TOTAL_QUESTION_STEPS) * 100);

  const goTo = useCallback((target: number) => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setDirection(target > step ? 'forward' : 'back');
    // Small delay for transition
    setTimeout(() => setStep(target), 50);
  }, [step]);

  const handleOptionSelect = useCallback((field: string, value: string, nextStep: number) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => goTo(nextStep), AUTO_ADVANCE_DELAY);
  }, [goTo]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const level = calculateLevel(answers.revenueRange, answers.teamSize, answers.timeInBusiness);
    setBusinessLevel(level);

    try {
      const { data, error } = await supabase.from('funnel_leads').insert({
        name: contactInfo.name.trim().slice(0, 100),
        email: contactInfo.email.trim().toLowerCase().slice(0, 255),
        phone: contactInfo.phone.trim().slice(0, 20) || null,
        business_level: level,
        industry: answers.industry,
        revenue_range: answers.revenueRange,
        team_size: answers.teamSize,
        challenge: answers.challenge,
        answers: {
          timeInBusiness: answers.timeInBusiness,
          acquisitionMethod: answers.acquisitionMethod,
        },
      }).select('id').single();

      if (error) throw error;
      setLeadId(data.id);
      goTo(8);
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

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep onNext={() => goTo(1)} />;
      case 1:
        return (
          <FunnelQuestion
            question="¿EN QUÉ INDUSTRIA ESTÁS?"
            subtitle="Seleccioná la que mejor describa tu negocio"
            options={industries}
            selected={answers.industry}
            onSelect={(v) => handleOptionSelect('industry', v, 2)}
            onBack={() => goTo(0)}
          />
        );
      case 2:
        return (
          <FunnelQuestion
            question="¿CUÁNTO TIEMPO TIENE TU NEGOCIO?"
            options={timeOptions}
            selected={answers.timeInBusiness}
            onSelect={(v) => handleOptionSelect('timeInBusiness', v, 3)}
            onBack={() => goTo(1)}
          />
        );
      case 3:
        return (
          <FunnelQuestion
            question="¿CUÁNTAS PERSONAS HAY EN TU EQUIPO?"
            options={teamOptions}
            selected={answers.teamSize}
            onSelect={(v) => handleOptionSelect('teamSize', v, 4)}
            onBack={() => goTo(2)}
          />
        );
      case 4:
        return (
          <FunnelQuestion
            question="¿CUÁLES SON TUS INGRESOS MENSUALES?"
            subtitle="Aproximados — esto define el nivel de tu negocio"
            options={revenueOptions}
            selected={answers.revenueRange}
            onSelect={(v) => handleOptionSelect('revenueRange', v, 5)}
            onBack={() => goTo(3)}
          />
        );
      case 5:
        return (
          <FunnelQuestion
            question="¿CÓMO CONSEGUÍS CLIENTES?"
            subtitle="Tu principal canal de adquisición"
            options={acquisitionOptions}
            selected={answers.acquisitionMethod}
            onSelect={(v) => handleOptionSelect('acquisitionMethod', v, 6)}
            onBack={() => goTo(4)}
          />
        );
      case 6:
        return (
          <FunnelQuestion
            question="¿CUÁL ES TU MAYOR DESAFÍO?"
            subtitle="¿Qué es lo que más te frena hoy?"
            options={challenges}
            selected={answers.challenge}
            onSelect={(v) => handleOptionSelect('challenge', v, 7)}
            onBack={() => goTo(5)}
          />
        );
      case 7:
        return (
          <EmailCaptureStep
            data={contactInfo}
            onChange={(f, v) => setContactInfo((p) => ({ ...p, [f]: v }))}
            onSubmit={handleSubmit}
            onBack={() => goTo(6)}
            isSubmitting={isSubmitting}
          />
        );
      case 8:
        return (
          <ResultsStep
            level={businessLevel}
            name={contactInfo.name}
            onCalendlyClick={handleCalendlyClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: FONT }}>
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 md:px-6 md:py-4 flex items-center justify-center relative">
          <span className="text-xl md:text-2xl font-bold text-[#212121] tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>socialify</span>
          {step > 0 && step < 8 && (
            <span className="absolute right-4 text-xs md:text-sm text-[#212121]/40 font-medium uppercase tracking-wider">
              {step} / {TOTAL_QUESTION_STEPS}
            </span>
          )}
        </div>
        {step > 0 && step < 8 && (
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-[#FF6B35] transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      {/* Content with transition wrapper */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 md:px-6 md:py-12">
        <div
          key={step}
          className="animate-fade-in"
          style={{ animationDuration: '0.35s' }}
        >
          {renderStep()}
        </div>
      </main>

      <footer className="bg-[#212121] py-4 md:py-6 text-center text-[10px] md:text-xs text-white/40 uppercase tracking-wider">
        © {new Date().getFullYear()} SOCIALIFY · TODOS LOS DERECHOS RESERVADOS
      </footer>
    </div>
  );
};

export default Funnel;
