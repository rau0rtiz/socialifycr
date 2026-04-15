import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle, Lock, User, Mail } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

interface InvitationData {
  email: string;
  role: string;
  client_id: string;
  client_name: string;
  invitee_name: string | null;
}

const roleLabels: Record<string, string> = {
  account_manager: 'Account Manager',
  editor: 'Editor',
  viewer: 'Viewer',
  media_buyer: 'Media Buyer',
  closer: 'Closer',
  setter: 'Setter',
};

const Invitacion = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<{ password?: string; fullName?: string }>({});

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
      const { data, error } = await supabase.rpc('get_client_invitation_public', {
        _token: token,
      });

      if (error || !data || data.length === 0) {
        setError('Esta invitación no es válida o ha expirado.');
        return;
      }

      const inviteData = data[0];
      setInvitation({
        email: inviteData.email,
        role: inviteData.role,
        client_id: inviteData.client_id,
        client_name: inviteData.client_name,
        invitee_name: inviteData.invitee_name,
      });
      setEmail(inviteData.email);
      if (inviteData.invitee_name) {
        setFullName(inviteData.invitee_name);
      }
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Error al validar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { password?: string; fullName?: string } = {};
    if (!fullName.trim()) newErrors.fullName = 'El nombre es requerido';
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) newErrors.password = pwResult.error.errors[0].message;
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      // Sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast({
            title: 'Usuario existente',
            description: 'Este email ya está registrado. Intenta iniciar sesión desde la página principal.',
            variant: 'destructive',
          });
          return;
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // Invitation is auto-accepted by database trigger on user creation

      setSuccess(true);
    } catch (err: any) {
      console.error('Error in signup:', err);
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
          <CardHeader className="text-center space-y-3">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <CardTitle className="text-2xl">¡Cuenta creada con éxito!</CardTitle>
            <CardDescription className="text-base">
              Gracias {fullName || 'por registrarte'}. Ya tienes acceso a <strong>{invitation?.client_name}</strong> como <strong>{roleLabels[invitation?.role || 'viewer']}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" onClick={() => navigate('/')}>
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Crear tu cuenta
          </CardTitle>
          <CardDescription>
            {invitation?.invitee_name && (
              <span className="block">Hola {invitation.invitee_name},</span>
            )}
            Has sido invitado a <strong>{invitation?.client_name}</strong> como <strong>{roleLabels[invitation?.role || 'viewer']}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">Nombre Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Tu nombre"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                />
              </div>
              {formErrors.fullName && <p className="text-sm text-destructive">{formErrors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  value={email}
                  readOnly
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                El email está vinculado a esta invitación
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              {formErrors.password && <p className="text-sm text-destructive">{formErrors.password}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Cuenta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invitacion;
