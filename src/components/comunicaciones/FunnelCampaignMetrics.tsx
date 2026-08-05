import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Megaphone, TrendingDown, Users, Wallet } from 'lucide-react';
import { useAgencyMetaCampaignAds } from '@/hooks/use-agency-meta';

interface Props {
  campaignId: string;
  campaignName?: string | null;
  /** Leads reales registrados en el funnel (opcional, para CPL real) */
  funnelLeads?: number;
}

const presets = [
  { value: 'today', label: 'Hoy' },
  { value: 'last_7d', label: 'Últimos 7 días' },
  { value: 'last_30d', label: 'Últimos 30 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'maximum', label: 'Todo' },
];

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: n < 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const FunnelCampaignMetrics = ({ campaignId, campaignName, funnelLeads }: Props) => {
  const [preset, setPreset] = useState('last_30d');
  const { data, isLoading } = useAgencyMetaCampaignAds(campaignId, preset);

  const totals = data?.totals;
  const ads = data?.ads || [];
  const maxLeads = Math.max(1, ...ads.map((a) => a.leads));
  const cpl = totals && totals.leads > 0 ? totals.spend / totals.leads : null;
  const realCpl = totals && funnelLeads && funnelLeads > 0 ? totals.spend / funnelLeads : null;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          {campaignName || 'Campaña de Meta'}
        </CardTitle>
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="w-[170px] h-8 rounded-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando métricas de Meta…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Leads (Meta)</p>
                <p className="text-2xl font-bold text-foreground">{totals?.leads ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Costo por lead</p>
                <p className="text-2xl font-bold text-foreground">{cpl != null ? money(cpl) : '—'}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Inversión</p>
                <p className="text-2xl font-bold text-foreground">{money(totals?.spend ?? 0)}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">CPL real (funnel)</p>
                <p className="text-2xl font-bold text-foreground">{realCpl != null ? money(realCpl) : '—'}</p>
                {funnelLeads != null && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{funnelLeads} leads en el funnel</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Leads por anuncio</p>
              <div className="space-y-2">
                {ads.map((ad) => (
                  <div key={ad.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-foreground truncate">{ad.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="rounded-full text-xs">{ad.leads} leads</Badge>
                        <Badge variant="outline" className="rounded-full text-xs">
                          CPL {ad.cpl != null ? money(ad.cpl) : '—'}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.round((ad.leads / maxLeads) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {money(ad.spend)} · {ad.impressions.toLocaleString()} impresiones · {ad.clicks.toLocaleString()} clics
                    </p>
                  </div>
                ))}
                {ads.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Sin datos de anuncios para este período.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
