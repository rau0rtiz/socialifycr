import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import loginBanner from '@/assets/login-banner.jpg';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

// Quick demo seller shortcut: user "vender" + pass "pass" -> real credentials behind the scenes
const QUICK_USER = 'vender';
const QUICK_PASS = 'pass';
const QUICK_EMAIL = 'vender@socialify.local';
const QUICK_REAL_PASS = 'QuickSeller!2026';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const isQuickShortcut = (e: string, p: string) =>
    e.trim().toLowerCase() === QUICK_USER && p === QUICK_PASS;

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    // Skip validation when using the quick demo shortcut
    if (mode === 'login' && isQuickShortcut(email, password)) {
      setErrors({});
      return true;
    }

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (mode === 'login') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const useQuick = isQuickShortcut(email, password);
    const realEmail = useQuick ? QUICK_EMAIL : email;
    const realPassword = useQuick ? QUICK_REAL_PASS : password;

    setIsLoading(true);
    const { error } = await signIn(realEmail, realPassword);
    setIsLoading(false);

    if (error) {
      let message = 'Error al iniciar sesión';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Credenciales inválidas. Verifica tu email y contraseña.';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Por favor confirma tu email antes de iniciar sesión.';
      }
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } else {
      toast({ title: 'Bienvenido', description: 'Has iniciado sesión correctamente.' });
      navigate('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Correo enviado',
        description: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
      });
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background banner */}
      <div className="absolute inset-0 z-0">
        <img src={loginBanner} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 backdrop-blur-sm bg-background/70" />
      </div>

      {/* Card */}
      <Card className="w-full max-w-md relative z-10 mx-4 border-border/50 shadow-2xl bg-card/95 backdrop-blur-md">
        <CardHeader className="text-center pb-2">
          <img
            src="https://chqhyqylnbtwyzhjkxlu.supabase.co/storage/v1/object/public/content-images/imgdb/general/1779672210058-logo___SLOGAN.png"
            alt="Socialify"
            className="mx-auto h-24 w-auto object-contain"
            loading="eager"
            decoding="async"
          />
        </CardHeader>

        <CardContent>
          {mode === 'login' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="text"
                    autoComplete="username"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Sesión
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full text-muted-foreground"
                onClick={() => { setMode('forgot'); setErrors({}); }}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar enlace
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full text-muted-foreground"
                onClick={() => { setMode('login'); setErrors({}); }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver a iniciar sesión
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
