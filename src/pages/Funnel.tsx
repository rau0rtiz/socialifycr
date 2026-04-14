import { useState } from 'react';
import { WelcomeStep } from '@/components/funnel/WelcomeStep';
import { BusinessInfoStep } from '@/components/funnel/BusinessInfoStep';
import { RevenueStep } from '@/components/funnel/RevenueStep';
import { ChallengeStep } from '@/components/funnel/ChallengeStep';
import { EmailCaptureStep } from '@/components/funnel/EmailCaptureStep';
import { ResultsStep } from '@/components/funnel/ResultsStep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import socialifyLogo from '@/assets/socialify-logo.png';

const CALENDLY_URL = 'https://calendly.com/socialifycr';
const FONT = "'DM Sans', sans-serif";

const calculateLevel = (revenueRange: string, teamSize: string, timeInBusiness: string): number => {
  const revenueMap: Record<string, number> = {
    '0': 1, '0_3k': 2, '3k_15k': 3, '15k_50k': 4, '50k_200k': 5, '200k_plus': 6,
  };
  let base = revenueMap[revenueRange] ?? 1;
  if (base === 1 && timeInBusiness !== 'not_started') base = 2;
  if (base === 2 && (teamSize === '6_15' || teamSize === '15_plus')) base = 3;
  return Math.min(6, Math.max(1, base));
};

const Funnel = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessLevel, setBusinessLevel] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);

  const [businessInfo, setBusinessInfo] = useState({ industry: '', timeInBusiness: '', teamSize: '' });
  const [revenueInfo, setRevenueInfo] = useState({ revenueRange: '', acquisitionMethod: '' });
  const [challengeInfo, setChallengeInfo] = useState({ challenge: '' });
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '' });

  const totalSteps = 5;
  const progressPercent = step === 0 ? 0 : Math.round((step / totalSteps) * 100);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const level = calculateLevel(revenueInfo.revenueRange, businessInfo.teamSize, businessInfo.timeInBusiness);
    setBusinessLevel(level);

    try {
      const { data, error } = await supabase.from('funnel_leads').insert({
        name: contactInfo.name.trim().slice(0, 100),
        email: contactInfo.email.trim().toLowerCase().slice(0, 255),
        phone: contactInfo.phone.trim().slice(0, 20) || null,
        business_level: level,
        industry: businessInfo.industry,
        revenue_range: revenueInfo.revenueRange,
        team_size: businessInfo.teamSize,
        challenge: challengeInfo.challenge,
        answers: {
          timeInBusiness: businessInfo.timeInBusiness,
          acquisitionMethod: revenueInfo.acquisitionMethod,
        },
      }).select('id').single();

      if (error) throw error;
      setLeadId(data.id);
      setStep(5);
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

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: FONT }}>
      {/* Header — centered logo */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 md:px-6 md:py-4 flex items-center justify-center relative">
          <img src={socialifyLogo} alt="Socialify" className="h-6 md:h-7" />
          {step > 0 && step < 5 && (
            <span className="absolute right-4 text-xs md:text-sm text-[#212121]/40 font-medium">{step} / {totalSteps - 1}</span>
          )}
        </div>
        {step > 0 && step < 5 && (
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-[#FF6B35] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 md:px-6 md:py-16">
        {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
        {step === 1 && (
          <BusinessInfoStep
            data={businessInfo}
            onChange={(f, v) => setBusinessInfo((p) => ({ ...p, [f]: v }))}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <RevenueStep
            data={revenueInfo}
            onChange={(f, v) => setRevenueInfo((p) => ({ ...p, [f]: v }))}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ChallengeStep
            data={challengeInfo}
            onChange={(f, v) => setChallengeInfo((p) => ({ ...p, [f]: v }))}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <EmailCaptureStep
            data={contactInfo}
            onChange={(f, v) => setContactInfo((p) => ({ ...p, [f]: v }))}
            onSubmit={handleSubmit}
            onBack={() => setStep(3)}
            isSubmitting={isSubmitting}
          />
        )}
        {step === 5 && (
          <ResultsStep
            level={businessLevel}
            name={contactInfo.name}
            onCalendlyClick={handleCalendlyClick}
          />
        )}
      </main>

      <footer className="bg-[#212121] py-4 md:py-6 text-center text-[10px] md:text-xs text-white/40">
        © {new Date().getFullYear()} Socialify · Todos los derechos reservados
      </footer>
    </div>
  );
};

export default Funnel;
