import { useState, useEffect } from 'react';
import { Client } from '@/pages/Clientes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/use-audit-log';
import { Loader2 } from 'lucide-react';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  client?: Client | null;
}

export const ClientFormDialog = ({
  open,
  onOpenChange,
  onSuccess,
  client,
}: ClientFormDialogProps) => {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('220 70% 50%');
  const [accentColor, setAccentColor] = useState('262 83% 58%');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const isEditing = !!client;

  useEffect(() => {
    if (client) {
      setName(client.name);
      setIndustry(client.industry || '');
      setLogoUrl(client.logo_url || '');
      setPrimaryColor(client.primary_color);
      setAccentColor(client.accent_color);
    } else {
      setName('');
      setIndustry('');
      setLogoUrl('');
      setPrimaryColor('220 70% 50%');
      setAccentColor('262 83% 58%');
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del cliente es requerido.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const clientData = {
      name: name.trim(),
      industry: industry.trim() || null,
      logo_url: logoUrl.trim() || null,
      primary_color: primaryColor,
      accent_color: accentColor,
    };

    if (isEditing) {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', client.id);

      if (error) {
        console.error('Error updating client:', error);
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el cliente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Cliente actualizado',
          description: 'El cliente ha sido actualizado correctamente.',
        });
        onSuccess();
      }
    } else {
      const { error } = await supabase
        .from('clients')
        .insert([clientData]);

      if (error) {
        console.error('Error creating client:', error);
        toast({
          title: 'Error',
          description: 'No se pudo crear el cliente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Cliente creado',
          description: 'El cliente ha sido creado correctamente.',
        });
        onSuccess();
      }
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industria</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Ej: Tecnología, Retail, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL del Logo</Label>
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Primario (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="220 70% 50%"
                />
                <div
                  className="w-10 h-10 rounded border flex-shrink-0"
                  style={{ backgroundColor: `hsl(${primaryColor})` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Color Acento (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="262 83% 58%"
                />
                <div
                  className="w-10 h-10 rounded border flex-shrink-0"
                  style={{ backgroundColor: `hsl(${accentColor})` }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
