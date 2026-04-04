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
import { useAuditLog } from '@/hooks/use-audit-log';
import { Copy, Check, Loader2, Mail, User, Send, CheckCircle } from 'lucide-react';
import { z } from 'zod';

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onInviteCreated: () => void;
}

const emailSchema = z.string().trim().email('Por favor ingresa un email válido');
const nameSchema = z.string().trim().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo');

export const InviteClientDialog = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onInviteCreated,
}: InviteClientDialogProps) => {
  const [email, setEmail] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [role, setRole] = useState<string>('viewer');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; name?: string }>({});
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const validateForm = () => {
    const newErrors: { email?: string; name?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const nameResult = nameSchema.safeParse(inviteeName);
    if (!nameResult.success) {
      newErrors.name = nameResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendInvite = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-client-invitation', {
        body: {
          clientId,
          email: email.trim().toLowerCase(),
          role,
          inviteeName: inviteeName.trim(),
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setInviteLink(data.inviteLink);
      setSuccess(true);
      onInviteCreated();

      await logAction({
        action: 'team_member.add',
        entityType: 'team_member',
        entityName: inviteeName.trim() || email.trim(),
        details: { client_id: clientId, client_name: clientName, email: email.trim(), role },
      });

      if (data.emailSent) {
        toast({
          title: 'Invitación enviada',
          description: `Se ha enviado un email de invitación a ${email}`,
        });
      } else {
        toast({
          title: 'Invitación creada',
          description: 'La invitación fue creada pero no se pudo enviar el email. Copia el enlace manualmente.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar la invitación.',
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
    setInviteeName('');
    setRole('viewer');
    setInviteLink(null);
    setSuccess(false);
    setCopied(false);
    setErrors({});
    onOpenChange(false);
  };

  const roleLabels: Record<string, string> = {
    account_manager: 'Account Manager',
    editor: 'Editor',
    viewer: 'Viewer',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitar Miembro
          </DialogTitle>
          <DialogDescription>
            Envía una invitación por email para unirse a {clientName}
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitee-name">Nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invitee-name"
                  type="text"
                  placeholder="Nombre del invitado"
                  value={inviteeName}
                  onChange={(e) => {
                    setInviteeName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className="pl-10"
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
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
              <p className="text-xs text-muted-foreground">
                {role === 'account_manager' && 'Acceso completo para gestionar el cliente'}
                {role === 'editor' && 'Puede editar contenido y ver métricas'}
                {role === 'viewer' && 'Solo puede ver métricas y reportes'}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleSendInvite} disabled={loading || !email || !inviteeName}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar Invitación
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">¡Invitación Enviada!</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Se ha enviado un email a <strong>{email}</strong> con las instrucciones para unirse.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Enlace de respaldo</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink || ''}
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
                También puedes compartir este enlace directamente. Expira en 7 días.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
