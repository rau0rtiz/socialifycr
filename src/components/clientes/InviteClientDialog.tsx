import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Loader2 } from 'lucide-react';
import { z } from 'zod';

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onInviteCreated: () => void;
}

const emailSchema = z.string().trim().email('Por favor ingresa un email válido');

export const InviteClientDialog = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onInviteCreated,
}: InviteClientDialogProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'account_manager' | 'editor' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateInvite = async () => {
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      return;
    }
    setEmailError(null);

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('client_invitations')
        .insert({
          client_id: clientId,
          email: emailResult.data,
          role,
          invited_by: userData.user.id,
        })
        .select('token')
        .single();

      if (error) throw error;

      // Use the cleaner path-based URL format
      const link = `${window.location.origin}/invitacion/${data.token}`;
      setInviteLink(link);
      onInviteCreated();
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la invitación.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      title: 'Enlace copiado',
      description: 'El enlace de invitación ha sido copiado al portapapeles.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail('');
    setRole('viewer');
    setInviteLink(null);
    setCopied(false);
    setEmailError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Cliente</DialogTitle>
          <DialogDescription>
            Genera un enlace de invitación para {clientName}
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email del cliente</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleCreateInvite} disabled={loading || !email}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar Enlace
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enlace de invitación</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este enlace expira en 7 días. Compártelo con el cliente por email o mensaje.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
