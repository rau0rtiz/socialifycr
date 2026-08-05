import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GRAPH = 'https://graph.facebook.com/v21.0';

async function verifyAuth(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    if (!error && data?.claims?.sub) return { id: data.claims.sub as string };
  } catch { /* fallthrough */ }
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ? { id: user.id } : null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const user = await verifyAuth(req, supabase);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: isAgency } = await supabase.rpc('is_agency_member', { _user_id: user.id });
    if (!isAgency) return json({ error: 'Solo miembros de la agencia' }, 403);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get('action') || 'campaigns';

    const { data: conn } = await supabase
      .from('agency_meta_connection')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (action === 'disconnect') {
      if (conn) await supabase.from('agency_meta_connection').delete().eq('id', conn.id);
      return json({ success: true });
    }

    if (!conn?.access_token || !conn?.ad_account_id) {
      return json({ connected: false, campaigns: [] });
    }

    const accountId = conn.ad_account_id.startsWith('act_') ? conn.ad_account_id : `act_${conn.ad_account_id}`;
    const datePreset: string = body.datePreset || 'last_30d';

    const LEAD_TYPES = ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'];
    const extractLeads = (row: any) => {
      const a = (row?.actions || []).find((x: any) => LEAD_TYPES.includes(x.action_type));
      return Number(a?.value || 0);
    };

    if (action === 'campaign-ads') {
      const campaignId = String(body.campaignId || '');
      if (!campaignId) return json({ error: 'campaignId requerido' }, 400);

      // Campaign-level totals
      const cRes = await fetch(
        `${GRAPH}/${campaignId}/insights?fields=spend,impressions,clicks,ctr,cpc,actions&date_preset=${datePreset}&access_token=${conn.access_token}`,
      );
      const cData = await cRes.json();
      if (cData.error) return json({ connected: true, error: cData.error.message, ads: [] });
      const cRow = cData.data?.[0] || {};
      const totals = {
        spend: Number(cRow.spend || 0),
        impressions: Number(cRow.impressions || 0),
        clicks: Number(cRow.clicks || 0),
        leads: extractLeads(cRow),
      };

      // Ad-level breakdown
      const aRes = await fetch(
        `${GRAPH}/${campaignId}/insights?level=ad&fields=ad_id,ad_name,spend,impressions,clicks,actions&date_preset=${datePreset}&limit=200&access_token=${conn.access_token}`,
      );
      const aData = await aRes.json();
      if (aData.error) return json({ connected: true, totals, ads: [], error: aData.error.message });

      const ads = (aData.data || []).map((r: any) => {
        const leads = extractLeads(r);
        const spend = Number(r.spend || 0);
        return {
          id: r.ad_id,
          name: r.ad_name,
          spend,
          impressions: Number(r.impressions || 0),
          clicks: Number(r.clicks || 0),
          leads,
          cpl: leads > 0 ? spend / leads : null,
        };
      }).sort((a: any, b: any) => b.leads - a.leads);

      return json({ connected: true, datePreset, totals, ads });
    }

    if (action === 'ad-accounts') {
      const res = await fetch(`${GRAPH}/me/adaccounts?fields=id,name&limit=100&access_token=${conn.access_token}`);
      const data = await res.json();
      if (data.error) return json({ connected: true, error: data.error.message }, 200);
      return json({ connected: true, adAccounts: data.data || [] });
    }

    // action === 'campaigns'
    const res = await fetch(
      `${GRAPH}/${accountId}/campaigns?fields=id,name,status,objective,created_time&limit=200&access_token=${conn.access_token}`,
    );
    const data = await res.json();
    if (data.error) {
      console.error('Meta campaigns error:', data.error);
      return json({ connected: true, error: data.error.message, campaigns: [] });
    }

    const campaigns = await Promise.all(
      (data.data || []).map(async (c: any) => {
        let insights: Record<string, unknown> = {};
        try {
          const ir = await fetch(
            `${GRAPH}/${c.id}/insights?fields=spend,impressions,clicks,ctr,cpc,actions&date_preset=${datePreset}&access_token=${conn.access_token}`,
          );
          const idata = await ir.json();
          const row = idata.data?.[0];
          if (row) {
            const leadAction = (row.actions || []).find((a: any) =>
              ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'].includes(a.action_type),
            );
            insights = {
              spend: Number(row.spend || 0),
              impressions: Number(row.impressions || 0),
              clicks: Number(row.clicks || 0),
              ctr: Number(row.ctr || 0),
              cpc: Number(row.cpc || 0),
              leads: Number(leadAction?.value || 0),
            };
          }
        } catch (e) {
          console.error('Insights error for campaign', c.id, e);
        }
        return { id: c.id, name: c.name, status: c.status, objective: c.objective, created_time: c.created_time, ...insights };
      }),
    );

    return json({
      connected: true,
      adAccountId: conn.ad_account_id,
      adAccountName: conn.ad_account_name,
      campaigns,
    });
  } catch (error) {
    console.error('agency-meta error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
