import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlatformConnections } from './use-platform-connections';

interface MetaApiParams {
  [key: string]: string | number | boolean;
}

interface MetaConnection {
  id: string;
  platform: 'meta';
  status: 'active' | 'expired' | 'revoked' | 'pending';
  platform_page_name: string | null;
  instagram_account_id: string | null;
  ad_account_id: string | null;
  permissions: {
    pages: { id: string; name: string }[];
    instagram: { pageId: string; pageName: string; instagramId: string }[];
    adAccounts: { id: string; name: string }[];
  } | null;
}

export const useMetaApi = (clientId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMetaData = useCallback(async (endpoint: string, params: MetaApiParams = {}) => {
    if (!clientId) {
      setError('No client selected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('meta-api', {
        body: { clientId, endpoint, params }
      });

      if (invokeError) {
        console.error('Meta API error:', invokeError);
        setError(invokeError.message);
        return null;
      }

      if (data?.error) {
        console.error('Meta API returned error:', data.error);
        setError(data.error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error fetching Meta data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const getPageInsights = useCallback((period: string = 'day', days: number = 30) => {
    const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
    const until = Math.floor(Date.now() / 1000);
    return fetchMetaData('page-insights', { period, since, until });
  }, [fetchMetaData]);

  const getInstagramInsights = useCallback((period: string = 'day') => {
    return fetchMetaData('instagram-insights', { period });
  }, [fetchMetaData]);

  const getInstagramMedia = useCallback((limit: number = 10) => {
    return fetchMetaData('instagram-media', { limit });
  }, [fetchMetaData]);

  const getPagePosts = useCallback((limit: number = 10) => {
    return fetchMetaData('page-posts', { limit });
  }, [fetchMetaData]);

  const getAdsInsights = useCallback((datePreset: string = 'last_30d') => {
    return fetchMetaData('ads-insights', { datePreset });
  }, [fetchMetaData]);

  const getCampaigns = useCallback(() => {
    return fetchMetaData('campaigns');
  }, [fetchMetaData]);

  const getPageInfo = useCallback(() => {
    return fetchMetaData('page-info');
  }, [fetchMetaData]);

  const initiateOAuth = useCallback(async () => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un cliente primero',
        variant: 'destructive',
      });
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/oauth/meta/callback`;
      
      const { data, error: invokeError } = await supabase.functions.invoke('meta-oauth', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Build the URL with query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth?action=authorize&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      
      const authData = await response.json();

      if (authData.error) {
        toast({
          title: 'Error',
          description: authData.error,
          variant: 'destructive',
        });
        return;
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authData.authUrl,
        'meta-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast({
          title: 'Error',
          description: 'No se pudo abrir la ventana de autorización. Por favor, permite las ventanas emergentes.',
          variant: 'destructive',
        });
      }

      return popup;
    } catch (err) {
      console.error('Error initiating OAuth:', err);
      toast({
        title: 'Error',
        description: 'Error al iniciar la conexión con Meta',
        variant: 'destructive',
      });
    }
  }, [clientId, toast]);

  const completeOAuth = useCallback(async (code: string) => {
    if (!clientId) return null;

    try {
      const redirectUri = `${window.location.origin}/oauth/meta/callback`;
      
      const { data, error: invokeError } = await supabase.functions.invoke('meta-oauth', {
        body: null,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth?action=callback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri, clientId })
        }
      );

      const result = await response.json();

      if (result.error) {
        toast({
          title: 'Error de conexión',
          description: result.error,
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Conexión exitosa',
        description: `Conectado a Meta: ${result.connection?.pageName || 'Cuenta conectada'}`,
      });

      return result;
    } catch (err) {
      console.error('Error completing OAuth:', err);
      toast({
        title: 'Error',
        description: 'Error al completar la conexión con Meta',
        variant: 'destructive',
      });
      return null;
    }
  }, [clientId, toast]);

  const getConnection = useCallback(async (): Promise<MetaConnection | null> => {
    if (!clientId) return null;

    const { data, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('client_id', clientId)
      .eq('platform', 'meta')
      .maybeSingle();

    if (error) {
      console.error('Error fetching connection:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      platform: 'meta' as const,
      status: data.status as MetaConnection['status'],
      platform_page_name: data.platform_page_name,
      instagram_account_id: data.instagram_account_id,
      ad_account_id: data.ad_account_id,
      permissions: data.permissions as MetaConnection['permissions'],
    };
  }, [clientId]);

  return {
    loading,
    error,
    initiateOAuth,
    completeOAuth,
    getConnection,
    getPageInsights,
    getInstagramInsights,
    getInstagramMedia,
    getPagePosts,
    getAdsInsights,
    getCampaigns,
    getPageInfo,
  };
};

// Standalone hook to get Meta connection — derives from shared platform connections cache
export const useMetaConnection = (clientId: string | null) => {
  const { usePlatformConnections } = require('./use-platform-connections');
  const { data: connections, isLoading, refetch } = usePlatformConnections(clientId);
  const metaConnection = connections?.find((c: any) => c.platform === 'meta') || null;
  
  return {
    data: metaConnection,
    isLoading,
    refetch,
  };
};