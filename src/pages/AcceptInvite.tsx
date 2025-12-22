import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

interface InvitationData {
  id: string;
  email: string;
  role: string;
  client_id: string;
  client_name?: string;
}

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No se encontró el token de invitación.');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from('client_invitations')
        .select(`
          id,
          email,
          role,
          client_id,
          clients:client_id (name)
        `)
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Esta invitación no es válida o ha expirado.');
        return;
      }

      setInvitation({
        id: data.id,
        email: data.email,
        role: data.role,
        client_id: data.client_id,
        client_name: (data.clients as any)?.name,
      });
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Error al validar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setPasswordError(passwordResult.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    if (!invitation) return;

    setSubmitting(true);
    try {
      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName || invitation.email,
          },
        },
      });

      if (signUpError) {
        // Check if user already exists
        if (signUpError.message.includes('already registered')) {
          toast({
            title: 'Usuario existente',
            description: 'Este email ya está registrado. Por favor inicia sesión.',
            variant: 'destructive',
          });
          navigate('/auth');
          return;
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // Add user to client team
      const { error: teamError } = await supabase
        .from('client_team_members')
        .insert({
          client_id: invitation.client_id,
          user_id: authData.user.id,
          role: invitation.role as any,
        });

      if (teamError) {
        console.error('Error adding to team:', teamError);
        // Continue anyway - user was created
      }

      // Mark invitation as accepted
      await supabase
        .from('client_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      setSuccess(true);
      toast({
        title: '¡Cuenta creada!',
        description: 'Tu cuenta ha sido creada exitosamente.',
      });

      // Redirect after a short delay
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo crear la cuenta.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invitación Inválida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Ir a Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>¡Bienvenido!</CardTitle>
            <CardDescription>
              Tu cuenta ha sido creada. Redirigiendo al dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Acepta tu Invitación</CardTitle>
          <CardDescription>
            Has sido invitado a {invitation?.client_name || 'un cliente'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                required
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Cuenta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
