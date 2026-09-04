import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import loginBanner from '@/assets/login-banner.jpg';

const LOGO_URL =
  'https://chqhyqylnbtwyzhjkxlu.supabase.co/storage/v1/object/public/content-images/imgdb/general/1779672210058-logo___SLOGAN.png';

const PortalSelect = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const enter = () => {
    if (loading) return;
    if (user) navigate('/agencia');
    else navigate(`/auth?next=${encodeURIComponent('/agencia')}`);
  };

  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={loginBanner} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>

      <main className="relative z-10 w-full max-w-md flex flex-col items-center gap-8 text-center">
        <img src={LOGO_URL} alt="Socialify" className="h-16 w-auto object-contain" />
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Panel interno de Socialify
          </h1>
          <p className="text-sm text-muted-foreground">
            Acceso exclusivo para el equipo de la agencia.
          </p>
        </div>

        <button
          type="button"
          onClick={enter}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Entrar al panel de agencia
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </main>
    </div>
  );
};

export default PortalSelect;
