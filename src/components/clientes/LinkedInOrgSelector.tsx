import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Linkedin, Building2 } from 'lucide-react';

interface LinkedInOrg {
  id: string;
  urn: string;
  name: string;
  logoUrl: string | null;
}

interface LinkedInOrgSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: LinkedInOrg[];
  onSelect: (org: LinkedInOrg) => void;
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
            Seleccionar Página de Empresa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {message && (
            <p className="text-sm text-muted-foreground text-center py-4">{message}</p>
          )}

          {organizations.map((org) => (
            <Button
              key={org.id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => onSelect(org)}
              disabled={loading}
            >
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="font-medium">{org.name}</span>
            </Button>
          ))}

          {organizations.length === 0 && !message && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se encontraron páginas de empresa.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
