import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Facebook, Link2, RefreshCw, Unlink, Loader2, BarChart3 } from 'lucide-react';
import {
  useAgencyMetaCampaigns,
  useAgencyMetaConnect,
  useAgencyMetaStatus,
} from '@/hooks/use-agency-meta';

export const AgencyMetaConnection = () => {
  const { data: status, isLoading } = useAgencyMetaStatus();
  const { connecting, accountsData, setAccountsData, startConnect, saveAccount, disconnect } = useAgencyMetaConnect();
  const [showCampaigns, setShowCampaigns] = useState(false);
  const { data: campaignsData, isFetching, refetch } = useAgencyMetaCampaigns(!!status && showCampaigns);

  const connected = !!status?.ad_account_id;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Meta de la agencia
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Conecta la cuenta publicitaria de Socialify para trackear campañas y vincularlas a cada funnel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : connected ? (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{status?.ad_account_name || 'Cuenta publicitaria'}</p>
                    <Badge className="text-xs">Conectado</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {status?.ad_account_id}
                    {status?.user_name ? ` · ${status.user_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setShowCampaigns(true);
                      refetch();
                    }}
                  >
                    <BarChart3 className="h-4 w-4" /> Campañas
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={startConnect} disabled={connecting}>
                    <RefreshCw className={`h-4 w-4 ${connecting ? 'animate-spin' : ''}`} /> Reconectar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive"
                    onClick={() => disconnect.mutate()}
                    disabled={disconnect.isPending}
                  >
                    <Unlink className="h-4 w-4" /> Desconectar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Aún no hay una cuenta de Meta conectada para la agencia.
              </p>
              <Button onClick={startConnect} disabled={connecting} className="gap-2">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Conectar Meta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad account selector after OAuth */}
      <Dialog open={!!accountsData} onOpenChange={(o) => !o && setAccountsData(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elegí la cuenta publicitaria</DialogTitle>
            <DialogDescription>Se usará para trackear las campañas de la agencia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(accountsData?.adAccounts || []).map((acc) => (
              <button
                key={acc.id}
                onClick={() => saveAccount.mutate({ adAccountId: acc.id, adAccountName: acc.name })}
                disabled={saveAccount.isPending}
                className="w-full text-left rounded-xl border border-border p-3 hover:border-primary/60 hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-sm text-foreground">{acc.name}</p>
                <p className="text-xs text-muted-foreground">{acc.id}</p>
              </button>
            ))}
            {accountsData && (accountsData.adAccounts || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No se encontraron cuentas publicitarias en esta cuenta de Meta.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaigns overview */}
      <Dialog open={showCampaigns} onOpenChange={setShowCampaigns}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Campañas de la agencia</DialogTitle>
            <DialogDescription>Últimos 30 días · {status?.ad_account_name}</DialogDescription>
          </DialogHeader>
          {isFetching ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando campañas…
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {(campaignsData?.campaigns || []).map((c) => (
                <div key={c.id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.status} {c.objective ? `· ${c.objective}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <span>${(c.spend || 0).toLocaleString()}</span>
                    <span>{(c.leads || 0)} leads</span>
                    <span>{(c.clicks || 0)} clics</span>
                  </div>
                </div>
              ))}
              {(campaignsData?.campaigns || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">No hay campañas para mostrar.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
