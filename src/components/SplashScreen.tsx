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

  // Time-based progress: fills gradually over 4 seconds
  useEffect(() => {
    const duration = 4000;
    const interval = 50;
    const totalSteps = duration / interval;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setProgress(Math.min((step / totalSteps) * 100, 100));
      if (step >= totalSteps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  const prefetchAll = useCallback(async () => {
    const clientId = client?.id;
    if (!clientId) return;

    // Fetch user + flags first (these gate the rest of the prefetch)
    const { data: { user } } = await supabase.auth.getUser();

    const userRolePromise = user
      ? queryClient.prefetchQuery({
          // Match useUserRole key to dedupe — same array, no .maybeSingle()
          queryKey: ['user-system-role', user.id],
          queryFn: async () => {
            const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
            if (!data || data.length === 0) return null;
            const priority = ['owner', 'admin', 'manager', 'media_buyer', 'closer', 'setter', 'analyst', 'viewer'];
            const roles = data.map(d => d.role as string);
            return priority.find(r => roles.includes(r)) || roles[0];
          },
          staleTime: 5 * 60 * 1000,
        })
      : Promise.resolve();

    const flagsPromise = queryClient.fetchQuery({
      queryKey: ['client-features', clientId],
      queryFn: async () => {
        const { data } = await supabase.from('client_feature_flags').select('*').eq('client_id', clientId).maybeSingle();
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });

    // Always-needed: connections (cheap, drives many widgets)
    const connectionsPromise = queryClient.prefetchQuery({
      queryKey: ['platform-connections', clientId],
      queryFn: async () => {
        const { data } = await supabase.from('platform_connections').select('*').eq('client_id', clientId).eq('status', 'active');
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });

    const [flags] = await Promise.all([flagsPromise, connectionsPromise, userRolePromise]);

    // Helper: flag is "on" if record missing (default permissive for agency) OR explicitly true
    const flagOn = (key: string) => !flags || (flags as any)[key] === true;

    const conditional: Promise<unknown>[] = [];

    // Sales-related (limited to 90 days for initial load)
    if (flagOn('sales_tracking') || flagOn('ventas_section')) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['sales', clientId],
          queryFn: async () => {
            const { data } = await supabase
              .from('message_sales')
              .select('*')
              .eq('client_id', clientId)
              .gte('sale_date', ninetyDaysAgo)
              .order('sale_date', { ascending: false })
              .limit(500);
            return data || [];
          },
          staleTime: 2 * 60 * 1000,
        }),
      );
    }

    // Campaigns
    if (flagOn('campaigns')) {
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['campaign-goals', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('campaign_goals').select('*').eq('client_id', clientId);
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),
      );
    }

    // Video ideas
    if (flagOn('video_ideas')) {
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['video-ideas', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('video_ideas').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
            return data || [];
          },
          staleTime: 2 * 60 * 1000,
        }),
      );
    }

    // Content metadata/tags/models
    if (flagOn('contenido_section') || flagOn('content_grid')) {
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['content-tags', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('content_tags').select('*').eq('client_id', clientId).order('name');
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: ['content-models', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('content_models').select('*').eq('client_id', clientId).order('name');
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: ['content-metadata', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('content_metadata').select('*').eq('client_id', clientId);
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),
      );
    }

    // Setter / appointments
    if (flagOn('setter_tracker') || flagOn('setter_daily')) {
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['setter-appointments', clientId, 'last_30d'],
          queryFn: async () => {
            const start = new Date(Date.now() - 30 * 86400000).toISOString();
            const { data } = await supabase
              .from('setter_appointments')
              .select('*')
              .eq('client_id', clientId)
              .gte('appointment_date', start)
              .order('appointment_date', { ascending: false });
            return data || [];
          },
          staleTime: 2 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: ['client-setters', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('client_setters').select('*').eq('client_id', clientId).order('name');
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),
      );
    }

    // Products (used in many sales/business setup widgets)
    if (flagOn('sales_tracking') || flagOn('ventas_section') || flagOn('business_setup_section')) {
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['client-products', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('client_products').select('*').eq('client_id', clientId).order('name');
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),
      );
    }

    // Sales goals
    if (flagOn('sales_goal') || flagOn('ventas_section')) {
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['sales-goals', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('sales_goals').select('*').eq('client_id', clientId);
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),
      );
    }

    // Competitors
    if (flagOn('competitors')) {
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['client-competitors', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('client_competitors').select('*').eq('client_id', clientId);
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),
      );
    }

    // Reports
    if (flagOn('reportes_section') || flagOn('ai_report_generator') || flagOn('monthly_sales_report')) {
      conditional.push(
        queryClient.prefetchQuery({
          queryKey: ['saved-reports', clientId],
          queryFn: async () => {
            const { data } = await supabase.from('saved_reports').select('*').eq('client_id', clientId).order('updated_at', { ascending: false });
            return data || [];
          },
          staleTime: 2 * 60 * 1000,
        }),
      );
    }

    await Promise.allSettled(conditional);
  }, [client?.id, queryClient]);

  useEffect(() => {
    if (client) {
      prefetchAll();
    }
  }, [client, prefetchAll]);

  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
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
            <img src={logo} alt={client?.name || 'Logo'} className="h-20 w-20 rounded-2xl object-contain shadow-lg bg-card/80 p-2" loading="eager" decoding="async" />
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
