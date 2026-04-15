import { useState, useCallback, useRef } from 'react';
import { WelcomeStep } from '@/components/funnel/WelcomeStep';
import { FunnelQuestion } from '@/components/funnel/FunnelQuestion';
import { ResultsStep } from '@/components/funnel/ResultsStep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import '@fontsource/nunito/700.css';

const CALENDLY_URL = 'https://calendly.com/socialifycr';
const FONT = "'DM Sans', sans-serif";
const AUTO_ADVANCE_DELAY = 450;

const industries = [
  { value: 'retail', label: 'Retail / Tienda física o en línea' },
  { value: 'restaurante', label: 'Restaurante / Comida' },
  { value: 'salud', label: 'Salud y bienestar' },
  { value: 'servicios', label: 'Servicios profesionales' },
  { value: 'educacion', label: 'Educación / Cursos' },
  { value: 'otro', label: 'Otro' },
];

const revenueOptions = [
  { value: 'menos1k', label: 'Menos de $1,000', puntos: 0 },
  { value: '1k5k', label: '$1,000 – $5,000', puntos: 2 },
  { value: '5k15k', label: '$5,000 – $15,000', puntos: 4 },
  { value: '15k50k', label: '$15,000 – $50,000', puntos: 6 },
  { value: 'mas50k', label: 'Más de $50,000', puntos: 8 },
];

const presenceOptions = [
  { value: 'nada', label: 'No tengo presencia todavía', puntos: 0 },
  { value: 'perfil_inactivo', label: 'Tengo perfil pero no publico', puntos: 1 },
  { value: 'poco', label: 'Publico 1 a 2 veces por semana', puntos: 2 },
  { value: 'consistente', label: 'Publico 3 a 5 veces por semana', puntos: 3 },
  { value: 'diario', label: 'Publico todos los días', puntos: 4 },
];

const adSpendOptions = [
  { value: 'nada', label: 'No invierto nada', puntos: 0 },
  { value: 'intente', label: 'Lo intenté pero lo dejé', puntos: 1 },
  { value: 'menos200', label: 'Menos de $200 al mes', puntos: 2 },
  { value: '200_500', label: '$200 – $500 al mes', puntos: 4 },
  { value: '500_1000', label: '$500 – $1,000 al mes', puntos: 6 },
  { value: '1000_2000', label: '$1,000 – $2,000 al mes', puntos: 7 },
  { value: 'mas2000', label: 'Más de $2,000 al mes', puntos: 8 },
];

const salesChannelOptions = [
  { value: 'local', label: 'En persona / local físico' },
  { value: 'mensajes', label: 'Mensajes de WhatsApp / Instagram / Facebook' },
  { value: 'web', label: 'Página web / tienda en línea' },
  { value: 'outbound', label: 'Contacto frío / outbound' },
  { value: 'marketplace', label: 'Marketplace (Uber Eats, Amazon, MercadoLibre)' },
  { value: 'puntos_venta', label: 'Puntos de venta externos (supermercados, farmacias, tiendas)' },
  { value: 'otro', label: 'Otro' },
];

const goalOptions = [
  { value: 'awareness', label: 'Que más gente conozca mi producto y sepa dónde comprarlo' },
  { value: 'nuevos_clientes', label: 'Conseguir más clientes nuevos' },
  { value: 'retencion', label: 'Venderle más a quienes ya me compraron' },
  { value: 'lanzamiento', label: 'Lanzar un nuevo producto al mercado' },
  { value: 'marca', label: 'Construir una marca reconocida a largo plazo' },
];

const revenuePoints: Record<string, number> = Object.fromEntries(revenueOptions.map(o => [o.value, o.puntos]));
const presencePoints: Record<string, number> = Object.fromEntries(presenceOptions.map(o => [o.value, o.puntos]));
const adSpendPoints: Record<string, number> = Object.fromEntries(adSpendOptions.map(o => [o.value, o.puntos]));

const calculateLevel = (ingresos: string, presencia: string, pauta: string): number => {
  const total = (revenuePoints[ingresos] ?? 0) + (presencePoints[presencia] ?? 0) + (adSpendPoints[pauta] ?? 0);
  if (total <= 3) return 1;
  if (total <= 6) return 2;
  if (total <= 10) return 3;
  if (total <= 14) return 4;
  if (total <= 17) return 5;
  return 6;
};

// Steps: 0=welcome, 1-6=questions, 7=results (blurred → revealed)
const TOTAL_QUESTION_STEPS = 6;

const Funnel = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [businessLevel, setBusinessLevel] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [answers, setAnswers] = useState({
    industry: '',
    ingresos: '',
    presencia: '',
    pauta: '',
    canalVentas: '',
    objetivo: '',
  });

  const progressPercent = step === 0 || step >= 7 ? 0 : Math.round((step / TOTAL_QUESTION_STEPS) * 100);

  const goTo = useCallback((target: number) => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setDirection(target > step ? 'forward' : 'back');
    setTimeout(() => setStep(target), 50);
  }, [step]);

  const handleOptionSelect = useCallback((field: string, value: string, nextStep: number) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => goTo(nextStep), AUTO_ADVANCE_DELAY);
  }, [goTo]);

  // Called when the last question is answered — go straight to results
  const handleLastQuestion = useCallback((value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, objetivo: value };
      const level = calculateLevel(updated.ingresos, updated.presencia, updated.pauta);
      setBusinessLevel(level);
      return updated;
    });
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => goTo(7), AUTO_ADVANCE_DELAY);
  }, [goTo]);

  const handleSubmitContact = async (name: string, email: string) => {
    const id = crypto.randomUUID();
    try {
      const { error } = await supabase.from('funnel_leads').insert({
        id,
        name: name.trim().slice(0, 100),
        email: email.trim().toLowerCase().slice(0, 255),
        business_level: businessLevel,
        industry: answers.industry,
        revenue_range: answers.ingresos,
        answers: {
          presencia: answers.presencia,
          pauta: answers.pauta,
          canalVentas: answers.canalVentas,
          objetivo: answers.objetivo,
        },
      });
      if (error) throw error;
      setLeadId(id);
      return true;
    } catch {
      toast({ title: 'Error', description: 'No pudimos guardar tus datos. Intentá de nuevo.', variant: 'destructive' });
      return false;
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
            question="¿A QUÉ SE DEDICA TU NEGOCIO?"
            options={industries}
            selected={answers.industry}
            onSelect={(v) => handleOptionSelect('industry', v, 2)}
            onBack={() => goTo(0)}
          />
        );
      case 2:
        return (
          <FunnelQuestion
            question="¿CUÁNTO FACTURA TU NEGOCIO AL MES APROXIMADAMENTE?"
            options={revenueOptions}
            selected={answers.ingresos}
            onSelect={(v) => handleOptionSelect('ingresos', v, 3)}
            onBack={() => goTo(1)}
          />
        );
      case 3:
        return (
          <FunnelQuestion
            question="¿QUÉ TAN ACTIVO ESTÁS EN REDES SOCIALES?"
            options={presenceOptions}
            selected={answers.presencia}
            onSelect={(v) => handleOptionSelect('presencia', v, 4)}
            onBack={() => goTo(2)}
          />
        );
      case 4:
        return (
          <FunnelQuestion
            question="¿CUÁNTO INVERTÍS MENSUALMENTE EN PUBLICIDAD PAGADA?"
            options={adSpendOptions}
            selected={answers.pauta}
            onSelect={(v) => handleOptionSelect('pauta', v, 5)}
            onBack={() => goTo(3)}
          />
        );
      case 5:
        return (
          <FunnelQuestion
            question="¿CÓMO CERRÁS LA MAYORÍA DE TUS VENTAS?"
            options={salesChannelOptions}
            selected={answers.canalVentas}
            onSelect={(v) => handleOptionSelect('canalVentas', v, 6)}
            onBack={() => goTo(4)}
          />
        );
      case 6:
        return (
          <FunnelQuestion
            question="¿QUÉ QUERÉS LOGRAR CON MARKETING DIGITAL?"
            options={goalOptions}
            selected={answers.objetivo}
            onSelect={(v) => handleLastQuestion(v)}
            onBack={() => goTo(5)}
          />
        );
      case 7:
        return (
          <ResultsStep
            level={businessLevel}
            onSubmitContact={handleSubmitContact}
            onCalendlyClick={handleCalendlyClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: FONT }}>
      <header className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 md:px-6 md:py-4 flex items-center justify-center relative">
          <span className="text-xl md:text-2xl font-bold text-[#212121] tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>SOCIALIFY</span>
          {step > 0 && step < 7 && (
            <span className="absolute right-4 text-xs md:text-sm text-[#212121]/40 font-medium uppercase tracking-wider">
              {step} / {TOTAL_QUESTION_STEPS}
            </span>
          )}
        </div>
        {step > 0 && step < 7 && (
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-[#FF6B35] transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

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
