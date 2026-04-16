import { useState, useCallback, useRef, useEffect } from 'react';
import { WelcomeStep } from '@/components/funnel/WelcomeStep';
import { FunnelQuestion } from '@/components/funnel/FunnelQuestion';
import { ResultsStep } from '@/components/funnel/ResultsStep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import '@fontsource/nunito/700.css';

const CALENDLY_URL = 'https://calendly.com/raul-socialifycr/sesion-gratuita-de-planificacion';
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
  { value: '1k5k', label: '$1,000 – $5,000', puntos: 3 },
  { value: '5k15k', label: '$5,000 – $15,000', puntos: 5 },
  { value: '15k50k', label: '$15,000 – $50,000', puntos: 8 },
  { value: 'mas50k', label: 'Más de $50,000', puntos: 10 },
];

const presenceOptions = [
  { value: 'nada', label: 'No tengo presencia todavía', puntos: 0 },
  { value: 'perfil_inactivo', label: 'Tengo perfil pero no publico', puntos: 1 },
  { value: 'poco', label: 'Publico 1 a 2 veces por semana', puntos: 2 },
  { value: 'consistente', label: 'Publico 3 a 5 veces por semana', puntos: 3 },
  { value: 'diario', label: 'Publico todos los días', puntos: 4 },
];

const adSpendOptions = [
  { value: 'nada', label: 'No invierto nada', puntos: 1 },
  { value: 'intente', label: 'Lo intenté pero lo dejé', puntos: 2 },
  { value: 'menos200', label: 'Menos de $200 al mes', puntos: 3 },
  { value: '200_500', label: '$200 – $500 al mes', puntos: 4 },
  { value: '500_1000', label: '$500 – $1,000 al mes', puntos: 4 },
  { value: '1000_2000', label: '$1,000 – $2,000 al mes', puntos: 5 },
  { value: 'mas2000', label: 'Más de $2,000 al mes', puntos: 5 },
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

const ROADMAP_FUNNEL_SLUG = 'roadmap-personalizado';

const Funnel = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [businessLevel, setBusinessLevel] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [funnelId, setFunnelId] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [answers, setAnswers] = useState({
    industry: '',
    ingresos: '',
    presencia: '',
    pauta: '',
    canalVentas: '',
    objetivo: '',
  });

  const resolveFunnelId = useCallback(async () => {
    if (funnelId) return funnelId;

    const { data, error } = await supabase
      .from('funnels')
      .select('id')
      .eq('slug', ROADMAP_FUNNEL_SLUG)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    if (data?.id) {
      setFunnelId(data.id);
      return data.id;
    }

    return null;
  }, [funnelId]);

  useEffect(() => {
    resolveFunnelId().catch(() => null);
  }, [resolveFunnelId]);

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
      const resolvedFunnelId = await resolveFunnelId();

      if (!resolvedFunnelId) {
        toast({ title: 'Error', description: 'No pudimos identificar este roadmap. Intentá de nuevo en unos segundos.', variant: 'destructive' });
        return false;
      }

      const { error } = await supabase.from('funnel_leads').insert({
        id,
        name: name.trim().slice(0, 100),
        email: email.trim().toLowerCase().slice(0, 255),
        business_level: businessLevel,
        industry: answers.industry,
        revenue_range: answers.ingresos,
        funnel_id: resolvedFunnelId,
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
            subtitle="💰 Este dato define el nivel de tu negocio"
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
            revenueRange={answers.ingresos}
            onSubmitContact={handleSubmitContact}
            onCalendlyClick={handleCalendlyClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden" style={{ fontFamily: FONT }}>
      {/* Background marketing icons — pure inline SVG, zero extra requests */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Megaphone — sharp foreground */}
        <svg className="absolute w-28 h-28 md:w-40 md:h-40 -top-4 -left-8 rotate-12" style={{ color: '#FF6B35', opacity: 0.08, filter: 'blur(1px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
        {/* Target — medium blur */}
        <svg className="absolute w-24 h-24 md:w-36 md:h-36 top-[18%] -right-6 -rotate-12" style={{ color: '#FF6B35', opacity: 0.06, filter: 'blur(2.5px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        {/* Bar chart — heavy blur */}
        <svg className="absolute w-20 h-20 md:w-32 md:h-32 top-[38%] -left-4 rotate-6" style={{ color: '#FF6B35', opacity: 0.04, filter: 'blur(3.5px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
        {/* Heart — subtle mid */}
        <svg className="absolute w-16 h-16 md:w-24 md:h-24 top-[55%] right-4 rotate-12" style={{ color: '#FF6B35', opacity: 0.05, filter: 'blur(2px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        {/* Globe — deep background */}
        <svg className="absolute w-24 h-24 md:w-36 md:h-36 top-[72%] -left-8 -rotate-12" style={{ color: '#FF6B35', opacity: 0.03, filter: 'blur(4px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        {/* Trend up — sharp foreground */}
        <svg className="absolute w-20 h-20 md:w-28 md:h-28 top-[85%] right-2 rotate-6" style={{ color: '#FF6B35', opacity: 0.07, filter: 'blur(1.5px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        {/* Share network — medium blur */}
        <svg className="absolute w-16 h-16 md:w-24 md:h-24 top-[30%] right-[15%] rotate-45" style={{ color: '#FF6B35', opacity: 0.05, filter: 'blur(3px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        {/* Lightning — deep */}
        <svg className="absolute w-14 h-14 md:w-20 md:h-20 top-[48%] left-[12%] -rotate-12" style={{ color: '#FF6B35', opacity: 0.04, filter: 'blur(3.5px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        {/* --- NEW ICONS --- */}
        {/* Rocket — sharp foreground top-right */}
        <svg className="absolute w-20 h-20 md:w-28 md:h-28 top-[5%] right-[25%] rotate-[20deg]" style={{ color: '#FF6B35', opacity: 0.07, filter: 'blur(1px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
        {/* Users — medium blur left */}
        <svg className="absolute w-18 h-18 md:w-28 md:h-28 top-[12%] left-[18%] -rotate-6" style={{ color: '#FF6B35', opacity: 0.05, filter: 'blur(2.5px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        {/* Mail — deep blur center-right */}
        <svg className="absolute w-16 h-16 md:w-24 md:h-24 top-[62%] right-[20%] rotate-[15deg]" style={{ color: '#FF6B35', opacity: 0.04, filter: 'blur(3px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        {/* Star — sharp mid-left */}
        <svg className="absolute w-14 h-14 md:w-22 md:h-22 top-[42%] left-[25%] rotate-[30deg]" style={{ color: '#FF6B35', opacity: 0.06, filter: 'blur(1.5px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        {/* Smartphone — deep blur bottom-left */}
        <svg className="absolute w-12 h-12 md:w-20 md:h-20 top-[78%] left-[15%] rotate-[8deg]" style={{ color: '#FF6B35', opacity: 0.03, filter: 'blur(4px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
        {/* Camera — medium blur top-center */}
        <svg className="absolute w-16 h-16 md:w-24 md:h-24 top-[8%] left-[45%] -rotate-[10deg]" style={{ color: '#FF6B35', opacity: 0.05, filter: 'blur(2px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        {/* Gift — sharp bottom-center */}
        <svg className="absolute w-14 h-14 md:w-22 md:h-22 top-[90%] left-[40%] rotate-[12deg]" style={{ color: '#FF6B35', opacity: 0.07, filter: 'blur(1px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>
        {/* Search/magnifier — deep blur right */}
        <svg className="absolute w-18 h-18 md:w-26 md:h-26 top-[65%] right-[8%] -rotate-[20deg]" style={{ color: '#FF6B35', opacity: 0.04, filter: 'blur(3.5px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        {/* Palette — medium blur bottom-right */}
        <svg className="absolute w-20 h-20 md:w-30 md:h-30 top-[80%] right-[25%] rotate-[25deg]" style={{ color: '#FF6B35', opacity: 0.05, filter: 'blur(2.5px)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
      </div>
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-100">
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 md:px-6 md:py-12 relative z-[1]">
        <div
          key={step}
          className="animate-fade-in"
          style={{ animationDuration: '0.35s' }}
        >
          {renderStep()}
        </div>
      </main>

      <footer className="bg-[#212121] py-4 md:py-6 text-center text-[10px] md:text-xs text-white/40 uppercase tracking-wider relative z-[1]">
        © {new Date().getFullYear()} SOCIALIFY · TODOS LOS DERECHOS RESERVADOS
      </footer>
    </div>
  );
};

export default Funnel;
