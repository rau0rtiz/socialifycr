import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Facebook, Instagram, CreditCard, Loader2 } from 'lucide-react';

interface Page {
  id: string;
  name: string;
  access_token: string;
}

interface InstagramAccount {
  pageId: string;
  pageName: string;
  instagramId: string;
  pageAccessToken: string;
}

interface AdAccount {
  id: string;
  name: string;
}

interface MetaAccountsData {
  pages: Page[];
  instagramAccounts: InstagramAccount[];
  adAccounts: AdAccount[];
  accessToken: string;
  tokenExpiresAt: string;
}

interface MetaAccountSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountsData: MetaAccountsData | null;
  clientId: string;
  onSave: (selectedAccounts: {
    pageId: string;
    pageName: string;
    pageAccessToken: string;
    instagramId: string | null;
    adAccountId: string | null;
  }) => Promise<void>;
}

export const MetaAccountSelector = ({
  open,
  onOpenChange,
  accountsData,
  clientId,
  onSave,
}: MetaAccountSelectorProps) => {
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedInstagramId, setSelectedInstagramId] = useState<string>('');
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Reset selections when dialog opens with new data
  useEffect(() => {
    if (accountsData && open) {
      setSelectedPageId('');
      setSelectedInstagramId('');
      setSelectedAdAccountId('');
    }
  }, [accountsData, open]);

  // Get Instagram accounts filtered by selected page
  const filteredInstagramAccounts = accountsData?.instagramAccounts.filter(
    (ig) => ig.pageId === selectedPageId
  ) || [];

  // Auto-select Instagram if only one option for selected page
  useEffect(() => {
    if (filteredInstagramAccounts.length === 1) {
      setSelectedInstagramId(filteredInstagramAccounts[0].instagramId);
    } else if (filteredInstagramAccounts.length === 0) {
      setSelectedInstagramId('');
    }
  }, [selectedPageId, filteredInstagramAccounts]);

  const handleSave = async () => {
    if (!selectedPageId || !accountsData) return;

    const selectedPage = accountsData.pages.find(p => p.id === selectedPageId);
    if (!selectedPage) return;

    setSaving(true);
    try {
      await onSave({
        pageId: selectedPageId,
        pageName: selectedPage.name,
        pageAccessToken: selectedPage.access_token,
        instagramId: selectedInstagramId || null,
        adAccountId: selectedAdAccountId || null,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!accountsData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Cuentas de Meta</DialogTitle>
          <DialogDescription>
            Selecciona las cuentas que deseas conectar a este cliente. Tienes{' '}
            {accountsData.pages.length} páginas, {accountsData.instagramAccounts.length} cuentas de Instagram
            y {accountsData.adAccounts.length} cuentas publicitarias disponibles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Facebook Page Selection */}
          <div className="space-y-2">
            <Label htmlFor="page" className="flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-500" />
              Página de Facebook *
            </Label>
            <Select value={selectedPageId} onValueChange={setSelectedPageId}>
              <SelectTrigger id="page">
                <SelectValue placeholder="Selecciona una página" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {accountsData.pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Instagram Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="instagram" className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-500" />
              Cuenta de Instagram
              {selectedPageId && filteredInstagramAccounts.length === 0 && (
                <span className="text-xs text-muted-foreground">(No hay cuenta vinculada a esta página)</span>
              )}
            </Label>
            <Select 
              value={selectedInstagramId} 
              onValueChange={setSelectedInstagramId}
              disabled={!selectedPageId || filteredInstagramAccounts.length === 0}
            >
              <SelectTrigger id="instagram">
                <SelectValue placeholder={
                  !selectedPageId 
                    ? "Primero selecciona una página" 
                    : filteredInstagramAccounts.length === 0
                    ? "No hay cuenta de Instagram vinculada"
                    : "Selecciona una cuenta de Instagram"
                } />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {filteredInstagramAccounts.map((ig) => (
                  <SelectItem key={ig.instagramId} value={ig.instagramId}>
                    Instagram de {ig.pageName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ad Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="adAccount" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-500" />
              Cuenta Publicitaria
            </Label>
            <Select value={selectedAdAccountId} onValueChange={setSelectedAdAccountId}>
              <SelectTrigger id="adAccount">
                <SelectValue placeholder="Selecciona una cuenta publicitaria (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {accountsData.adAccounts.map((ad) => (
                  <SelectItem key={ad.id} value={ad.id}>
                    {ad.name || ad.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedPageId || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Conectar Cuentas Seleccionadas'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
