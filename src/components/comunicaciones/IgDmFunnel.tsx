import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Instagram, Loader2, Eye, MessageCircle, CalendarCheck, DollarSign, AlertCircle } from 'lucide-react';

type Range = '7' | '14' | '30' | 'month' | '90';

interface FunnelData {
  connected: boolean;
  error?: string;
  currency?: string;
  campaigns?: { id: string; name: string; status: string; objective?: string }[];
  adsets?: { id: string; name: string; status: string }[];
  activeWindow?: { since: string; until: string; days: number } | null;
  totals?: {
    spendUsd: number; reach: number; impressions: number; clicks: number;
    messages: number; newChats: number; appointments: number; appointmentsFromChat: number; cancelled: number;
  };
}

const usd = (v: number | null) =>
  v == null || !isFinite(v) ? '—' : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v: number) => v.toLocaleString('es-CR');
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');

function rangeDates(r: Range) {
  const today = new Date();
  const since = r === 'month' ? startOfMonth(today) : subDays(today, Number(r) - 1);
  return { since: format(since, 'yyyy-MM-dd'), until: format(today, 'yyyy-MM-dd') };
}

export function IgDmFunnel() {
  const [range, setRange] = useState<Range>('30');
  const [campaignId, setCampaignId] = useState<string>('all');
  const [adsetId, setAdsetId] = useState<string>('all');
  const { since, until } = useMemo(() => rangeDates(range), [range]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['ig-dm-funnel', since, until, campaignId, adsetId],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FunnelData> => {
      const { data, error } = await supabase.functions.invoke('agency-meta', {
        body: {
          action: 'ig-dm-funnel', since, until,
          campaignId: campaignId === 'all' ? null : campaignId,
          adsetId: adsetId === 'all' ? null : adsetId,
        },
      });
      if (error) throw error;
      return data as FunnelData;
    },
  });

  const t = data?.totals;
  const spend = t?.spendUsd ?? 0;
  const stages = t ? [
    { key: 'spend', label: 'Invertido', value: usd(spend), raw: 1, icon: DollarSign, cost: null as string | null, conv: null as string | null },
    { key: 'reach', label: 'Personas alcanzadas', value: num(t.reach), raw: t.reach, icon: Eye, cost: `${usd(t.reach ? (spend / t.reach) * 1000 : null)} por cada 1.000`, conv: null },
    { key: 'msgs', label: 'Mensajes', value: num(t.messages), raw: t.messages, icon: MessageCircle, cost: `${usd(t.messages ? spend / t.messages : null)} por mensaje`, conv: `${pct(t.messages, t.reach)} de los alcanzados` },
    { key: 'appts', label: 'Agendas (Calendly)', value: num(t.appointments), raw: t.appointments, icon: CalendarCheck, cost: `${usd(t.appointments ? spend / t.appointments : null)} por agenda`, conv: `${pct(t.appointments, t.messages)} de los mensajes` },
  ] : [];

  const widths = [100, 82, 62, 42];
  const campaigns = data?.campaigns ?? [];

  return (
    <div className="agency-card rounded-2xl border border-border bg-card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Funnel IG DM</h2>
            <p className="text-xs text-muted-foreground">Campañas de mensajes de Socialify CR · montos en USD</p>
          </div>
        </div>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="14">Últimos 14 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaignId} onValueChange={(v) => { setCampaignId(v); setAdsetId('all'); }}>
          <SelectTrigger><SelectValue placeholder="Campaña" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las campañas de mensajes</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}{c.status !== 'ACTIVE' ? ' · pausada' : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={adsetId} onValueChange={setAdsetId} disabled={campaignId === 'all'}>
          <SelectTrigger><SelectValue placeholder="Conjunto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los conjuntos</SelectItem>
            {(data?.adsets ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data?.connected && !data.error && (
        <p className="text-xs text-muted-foreground">
          {data.activeWindow
            ? `Agendas y chats contados solo del ${data.activeWindow.since} al ${data.activeWindow.until} (${data.activeWindow.days} días con la campaña activa).`
            : 'La campaña no tuvo gasto en este período, así que no se cuentan agendas ni chats.'}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error || data?.error ? (
        <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{data?.error || (error as Error)?.message}</div>
      ) : data && !data.connected ? (
        <p className="text-sm text-muted-foreground">Conectá la cuenta publicitaria de la agencia en Meta para ver este funnel.</p>
      ) : t ? (
        <>
          <div className="flex flex-col items-center gap-2">
            {stages.map((s, i) => (
              <div key={s.key} className="w-full flex flex-col items-center">
                <div
                  className="relative rounded-xl px-4 py-3 text-primary-foreground transition-all"
                  style={{
                    width: `${widths[i]}%`,
                    background: `hsl(var(--primary) / ${1 - i * 0.18})`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <s.icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium truncate">{s.label}</span>
                    </div>
                    <span className="text-lg sm:text-2xl font-bold tabular-nums">{s.value}</span>
                  </div>
                  {s.cost && <div className="text-[11px] sm:text-xs opacity-90 mt-0.5 text-right">{s.cost}</div>}
                </div>
                {stages[i + 1]?.conv && (
                  <div className="text-[11px] text-muted-foreground py-1">↓ {stages[i + 1].conv}</div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Costo por mil alcanzados" value={usd(t.reach ? (spend / t.reach) * 1000 : null)} />
            <Kpi label="Costo por mensaje" value={usd(t.messages ? spend / t.messages : null)} />
            <Kpi label="Costo por agenda" value={usd(t.appointments ? spend / t.appointments : null)} highlight />
            <Kpi label="Agendas ligadas a un chat" value={`${t.appointmentsFromChat} de ${t.appointments}`} />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Agendas: citas de Calendly creadas en el período (sin canceladas{t.cancelled ? `, ${t.cancelled} cancelada${t.cancelled > 1 ? 's' : ''} excluida${t.cancelled > 1 ? 's' : ''}` : ''}); son de toda la agencia, no solo de la campaña elegida.
            {data?.currency === 'CRC' && ' Inversión convertida de colones a 520 CRC/USD.'}
          </p>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-primary bg-primary/10' : 'border-border bg-background/50'}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}
