import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import loginBanner from '@/assets/login-banner.jpg';
import type { Client } from '@/contexts/BrandContext';

const PHRASES = [
  "Preparando tu experiencia…",
  "Cargando métricas de rendimiento…",
  "Sincronizando datos de plataformas…",
  "Organizando tu contenido…",
  "Analizando tendencias…",
  "Casi listo para impresionar…",
  "Optimizando visualizaciones…",
  "Tu dashboard está casi listo…",
];

interface SplashScreenProps {
  onComplete: () => void;
  client: Client | null;
  clientLogo?: string | null;
}

export const SplashScreen = ({ onComplete, client, clientLogo }: SplashScreenProps) => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true);
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const prefetchAll = useCallback(async () => {
    const clientId = client?.id;
    if (!clientId) {
      setProgress(100);
      return;
    }

    const steps: Array<() => Promise<void>> = [];
    let completed = 0;
    const advance = () => {
      completed++;
      setProgress(Math.min(Math.round((completed / steps.length) * 100), 100));
    };

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['platform-connections', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('platform_connections').select('*').eq('client_id', clientId).eq('status', 'active');
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['client-features', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('client_feature_flags').select('*').eq('client_id', clientId).maybeSingle();
          return data;
        },
        staleTime: 5 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['content-tags', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('content_tags').select('*').eq('client_id', clientId).order('name');
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['content-models', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('content_models').select('*').eq('client_id', clientId).order('name');
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['content-metadata', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('content_metadata').select('*').eq('client_id', clientId);
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['sales', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('message_sales').select('*').eq('client_id', clientId).order('sale_date', { ascending: false });
          return data || [];
        },
        staleTime: 2 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['campaign-goals', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('campaign_goals').select('*').eq('client_id', clientId);
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['video-ideas', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('video_ideas').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
          return data || [];
        },
        staleTime: 2 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['user-role'],
        queryFn: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;
          const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
          return data;
        },
        staleTime: 10 * 60 * 1000,
      });
      advance();
    });

    steps.push(async () => {
      await queryClient.prefetchQuery({
        queryKey: ['saved-reports', clientId],
        queryFn: async () => {
          const { data } = await supabase.from('saved_reports').select('*').eq('client_id', clientId).order('updated_at', { ascending: false });
          return data || [];
        },
        staleTime: 2 * 60 * 1000,
      });
      advance();
    });

    await Promise.allSettled(steps.map(fn => fn()));
    setProgress(100);
  }, [client?.id, queryClient]);

  useEffect(() => {
    if (client) {
      prefetchAll();
    }
  }, [client, prefetchAll]);

  useEffect(() => {
    const timer = setTimeout(onComplete, 8000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const logo = clientLogo || client?.logo_url;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'hsl(var(--background))' }}
    >
      <div className="absolute inset-0">
        <img src={loginBanner} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          {logo ? (
            <img src={logo} alt={client?.name || 'Logo'} className="h-20 w-20 rounded-2xl object-contain shadow-lg bg-card/80 p-2" />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-primary">{client?.name?.[0] || 'S'}</span>
            </div>
          )}
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{client?.name || 'Socialify'}</h1>
        </div>

        <div className="w-full space-y-3">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center animate-pulse min-h-[1.25rem]">{PHRASES[phraseIndex]}</p>
        </div>
      </div>
    </div>
  );
};
