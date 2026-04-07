import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Linkedin, Building2, User } from 'lucide-react';

interface LinkedInAccount {
  id: string;
  urn: string;
  name: string;
  logoUrl: string | null;
  type?: 'personal' | 'organization';
}

interface LinkedInOrgSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: LinkedInAccount[];
  onSelect: (org: LinkedInAccount) => void;
  loading: boolean;
  message?: string;
}

export const LinkedInOrgSelector = ({
  open,
  onOpenChange,
  organizations,
  onSelect,
  loading,
  message,
}: LinkedInOrgSelectorProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-700" />
            Seleccionar Cuenta de LinkedIn
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Seleccioná tu perfil personal o una página de empresa para vincular.
        </p>

        <div className="space-y-2">
          {message && (
            <p className="text-sm text-muted-foreground text-center py-4">{message}</p>
          )}

          {organizations.map((account) => (
            <Button
              key={account.id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => onSelect(account)}
              disabled={loading}
            >
              {account.logoUrl ? (
                <img
                  src={account.logoUrl}
                  alt={account.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {account.type === 'personal' ? (
                    <User className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-medium">{account.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {account.type === 'personal' ? 'Perfil personal' : 'Página de empresa'}
                </Badge>
              </div>
            </Button>
          ))}

          {organizations.length === 0 && !message && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se encontraron cuentas de LinkedIn.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
