import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Copy, ExternalLink, Loader2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResultsDashboard, type DashSection } from '@/components/client-dashboard/ResultsDashboard';
import { prettyCalendarToken } from '@/lib/calendar-share';
import { crToday } from '@/lib/dashboard-range';

const RESULT_TYPES = [['purchase', 'Compras'], ['messages', 'Conversaciones'], ['leads', 'Leads'], ['traffic', 'Visitas'], ['reach', 'Alcance']] as const;
type Settings = { ad_account_ids: string[]; visible_campaign_ids: string[] | null; result_overrides: Record<string, string>; currency: string; show_campaigns: boolean; show_accounts: boolean; show_leads: boolean; show_lead_names: boolean };
type Goal = { target: string; max_cost: string; min_roas: string };
const EMPTY: Settings = { ad_account_ids: [], visible_campaign_ids: null, result_overrides: {}, currency: 'USD', show_campaigns: true, show_accounts: true, show_leads: true, show_lead_names: false };

const invoke = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('client-dashboard', { body });
  if (error) throw error;
  return data;
};

export default function DashboardsClientes() {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState<string | null>(null);
  const [form, setForm] = useState<Settings>(EMPTY);
  const [goals, setGoals] = useState<Record<string, Goal>>({});
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<DashSection>('campanas');
  const month = `${crToday().slice(0, 7)}-01`;

  const { data: clients = [] } = useQuery({
    queryKey: ['dash-clients'], staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: cs }, { data: ss }] = await Promise.all([
        supabase.from('clients').select('id, name, logo_url').order('name'),
        supabase.from('client_dashboard_settings').select('client_id, ad_account_ids'),
      ]);
      return (cs ?? []).map((c) => ({ ...c, configured: (ss ?? []).some((s) => s.client_id === c.id && (s.ad_account_ids?.length ?? 0) > 0) }));
    },
  });
  const { data: accounts, isLoading: accLoading } = useQuery({ queryKey: ['dash-ad-accounts'], staleTime: 10 * 60_000, queryFn: () => invoke({ action: 'ad_accounts' }) });
  const { data: saved } = useQuery({
    queryKey: ['dash-settings', clientId], enabled: !!clientId,
    queryFn: async () => {
      const [{ data: s }, { data: g }] = await Promise.all([
        supabase.from('client_dashboard_settings').select('*').eq('client_id', clientId!).maybeSingle(),
        supabase.from('client_campaign_goals').select('*').eq('client_id', clientId!).eq('month', month),
      ]);
      return { s, g: g ?? [] };
    },
  });
  const { data: campaigns, isFetching: campLoading } = useQuery({
    queryKey: ['dash-campaigns', clientId, saved?.s?.ad_account_ids?.join(',')], enabled: !!clientId && (saved?.s?.ad_account_ids?.length ?? 0) > 0,
    staleTime: 5 * 60_000, queryFn: () => invoke({ action: 'campaigns', client_id: clientId }),
  });

  useEffect(() => {
    if (!saved) return;
    setForm(saved.s ? { ...EMPTY, ...(saved.s as any), result_overrides: (saved.s.result_overrides as any) ?? {} } : EMPTY);
    setGoals(Object.fromEntries(saved.g.map((g: any) => [g.result_type, { target: g.target?.toString() ?? '', max_cost: g.max_cost?.toString() ?? '', min_roas: g.min_roas?.toString() ?? '' }])));
  }, [saved]);

  const client = clients.find((c) => c.id === clientId);
  const visible = (id: string) => !form.visible_campaign_ids || form.visible_campaign_ids.length === 0 || form.visible_campaign_ids.includes(id);
  const toggleCampaign = (id: string, on: boolean) => {
    const all: string[] = (campaigns?.items ?? []).map((c: any) => c.id);
    const cur = form.visible_campaign_ids?.length ? form.visible_campaign_ids : all;
    const next = on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id);
    setForm({ ...form, visible_campaign_ids: next.length === all.length ? null : next });
  };

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('client_dashboard_settings').upsert({ client_id: clientId, ...form, updated_at: new Date().toISOString() });
      if (error) throw error;
      const rows = Object.entries(goals).filter(([, g]) => g.target || g.max_cost || g.min_roas)
        .map(([t, g]) => ({ client_id: clientId, month, result_type: t, target: g.target ? Number(g.target) : null, max_cost: g.max_cost ? Number(g.max_cost) : null, min_roas: g.min_roas ? Number(g.min_roas) : null }));
      await supabase.from('client_campaign_goals').delete().eq('client_id', clientId).eq('month', month);
      if (rows.length) { const { error: e2 } = await supabase.from('client_campaign_goals').insert(rows); if (e2) throw e2; }
      toast.success('Dashboard guardado');
      qc.invalidateQueries({ queryKey: ['dash-settings', clientId] });
      qc.invalidateQueries({ queryKey: ['dash-clients'] });
      qc.invalidateQueries({ queryKey: ['agency-dash-preview', clientId] });
    } catch (e) { toast.error((e as Error).message || 'No se pudo guardar'); } finally { setSaving(false); }
  };

  const shareUrl = async () => {
    if (!clientId || !client) return null;
    let { data } = await supabase.from('content_calendar_shares').select('token').eq('client_id', clientId).maybeSingle();
    if (!data) {
      const { data: ins, error } = await supabase.from('content_calendar_shares').insert({ client_id: clientId, token: prettyCalendarToken(client.name) }).select('token').single();
      if (error) { toast.error('No se pudo crear el enlace'); return null; }
      data = ins;
    }
    const origin = location.hostname.includes('lovable') || location.hostname === 'localhost' ? 'https://app.socialifycr.com' : location.origin;
    return `${origin}/calendario/${data.token}`;
  };
  const copy = async () => { const u = await shareUrl(); if (u) { await navigator.clipboard.writeText(u).catch(() => {}); toast.success('Enlace copiado'); } };
  const openAsClient = async () => { const u = await shareUrl(); if (u) window.open(`${u.replace('https://app.socialifycr.com', location.origin)}?tab=campanas`, '_blank'); };

  const fetcher = useMemo(() => (r: { since: string; until: string }) => invoke({ action: 'preview', client_id: clientId, ...r }), [clientId]);
  const box = 'rounded-2xl border border-border bg-card p-4';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><BarChart3 className="h-6 w-6 text-primary" />Dashboards de clientes</h1>
          <p className="text-sm text-muted-foreground">Lo que cada cliente ve en su enlace: calendario, campañas de Meta, cuentas y leads.</p>
        </div>
        <div className={`${box} flex flex-wrap items-center gap-3 text-sm`}>
          <span className={`h-2.5 w-2.5 rounded-full ${accounts?.connected ? 'bg-primary' : 'bg-destructive'}`} />
          {accLoading ? 'Revisando la conexión de Meta…' : accounts?.connected ? `Meta conectado · ${accounts.items.length} cuentas publicitarias` : 'La conexión de Meta de la agencia no responde. Reconectala en Ajustes.'}
          {accounts?.token_expires_at && <span className="text-muted-foreground">· vence {new Date(accounts.token_expires_at).toLocaleDateString('es-CR')}</span>}
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className={`${box} max-h-[70vh] space-y-1 overflow-y-auto p-2`}>
            {clients.map((c) => (
              <button key={c.id} type="button" onClick={() => setClientId(c.id)} className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm ${clientId === c.id ? 'bg-secondary font-semibold' : 'hover:bg-secondary/60'}`}>
                {c.logo_url ? <img src={c.logo_url} alt="" className="h-7 w-7 rounded-md object-contain" /> : <div className="h-7 w-7 rounded-md bg-secondary" />}
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {c.configured && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Configurado" />}
              </button>
            ))}
          </aside>

          {!client ? <div className={`${box} flex items-center justify-center text-sm text-muted-foreground`}>Elegí un cliente para configurar su dashboard.</div> : (
            <div className="min-w-0 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-auto text-xl font-bold">{client.name}</h2>
                <Button variant="outline" onClick={copy}><Copy className="mr-2 h-4 w-4" />Copiar enlace</Button>
                <Button variant="outline" onClick={openAsClient}><ExternalLink className="mr-2 h-4 w-4" />Ver como cliente</Button>
                <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar</Button>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className={box}>
                  <h3 className="mb-2 font-semibold">1. Cuentas publicitarias</h3>
                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {(accounts?.items ?? []).map((a: any) => (
                      <label key={a.id} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm">
                        <Checkbox checked={form.ad_account_ids.includes(a.id)} onCheckedChange={(v) => setForm({ ...form, ad_account_ids: v ? [...form.ad_account_ids, a.id] : form.ad_account_ids.filter((x) => x !== a.id) })} />
                        <span className="truncate">{a.name}</span><span className="ml-auto text-xs text-muted-foreground">{a.currency}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Guardá para cargar las campañas de las cuentas elegidas.</p>
                </section>

                <section className={box}>
                  <h3 className="mb-3 font-semibold">2. Qué ve el cliente</h3>
                  <div className="space-y-3 text-sm">
                    {([['show_campaigns', 'Campañas'], ['show_accounts', 'Cuentas y seguidores'], ['show_leads', 'Leads'], ['show_lead_names', 'Mostrar nombres de leads']] as const).map(([k, l]) => (
                      <label key={k} className="flex items-center justify-between gap-3"><span>{l}</span><Switch checked={form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} /></label>
                    ))}
                    <div className="flex items-center justify-between gap-3"><span>Moneda</span>
                      <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="CRC">Colones (₡)</SelectItem></SelectContent></Select>
                    </div>
                  </div>
                </section>
              </div>

              <section className={box}>
                <div className="mb-2 flex items-center gap-2"><h3 className="font-semibold">3. Campañas visibles y resultado</h3>{campLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}</div>
                {(campaigns?.items ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{form.ad_account_ids.length ? 'Sin campañas (o guardá primero las cuentas).' : 'Elegí al menos una cuenta publicitaria.'}</p> : (
                  <div className="max-h-80 divide-y divide-border overflow-y-auto">
                    {(campaigns.items as any[]).map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                        <Checkbox checked={visible(c.id)} onCheckedChange={(v) => toggleCampaign(c.id, !!v)} />
                        <span className={`h-2 w-2 rounded-full ${c.effective_status === 'ACTIVE' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <Select value={form.result_overrides[c.id] ?? 'auto'} onValueChange={(v) => { const o = { ...form.result_overrides }; if (v === 'auto') delete o[c.id]; else o[c.id] = v; setForm({ ...form, result_overrides: o }); }}>
                          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto · {RESULT_TYPES.find((t) => t[0] === c.default_type)?.[1]}</SelectItem>
                            {RESULT_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={box}>
                <h3 className="mb-1 font-semibold">4. Metas de este mes</h3>
                <p className="mb-3 text-xs text-muted-foreground">Solo llená los tipos de resultado que usa este cliente. Montos en la moneda elegida.</p>
                <div className="grid gap-2">
                  <div className="hidden grid-cols-[1fr_repeat(3,110px)] gap-2 text-xs text-muted-foreground sm:grid"><span /><span>Cantidad</span><span>Costo máx.</span><span>ROAS mín.</span></div>
                  {RESULT_TYPES.map(([t, l]) => {
                    const g = goals[t] ?? { target: '', max_cost: '', min_roas: '' };
                    const set = (k: keyof Goal, v: string) => setGoals({ ...goals, [t]: { ...g, [k]: v } });
                    return (
                      <div key={t} className="grid grid-cols-3 items-center gap-2 sm:grid-cols-[1fr_repeat(3,110px)]">
                        <span className="col-span-3 text-sm font-medium sm:col-span-1">{l}</span>
                        <Input inputMode="numeric" placeholder="Cantidad" value={g.target} onChange={(e) => set('target', e.target.value)} />
                        <Input inputMode="decimal" placeholder="Costo máx." value={g.max_cost} onChange={(e) => set('max_cost', e.target.value)} />
                        <Input inputMode="decimal" placeholder={t === 'purchase' ? 'ROAS' : '—'} disabled={t !== 'purchase'} value={g.min_roas} onChange={(e) => set('min_roas', e.target.value)} />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-auto font-semibold">Vista previa del cliente</h3>
                  {(['campanas', 'cuentas', 'leads'] as const).map((s) => <Button key={s} size="sm" variant={section === s ? 'default' : 'outline'} onClick={() => setSection(s)}>{s === 'campanas' ? 'Campañas' : s === 'cuentas' ? 'Cuentas' : 'Leads'}</Button>)}
                  <Button size="sm" variant="ghost" aria-label="Actualizar desde Meta" onClick={async () => { await invoke({ action: 'preview', client_id: clientId, ...{ since: `${crToday().slice(0, 7)}-01`, until: crToday() }, refresh: true }); qc.invalidateQueries({ queryKey: ['agency-dash-preview', clientId] }); }}><RefreshCw className="h-4 w-4" /></Button>
                </div>
                <ResultsDashboard key={clientId} section={section} cacheKey={['agency-dash-preview', clientId]} fetcher={fetcher} />
              </section>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
