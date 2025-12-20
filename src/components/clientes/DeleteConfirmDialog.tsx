import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onConfirm: () => void;
}

export const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  clientName,
  onConfirm,
}: DeleteConfirmDialogProps) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleVerifyAndDelete = async () => {
    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setError('No se pudo obtener la información del usuario');
        setIsVerifying(false);
        return;
      }

      // Re-authenticate by signing in with password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        setError('Contraseña incorrecta');
        setIsVerifying(false);
        return;
      }

      // Password verified, proceed with deletion
      toast({
        title: 'Verificación exitosa',
        description: 'Procediendo a eliminar el cliente...',
      });

      onConfirm();
      handleClose();
    } catch (err) {
      setError('Error al verificar la contraseña');
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setIsVerifying(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Estás a punto de eliminar el cliente <strong>"{clientName}"</strong>. 
              Esta acción no se puede deshacer.
            </p>
            <p>
              Por seguridad, ingresa tu contraseña para confirmar esta acción.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleVerifyAndDelete();
              }
            }}
            className="mt-2"
            disabled={isVerifying}
          />
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isVerifying}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleVerifyAndDelete();
            }}
            disabled={isVerifying || !password.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Eliminar Cliente'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
