// Client results dashboard. Public readers use the calendar share token; agency members manage setup.
// Meta data is read server-side with the agency Meta connection and cached per client+range for 1 hour.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { portfolioAccounts, selectedPortfolioAccounts } from '../_shared/dashboard-portfolio.ts';
import {
  currencyRate, isCampaignVisible, metricsFor, previousRange, rankAds, resultTypeFor, RESULT_LABEL, type ResultType,
} from '../_shared/dashboard-metrics.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const GRAPH = 'https://graph.facebook.com/v21.0';
const CACHE_MS = 60 * 60 * 1000;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Range = { since: Day, until: Day, refresh: z.boolean().optional() };
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('public'), token: z.string().min(8).max(80), ...Range }),
  z.object({ action: z.literal('preview'), client_id: z.string().uuid(), ...Range }),
  z.object({ action: z.literal('businesses') }),
  z.object({ action: z.literal('ad_accounts'), client_id: z.string().uuid(), business_id: z.string().regex(/^\d+$/).optional() }),
  z.object({ action: z.literal('save_settings'), client_id: z.string().uuid(), settings: z.object({
    business_id: z.string().regex(/^\d+$/), ad_account_ids: z.array(z.string()),
    visible_campaign_ids: z.array(z.string()).nullable(), result_overrides: z.record(z.string()),
    currency: z.enum(['USD', 'CRC']), show_campaigns: z.boolean(), show_accounts: z.boolean(), show_leads: z.boolean(), show_lead_names: z.boolean(),
  }) }),
  z.object({ action: z.literal('campaigns'), client_id: z.string().uuid() }),
  z.object({ action: z.literal('public_config'), token: z.string().min(8).max(80) }),
]);

const VIDEO_FIELDS = 'video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions,video_avg_time_watched_actions';
const BASE_FIELDS = `spend,reach,impressions,frequency,actions,action_values,${VIDEO_FIELDS}`;

async function graph(path: string, params: Record<string, string>, token: string) {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Meta error');
  return data;
}
async function graphAll(path: string, params: Record<string, string>, token: string, max = 5) {
  const out: any[] = [];
  let data = await graph(path, { limit: '200', ...params }, token);
  out.push(...(data.data || []));
  for (let i = 1; i < max && data.paging?.next; i++) {
    const r = await fetch(data.paging.next); data = await r.json();
    if (data.error) break;
    out.push(...(data.data || []));
  }
  return out;
}

async function agencyConn() {
  const { data } = await admin.from('agency_meta_connection').select('access_token, token_expires_at')
    .order('updated_at', { ascending: false }).limit(1).maybeSingle();
  return data?.access_token ? data : null;
}

async function businessAccounts(businessId: string, token: string) {
  const fields = 'id,name,currency,account_status';
  const [owned, shared] = await Promise.all([
    graphAll(`${businessId}/owned_ad_accounts`, { fields }, token, 100),
    graphAll(`${businessId}/client_ad_accounts`, { fields }, token, 100),
  ]);
  return portfolioAccounts(owned, shared);
}

async function resolvePortfolio(settings: any, token: string) {
  if (settings.business_id) return settings.business_id;
  // Existing setups: infer only when all selected accounts have the same verified owner.
  if (!settings.ad_account_ids?.length) return null;
  const owners = await Promise.all(settings.ad_account_ids.map(async (id: string) => {
    const a = await graph(id.startsWith('act_') ? id : `act_${id}`, { fields: 'business{id,name}' }, token);
    return a.business?.id || null;
  }));
  return owners.every((id) => id && id === owners[0]) ? owners[0] : null;
}

async function scopedSettings(settings: any, token: string) {
  const businessId = await resolvePortfolio(settings, token);
  const allowed = businessId ? await businessAccounts(businessId, token) : [];
  return { ...settings, business_id: businessId, ad_account_ids: selectedPortfolioAccounts(settings.ad_account_ids || [], allowed) };
}

async function requireAgency(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const { data } = await admin.auth.getClaims(auth.slice(7));
  const uid = data?.claims?.sub;
  if (!uid) return false;
  const { data: ok } = await admin.rpc('is_agency_member', { _user_id: uid });
  return !!ok;
}

const tabsOf = (s: any) => ({
  campaigns: !!s && s.show_campaigns && (s.ad_account_ids?.length ?? 0) > 0,
  accounts: !!s && s.show_accounts,
  leads: !!s && s.show_leads,
});

async function buildDashboard(clientId: string, since: string, until: string, settings: any) {
  const conn = await agencyConn();
  const display = settings.currency || 'USD';
  const overrides: Record<string, string> = settings.result_overrides || {};
  const prev = previousRange(since, until);
  const errors: string[] = [];
  const campaigns: any[] = [];
  const ads: any[] = [];
  const daily: Record<string, Record<string, number>> = {};
  const prevTotals: Record<string, { spend: number; reach: number; results: number }> = {};

  if (conn && (settings.ad_account_ids?.length ?? 0) > 0 && settings.show_campaigns) {
    const { data: accRows } = await admin.from('agency_meta_accounts').select('meta_ad_account_id, currency');
    const curOf = (id: string) => accRows?.find((a) => a.meta_ad_account_id.replace('act_', '') === id.replace('act_', ''))?.currency;
    for (const raw of settings.ad_account_ids as string[]) {
      const act = raw.startsWith('act_') ? raw : `act_${raw}`;
      try {
        let currency = curOf(act);
        if (!currency) currency = (await graph(act, { fields: 'currency' }, conn.access_token)).currency;
        const rate = currencyRate(currency, display);
        const tr = JSON.stringify({ since, until });
        const [camps, cIns, aIns, dIns, pIns] = await Promise.all([
          graphAll(`${act}/campaigns`, { fields: 'id,name,objective,effective_status' }, conn.access_token),
          graphAll(`${act}/insights`, { level: 'campaign', fields: `campaign_id,campaign_name,objective,${BASE_FIELDS}`, time_range: tr }, conn.access_token),
          graphAll(`${act}/insights`, { level: 'ad', fields: `ad_id,ad_name,campaign_id,${BASE_FIELDS}`, time_range: tr }, conn.access_token),
          graphAll(`${act}/insights`, { level: 'campaign', fields: 'campaign_id,objective,spend,reach,impressions,actions', time_range: tr, time_increment: '1' }, conn.access_token, 10),
          graphAll(`${act}/insights`, { level: 'campaign', fields: 'campaign_id,objective,spend,reach,impressions,actions', time_range: JSON.stringify(prev) }, conn.access_token),
        ]);
        const meta = new Map(camps.map((c: any) => [c.id, c]));
        const typeOf = new Map<string, ResultType>();
        for (const row of cIns) {
          if (!isCampaignVisible(row.campaign_id, settings.visible_campaign_ids)) continue;
          const c: any = meta.get(row.campaign_id) || {};
          const type = resultTypeFor(row.objective || c.objective, row, overrides[row.campaign_id]);
          typeOf.set(row.campaign_id, type);
          campaigns.push({
            id: row.campaign_id, name: row.campaign_name || c.name, objective: row.objective || c.objective,
            active: c.effective_status === 'ACTIVE', result_type: type, metrics: metricsFor(row, type, rate),
          });
        }
        for (const row of aIns) {
          const type = typeOf.get(row.campaign_id);
          if (!type) continue;
          ads.push({ id: row.ad_id, name: row.ad_name, campaign_id: row.campaign_id, result_type: type, metrics: metricsFor(row, type, rate) });
        }
        for (const row of dIns) {
          const type = typeOf.get(row.campaign_id);
          if (!type) continue;
          const m = metricsFor(row, type, rate);
          const day = (daily[row.date_start] ||= { spend: 0 });
          day.spend += m.spend;
          day[type] = (day[type] || 0) + m.results;
        }
        for (const row of pIns) {
          if (!isCampaignVisible(row.campaign_id, settings.visible_campaign_ids)) continue;
          const type = resultTypeFor(row.objective, row, overrides[row.campaign_id]);
          const m = metricsFor(row, type, rate);
          const t = (prevTotals[type] ||= { spend: 0, reach: 0, results: 0 });
          t.spend += m.spend; t.reach += m.reach; t.results += m.results;
        }
      } catch (e) {
        console.error('[client-dashboard] meta', act, (e as Error).message);
        errors.push((e as Error).message.slice(0, 200));
      }
    }
  } else if (!conn && settings.show_campaigns) errors.push('La conexión de Meta de la agencia no está activa.');

  // Creative previews for ranked ads (top 40 overall).
  const ranked = rankAds(ads).slice(0, 40);
  if (conn && ranked.length) {
    try {
      const det = await graph('', { ids: ranked.map((a) => a.id).join(','), fields: 'creative{id,thumbnail_url,image_url,body,title,object_type,video_id}' }, conn.access_token);
      const creativeIds = [...new Set(ranked.map((a) => det?.[a.id]?.creative?.id).filter(Boolean))];
      let previews: any = {};
      const videoIds = [...new Set(ranked.map((a) => det?.[a.id]?.creative?.video_id).filter(Boolean))];
      let videos: any = {};
      if (videoIds.length) {
        try {
          videos = await graph('', { ids: videoIds.join(','), fields: 'source' }, conn.access_token);
        } catch (e) { console.error('[client-dashboard] video previews', (e as Error).message); }
      }
      if (creativeIds.length) {
        try {
          // Size parameters belong to the creative node, not its enclosing ad.
          previews = await graph('', { ids: creativeIds.join(','), fields: 'thumbnail_url,image_url', thumbnail_width: '1080', thumbnail_height: '1350' }, conn.access_token);
        } catch (e) { console.error('[client-dashboard] large previews', (e as Error).message); }
      }
      for (const a of ranked) {
        const cr = det?.[a.id]?.creative;
        const preview = previews?.[cr?.id];
        if (cr) Object.assign(a, { thumbnail: preview?.image_url || cr.image_url || preview?.thumbnail_url || cr.thumbnail_url || null, video_url: videos?.[cr.video_id]?.source || null, body: cr.body || null, title: cr.title || null, is_video: !!cr.video_id });
      }
      await Promise.all(ranked.filter((a) => a.is_video && !a.video_url).map(async (a) => {
        try {
          const result = await graph(`${a.id}/previews`, { ad_format: 'MOBILE_FEED_STANDARD' }, conn.access_token);
          const src = result.data?.[0]?.body?.match(/src=["']([^"']+)["']/)?.[1]?.replace(/&amp;/g, '&');
          if (src) {
            const url = new URL(src);
            if (url.protocol === 'https:' && (url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com'))) a.preview_url = url.href;
          }
        } catch (e) { console.error('[client-dashboard] ad playback preview', (e as Error).message); }
      }));
    } catch (e) { console.error('[client-dashboard] creatives', (e as Error).message); }
  }

  // Totals grouped by result type (never summed across types).
  const byType: Record<string, any> = {};
  for (const c of campaigns) {
    const t = (byType[c.result_type] ||= { result_type: c.result_type, spend: 0, reach: 0, impressions: 0, results: 0, purchase_value: 0 });
    t.spend += c.metrics.spend; t.reach += c.metrics.reach; t.impressions += c.metrics.impressions;
    t.results += c.metrics.results; t.purchase_value += c.metrics.purchase_value;
  }
  const monthStart = `${since.slice(0, 7)}-01`;
  const { data: goals } = await admin.from('client_campaign_goals').select('result_type, target, max_cost, min_roas')
    .eq('client_id', clientId).eq('month', monthStart);
  const totals = Object.values(byType).map((t: any) => {
    const cpr = t.result_type === 'reach' ? (t.impressions ? (t.spend / t.impressions) * 1000 : null) : (t.results ? t.spend / t.results : null);
    return {
      ...t, label: RESULT_LABEL[t.result_type as ResultType], cost_per_result: cpr,
      roas: t.result_type === 'purchase' && t.spend > 0 && t.purchase_value > 0 ? t.purchase_value / t.spend : null,
      previous: prevTotals[t.result_type] || null,
      goal: goals?.find((g) => g.result_type === t.result_type) || null,
    };
  });

  // Discover social accounts from the client's portfolio, not only legacy OAuth connections.
  const accounts: any[] = [];
  if (settings.show_accounts) {
    const { data: pcs } = await admin.from('platform_connections')
      .select('access_token, refresh_token, instagram_account_id, platform_page_id').eq('client_id', clientId).eq('platform', 'meta').eq('status', 'active');
    const socialConnections = [...(pcs || [])];
    if (conn && settings.business_id) {
      const pages = new Map<string, any>();
      for (const edge of ['owned_pages', 'client_pages']) {
        try {
          const rows = await graphAll(`${settings.business_id}/${edge}`, { fields: 'id,name' }, conn.access_token, 100);
          for (const page of rows) pages.set(page.id, page);
        } catch (e) { console.error('[client-dashboard] portfolio pages', edge, (e as Error).message); }
      }
      for (const page of pages.values()) {
        let tok = conn.access_token;
        let igId: string | null = null;
        try {
          const detail = await graph(page.id, { fields: 'access_token,instagram_business_account{id}' }, conn.access_token);
          tok = detail.access_token || tok;
          igId = detail.instagram_business_account?.id || null;
        } catch {
          try {
            const detail = await graph(page.id, { fields: 'instagram_business_account{id}' }, conn.access_token);
            igId = detail.instagram_business_account?.id || null;
          } catch (e) { console.error('[client-dashboard] portfolio instagram', (e as Error).message); }
        }
        socialConnections.unshift({ platform_page_id: page.id, instagram_account_id: igId, access_token: tok, refresh_token: null });
      }
    }
    const seen = new Set<string>();
    for (const pc of socialConnections) {
      const tok = pc.refresh_token || pc.access_token;
      if (!tok) continue;
      if (pc.instagram_account_id && !seen.has(pc.instagram_account_id)) {
        try {
          const ig = await graph(pc.instagram_account_id, { fields: 'username,name,followers_count,profile_picture_url' }, tok);
          let series: { date: string; value: number }[] = [];
          try {
            const s = Math.max(new Date(`${since}T00:00:00Z`).getTime(), Date.now() - 29 * 86400000);
            const ins = await graph(`${pc.instagram_account_id}/insights`, {
              metric: 'follower_count', period: 'day',
              since: String(Math.floor(s / 1000)), until: String(Math.floor(new Date(`${until}T23:59:59Z`).getTime() / 1000)),
            }, tok);
            series = (ins.data?.[0]?.values || []).map((v: any) => ({ date: String(v.end_time).slice(0, 10), value: Number(v.value) || 0 }));
          } catch { /* growth optional */ }
          accounts.push({ platform: 'instagram', name: ig.name || ig.username, handle: ig.username ? `@${ig.username}` : null, picture: ig.profile_picture_url || null,
            followers: ig.followers_count ?? null, gained: series.length ? series.reduce((a, b) => a + b.value, 0) : null, series });
          seen.add(pc.instagram_account_id);
        } catch (e) { console.error('[client-dashboard] ig', (e as Error).message); }
      }
      if (pc.platform_page_id && !seen.has(pc.platform_page_id)) {
        try {
          const pg = await graph(pc.platform_page_id, { fields: 'name,followers_count,fan_count,picture{url}' }, tok);
          accounts.push({ platform: 'facebook', name: pg.name, handle: null, picture: pg.picture?.data?.url || null,
            followers: pg.followers_count ?? pg.fan_count ?? null, gained: null, series: [] });
          seen.add(pc.platform_page_id);
        } catch (e) { console.error('[client-dashboard] page', (e as Error).message); }
      }
    }
  }

  // Leads from Meta instant forms stored in the CRM.
  let leads: any = null;
  if (settings.show_leads) {
    const { data: rows } = await admin.from('instant_form_leads').select('full_name, created_time, form_name, platform, campaign_name')
      .eq('client_id', clientId).gte('created_time', `${since}T06:00:00Z`).lte('created_time', `${until}T23:59:59-06:00`)
      .order('created_time', { ascending: false }).limit(1000);
    const bySource: Record<string, number> = {};
    for (const r of rows || []) {
      const k = r.form_name || (r.platform === 'ig' || r.platform === 'instagram' ? 'Instagram' : 'Formulario de Meta');
      bySource[k] = (bySource[k] || 0) + 1;
    }
    leads = {
      total: rows?.length || 0,
      by_source: Object.entries(bySource).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      recent: (rows || []).slice(0, 10).map((r) => ({ name: settings.show_lead_names ? r.full_name : null, date: r.created_time, source: r.form_name || r.campaign_name })),
    };
  }

  // Delivery summary for the month of `until`.
  const m0 = `${until.slice(0, 7)}-01`;
  const mEnd = new Date(Date.UTC(Number(until.slice(0, 4)), Number(until.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const { data: monthItems } = await admin.from('content_calendar_items').select('status')
    .eq('client_id', clientId).gte('publish_date', m0).lte('publish_date', mEnd);
  const delivery = { scheduled: monthItems?.length || 0, approved: (monthItems || []).filter((i) => i.status === 'aprobado').length };

  return {
    range: { since, until }, previous_range: prev, currency: display, totals,
    campaigns: campaigns.sort((a, b) => b.metrics.spend - a.metrics.spend),
    ads: rankAds(ads).map((a) => ranked.find((r) => r.id === a.id) || a),
    daily: Object.entries(daily).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    accounts, leads, delivery, errors, tabs: tabsOf(settings),
  };
}

async function cachedDashboard(clientId: string, since: string, until: string, refresh?: boolean) {
  const { data: stored } = await admin.from('client_dashboard_settings').select('*').eq('client_id', clientId).maybeSingle();
  const conn = await agencyConn();
  const settings = stored && conn ? await scopedSettings(stored, conn.access_token) : stored ? { ...stored, ad_account_ids: [] } : null;
  if (!settings) return { configured: false, tabs: tabsOf(null) };
  const key = `video-v5_${since}_${until}_${settings.business_id || 'none'}_${settings.ad_account_ids.slice().sort().join(',')}`;
  const { data: snap } = await admin.from('client_dashboard_snapshots').select('payload, fetched_at').eq('client_id', clientId).eq('cache_key', key).maybeSingle();
  const fresh = snap && Date.now() - new Date(snap.fetched_at).getTime() < CACHE_MS && new Date(snap.fetched_at) > new Date(settings.updated_at);
  if (fresh && !refresh) return { configured: true, ...snap.payload, fetched_at: snap.fetched_at };
  try {
    const payload = await buildDashboard(clientId, since, until, settings);
    // Keep a stale snapshot instead of overwriting it with a failed Meta read.
    if (payload.errors.length && snap && payload.campaigns.length === 0) return { configured: true, ...snap.payload, fetched_at: snap.fetched_at, stale: true };
    const fetched_at = new Date().toISOString();
    await admin.from('client_dashboard_snapshots').upsert({ client_id: clientId, cache_key: key, payload, fetched_at });
    return { configured: true, ...payload, fetched_at };
  } catch (e) {
    if (snap) return { configured: true, ...snap.payload, fetched_at: snap.fetched_at, stale: true };
    throw e;
  }
}

const validRange = (since: string, until: string) => {
  const a = new Date(`${since}T00:00:00Z`).getTime(), b = new Date(`${until}T00:00:00Z`).getTime();
  return b >= a && b - a <= 400 * 86400000;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    if (b.action === 'public' || b.action === 'public_config') {
      const { data: share } = await admin.from('content_calendar_shares').select('client_id').eq('token', b.token).maybeSingle();
      if (!share) return json({ error: 'Enlace inválido o vencido' }, 404);
      if (b.action === 'public_config') {
        const { data: s } = await admin.from('client_dashboard_settings').select('*').eq('client_id', share.client_id).maybeSingle();
        return json({ tabs: tabsOf(s) });
      }
      if (!validRange(b.since, b.until)) return json({ error: 'Rango de fechas inválido (máximo 13 meses)' }, 400);
      return json(await cachedDashboard(share.client_id, b.since, b.until, false));
    }

    if (!(await requireAgency(req))) return json({ error: 'Solo miembros de la agencia' }, 403);
    const conn = await agencyConn();

    if (b.action === 'preview') {
      if (!validRange(b.since, b.until)) return json({ error: 'Rango de fechas inválido' }, 400);
      return json(await cachedDashboard(b.client_id, b.since, b.until, b.refresh));
    }
    if (!conn) return json({ connected: false, items: [] });
    if (b.action === 'businesses') {
      try {
        const items = await graphAll('me/businesses', { fields: 'id,name' }, conn.access_token, 100);
        return json({ connected: true, token_expires_at: conn.token_expires_at, items });
      } catch (e) { return json({ connected: false, error: (e as Error).message, items: [] }); }
    }
    if (b.action === 'ad_accounts') {
      try {
        const { data: settings } = await admin.from('client_dashboard_settings').select('*').eq('client_id', b.client_id).maybeSingle();
        const businessId = b.business_id || (settings ? await resolvePortfolio(settings, conn.access_token) : null);
        const items = businessId ? await businessAccounts(businessId, conn.access_token) : [];
        return json({ connected: true, business_id: businessId, items });
      } catch { return json({ connected: false, error: 'No se pudieron cargar las cuentas del portafolio.', items: [] }); }
    }
    if (b.action === 'save_settings') {
      const allowed = await businessAccounts(b.settings.business_id, conn.access_token);
      const selected = selectedPortfolioAccounts(b.settings.ad_account_ids, allowed);
      if (selected.length !== b.settings.ad_account_ids.length) return json({ error: 'Hay cuentas que no pertenecen al portafolio seleccionado.' }, 400);
      const { error } = await admin.from('client_dashboard_settings').upsert({ client_id: b.client_id, ...b.settings, updated_at: new Date().toISOString() });
      if (error) throw error;
      return json({ saved: true });
    }
    // campaigns
    const { data: stored } = await admin.from('client_dashboard_settings').select('*').eq('client_id', b.client_id).maybeSingle();
    const s = stored ? await scopedSettings(stored, conn.access_token) : null;
    const items: any[] = [];
    for (const raw of s?.ad_account_ids || []) {
      const act = raw.startsWith('act_') ? raw : `act_${raw}`;
      try {
        const rows = await graphAll(`${act}/campaigns`, { fields: 'id,name,objective,effective_status' }, conn.access_token);
        items.push(...rows.map((r: any) => ({ ...r, account_id: act, default_type: resultTypeFor(r.objective) })));
      } catch (e) { console.error('[client-dashboard] campaigns', (e as Error).message); }
    }
    return json({ connected: true, items });
  } catch (e) {
    console.error('[client-dashboard]', (e as Error).message);
    return json({ error: 'No se pudieron cargar los resultados' }, 500);
  }
});
