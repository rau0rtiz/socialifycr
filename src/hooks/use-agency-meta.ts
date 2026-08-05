import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AgencyMetaStatus {
  id: string;
  user_name: string | null;
  business_id: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  token_expires_at: string | null;
  connected_at: string;
}

export interface AgencyMetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  created_time?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  leads?: number;
}

interface MetaAccountsData {
  adAccounts: { id: string; name: string }[];
  accessToken: string;
  tokenExpiresAt: string;
  pages: { id: string; name: string }[];
}

const FN = (path: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;

export const useAgencyMetaStatus = () =>
  useQuery({
    queryKey: ['agency-meta-status'],
    queryFn: async (): Promise<AgencyMetaStatus | null> => {
      const { data, error } = await supabase.rpc('get_agency_meta_status');
      if (error) throw error;
      return (data as AgencyMetaStatus[])?.[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

export const useAgencyMetaCampaigns = (enabled = true) =>
  useQuery({
    queryKey: ['agency-meta-campaigns'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(FN('agency-meta'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'campaigns' }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json as { connected: boolean; adAccountId?: string; adAccountName?: string; campaigns: AgencyMetaCampaign[] };
    },
  });

/** OAuth popup flow reusing the same Meta app/connection that already works for clients. */
export const useAgencyMetaConnect = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [accountsData, setAccountsData] = useState<MetaAccountsData | null>(null);

  const exchangeCode = useCallback(async (code: string, redirectUri: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(FN('meta-oauth?action=fetch-accounts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ code, redirectUri, clientId: 'agency' }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAccountsData(json.accounts);
    } catch (err) {
      toast({
        title: 'Error de conexión',
        description: err instanceof Error ? err.message : 'No se pudo conectar con Meta',
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  }, [toast]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'META_OAUTH_CODE' && event.data.clientId === 'agency') {
        exchangeCode(event.data.code, event.data.redirectUri);
      } else if (event.data?.type === 'META_OAUTH_ERROR') {
        setConnecting(false);
        toast({ title: 'Error de conexión', description: event.data.error, variant: 'destructive' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [exchangeCode, toast]);

  // iPad/iOS fallback: result stored in sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('meta_oauth_result');
    if (!raw) return;
    sessionStorage.removeItem('meta_oauth_result');
    try {
      const payload = JSON.parse(raw);
      if (payload.type === 'META_OAUTH_CODE' && payload.clientId === 'agency') {
        setConnecting(true);
        exchangeCode(payload.code, payload.redirectUri);
      }
    } catch { /* ignore */ }
  }, [exchangeCode]);

  const startConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/oauth/meta/callback`;
      const res = await fetch(
        FN(`meta-oauth?action=authorize&client_id=agency&redirect_uri=${encodeURIComponent(redirectUri)}`),
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(data.authUrl, 'meta-oauth', `width=${width},height=${height},left=${left},top=${top}`);
      if (!popup || popup.closed) window.location.href = data.authUrl;
    } catch (err) {
      setConnecting(false);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo iniciar la conexión',
        variant: 'destructive',
      });
    }
  };

  const saveAccount = useMutation({
    mutationFn: async ({ adAccountId, adAccountName }: { adAccountId: string; adAccountName: string }) => {
      if (!accountsData) throw new Error('Sin datos de cuentas');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(FN('meta-oauth?action=save-connection'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          clientId: 'agency',
          accessToken: accountsData.accessToken,
          tokenExpiresAt: accountsData.tokenExpiresAt,
          adAccountId,
          adAccountName,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      setAccountsData(null);
      queryClient.invalidateQueries({ queryKey: ['agency-meta-status'] });
      queryClient.invalidateQueries({ queryKey: ['agency-meta-campaigns'] });
      toast({ title: 'Meta conectado', description: 'Cuenta publicitaria de la agencia vinculada' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(FN('agency-meta'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-meta-status'] });
      queryClient.invalidateQueries({ queryKey: ['agency-meta-campaigns'] });
      toast({ title: 'Meta desconectado' });
    },
  });

  return { connecting, accountsData, setAccountsData, startConnect, saveAccount, disconnect };
};

export const useUpdateFunnelCampaign = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      funnelId: string;
      adAccountId: string | null;
      campaignId: string | null;
      campaignName: string | null;
    }) => {
      const { error } = await supabase
        .from('funnels')
        .update({
          meta_ad_account_id: input.adAccountId,
          meta_campaign_id: input.campaignId,
          meta_campaign_name: input.campaignName,
        })
        .eq('id', input.funnelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast({ title: 'Campaña actualizada' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};
