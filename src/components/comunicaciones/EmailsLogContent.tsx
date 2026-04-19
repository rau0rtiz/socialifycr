import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Send, Search, Filter, Eye, CheckCircle, XCircle, Loader2, Camera, MailOpen, Paperclip, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const sourceLabels: Record<string, string> = {
  notification: 'Notificación',
  invitation: 'Invitación',
  password_reset: 'Reset Contraseña',
  campaign: 'Campaña',
  funnel: 'Funnel',
  avatar_reminder: 'Recordatorio Foto',
  resend: 'Reenvío',
};

const EmailsLogContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewEmail, setPreviewEmail] = useState<any>(null);
  const [resendEmail, setResendEmail] = useState<any>(null);
  const [resendOverride, setResendOverride] = useState('');
  const [resending, setResending] = useState(false);

  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingAvatarReminder, setSendingAvatarReminder] = useState(false);

  const handleSendAvatarReminder = async () => {
    setSendingAvatarReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-avatar-reminder');
      if (error) throw error;
      toast.success(`Recordatorio enviado a ${data.sent} de ${data.total} usuarios sin foto`);
      queryClient.invalidateQueries({ queryKey: ['sent-emails'] });
    } catch (err: any) {
      toast.error('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setSendingAvatarReminder(false);
    }
  };

  const openResend = (email: any) => {
    setResendEmail(email);
    setResendOverride(email.recipient_email || '');
  };

  const handleResend = async () => {
    if (!resendEmail || !resendOverride) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('resend-email', {
        body: { sent_email_id: resendEmail.id, override_email: resendOverride },
      });
      if (error) throw error;
      toast.success(`Correo reenviado a ${data.recipient}${data.attachments_count ? ` con ${data.attachments_count} adjunto(s)` : ''}`);
      setResendEmail(null);
      queryClient.invalidateQueries({ queryKey: ['sent-emails'] });
    } catch (err: any) {
      toast.error('Error al reenviar: ' + (err.message || 'Error desconocido'));
    } finally {
      setResending(false);
    }
  };

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['sent-emails', sourceFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('sent_emails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredEmails = emails.filter((e: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.recipient_email?.toLowerCase().includes(q) ||
      e.recipient_name?.toLowerCase().includes(q) ||
      e.subject?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: emails.length,
    sent: emails.filter((e: any) => e.status === 'sent').length,
    opened: emails.filter((e: any) => e.opened_at).length,
    failed: emails.filter((e: any) => e.status === 'failed').length,
  };

  const handleSendNotification = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error('Completa todos los campos');
      return;
    }
    setSending(true);
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="color: #6366f1; margin: 0;">Socialify</h2>
          </div>
          ${composeBody.split('\n').map(p => `<p style="color: #555; font-size: 16px; line-height: 1.6;">${p}</p>`).join('')}
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">Socialify · socialifycr.com</p>
        </div>
      `;
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: { to: composeTo, subject: composeSubject, html, sentBy: user?.id },
      });
      if (error) throw error;
      toast.success('Correo enviado exitosamente');
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      queryClient.invalidateQueries({ queryKey: ['sent-emails'] });
    } catch (err: any) {
      toast.error('Error al enviar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={handleSendAvatarReminder} disabled={sendingAvatarReminder}>
          {sendingAvatarReminder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
          Recordatorio de foto
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Enviados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.sent}</p><p className="text-xs text-muted-foreground">Exitosos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{stats.opened}</p><p className="text-xs text-muted-foreground">Abiertos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-500">{stats.failed}</p><p className="text-xs text-muted-foreground">Fallidos</p></CardContent></Card>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="compose">Enviar Notificación</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por email, nombre o asunto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Fuente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fuentes</SelectItem>
                <SelectItem value="notification">Notificación</SelectItem>
                <SelectItem value="invitation">Invitación</SelectItem>
                <SelectItem value="password_reset">Reset Contraseña</SelectItem>
                <SelectItem value="campaign">Campaña</SelectItem>
                <SelectItem value="funnel">Funnel</SelectItem>
                <SelectItem value="avatar_reminder">Recordatorio Foto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredEmails.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No se encontraron correos</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredEmails.map((email: any) => (
                <Card key={email.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {email.status === 'sent' ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                          <span className="font-medium truncate">{email.subject}</span>
                          {email.opened_at && (
                            <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                              <MailOpen className="h-3 w-3" />
                              Abierto
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="truncate">{email.recipient_name ? `${email.recipient_name} <${email.recipient_email}>` : email.recipient_email}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{sourceLabels[email.source] || email.source}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs text-muted-foreground">{format(new Date(email.created_at), "d MMM yyyy HH:mm", { locale: es })}</span>
                          {email.opened_at && (
                            <span className="text-[10px] text-green-600">Abierto: {format(new Date(email.opened_at), "d MMM HH:mm", { locale: es })}</span>
                          )}
                        </div>
                        {email.html_content && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewEmail(email)}><Eye className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </div>
                    {email.error_message && <p className="text-xs text-red-500 mt-2 truncate">{email.error_message}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compose">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Send className="h-5 w-5" />Enviar Notificación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Destinatario</label><Input placeholder="email@ejemplo.com" type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)} /></div>
              <div><label className="text-sm font-medium mb-1 block">Asunto</label><Input placeholder="Asunto del correo" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} /></div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mensaje</label>
                <Textarea placeholder="Escribe tu mensaje aquí..." value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={8} />
                <p className="text-xs text-muted-foreground mt-1">Usa saltos de línea para separar párrafos.</p>
              </div>
              <Button onClick={handleSendNotification} disabled={sending || !composeTo || !composeSubject || !composeBody} className="w-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar Correo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewEmail} onOpenChange={() => setPreviewEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{previewEmail?.subject}</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">
            Para: {previewEmail?.recipient_email}{' · '}{previewEmail?.created_at && format(new Date(previewEmail.created_at), "d MMM yyyy HH:mm", { locale: es })}
          </div>
          <div className="border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: previewEmail?.html_content || '' }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailsLogContent;
