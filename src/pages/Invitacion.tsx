import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle, Mail, Lock, User } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

interface InvitationData {
  id: string;
  email: string;
  role: string;
  client_id: string;
  client_name?: string;
}

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
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

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
        .maybeSingle();

      if (error) {
        console.error('Error fetching invitation:', error);
        setError('Error al validar la invitación.');
        return;
      }

      if (!data) {
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
      setEmail(data.email);
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Error al validar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (isSignUp: boolean) => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (isSignUp && !fullName.trim()) {
      newErrors.fullName = 'El nombre es requerido';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const acceptInvitation = async () => {
    if (!token) return false;
    
    try {
      const { data, error } = await supabase.rpc('accept_client_invitation', {
        _token: token,
      });
      
      if (error) {
        console.error('Error accepting invitation:', error);
        toast({
          title: 'Error',
          description: 'No se pudo aceptar la invitación. Puede que ya haya sido usada.',
          variant: 'destructive',
        });
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error in acceptInvitation:', err);
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(true)) return;
    
    setSubmitting(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast({
            title: 'Usuario existente',
            description: 'Este email ya está registrado. Usa la pestaña "Iniciar Sesión".',
            variant: 'destructive',
          });
          return;
        }
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // Accept the invitation using the secure backend function
      const accepted = await acceptInvitation();
      
      if (accepted) {
        setSuccess(true);
        toast({
          title: '¡Cuenta creada!',
          description: 'Tu cuenta ha sido creada y ya tienes acceso al cliente.',
        });
        setTimeout(() => navigate('/'), 2000);
      }
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(false)) return;
    
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        let message = 'Error al iniciar sesión';
        if (signInError.message.includes('Invalid login credentials')) {
          message = 'Credenciales inválidas. Verifica tu email y contraseña.';
        }
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      // Accept the invitation using the secure backend function
      const accepted = await acceptInvitation();
      
      if (accepted) {
        setSuccess(true);
        toast({
          title: '¡Bienvenido!',
          description: 'Has sido agregado al cliente exitosamente.',
        });
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err: any) {
      console.error('Error in signin:', err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo iniciar sesión.',
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
              Ya tienes acceso a {invitation?.client_name}. Redirigiendo al dashboard...
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
          <CardTitle className="text-2xl font-bold">
            Invitación a {invitation?.client_name || 'Cliente'}
          </CardTitle>
          <CardDescription>
            Crea una cuenta o inicia sesión para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="register" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            </TabsList>
            
            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
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
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {formErrors.password && <p className="text-sm text-destructive">{formErrors.password}</p>}
                </div>
                
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {formErrors.password && <p className="text-sm text-destructive">{formErrors.password}</p>}
                </div>
                
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invitacion;