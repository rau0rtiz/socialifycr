import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import loginBanner from '@/assets/login-banner.jpg';

const LOGO_URL =
  'https://chqhyqylnbtwyzhjkxlu.supabase.co/storage/v1/object/public/content-images/imgdb/general/1779672210058-logo___SLOGAN.png';

const PortalSelect = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const go = (target: string) => {
    if (loading) return;
    if (user) navigate(target);
    else navigate(`/auth?next=${encodeURIComponent(target)}`);
  };

  const options = [
    {
      key: 'cliente',
      title: 'Portal cliente',
      description: 'Métricas y contenido de tu marca',
      icon: LayoutDashboard,
      target: '/dashboard',
    },
    {
      key: 'agencia',
      title: 'Portal agencia',
      description: 'Herramientas internas de Socialify',
      icon: Building2,
      target: '/agencia',
    },
  ];

  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={loginBanner} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      </div>

      <main className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <img src={LOGO_URL} alt="Socialify" className="h-16 w-auto object-contain" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            ¿A dónde querés entrar?
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Elegí tu portal para continuar.
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          {options.map(({ key, title, description, icon: Icon, target }) => (
            <button
              key={key}
              type="button"
              onClick={() => go(target)}
              className="group rounded-2xl border border-border bg-card/90 p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Entrar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PortalSelect;
