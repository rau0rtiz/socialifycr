import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EmailTemplate } from '@/hooks/use-email-templates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
}

type AudienceType = 'funnel_leads' | 'email_contacts';

export const SendCampaignDialog = ({ open, onOpenChange, template }: Props) => {
  const [audienceType, setAudienceType] = useState<AudienceType>('funnel_leads');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('all');
  const [sending, setSending] = useState(false);

  // Fetch funnels
  const { data: funnels } = useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funnels').select('*').eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch funnel leads count
  const { data: funnelLeads } = useQuery({
    queryKey: ['funnel-leads-for-campaign', selectedFunnelId],
    queryFn: async () => {
      let q = supabase.from('funnel_leads').select('id, name, email');
      if (selectedFunnelId !== 'all') {
        q = q.eq('funnel_id', selectedFunnelId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: open && audienceType === 'funnel_leads',
  });

  // Fetch email contacts count
  const { data: emailContacts } = useQuery({
    queryKey: ['email-contacts-for-campaign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_contacts')
        .select('id, email, full_name')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: open && audienceType === 'email_contacts',
  });

  const recipients = audienceType === 'funnel_leads' ? funnelLeads : emailContacts;
  const recipientCount = recipients?.length || 0;

  const handleSend = async () => {
    if (!template || !recipients || recipients.length === 0) return;
    setSending(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const batchSize = 5;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(async (r: any) => {
            const name = r.full_name || r.name || '';
            const personalizedHtml = template.html_content
              .replace(/\{\{name\}\}/g, name)
              .replace(/\{\{email\}\}/g, r.email)
              .replace(/\{\{link\}\}/g, '');

            const personalizedSubject = template.subject
              .replace(/\{\{name\}\}/g, name);

            const { error } = await supabase.functions.invoke('send-notification-email', {
              body: {
                to: r.email,
                toName: name,
                subject: personalizedSubject,
                html: personalizedHtml,
              },
            });

            if (error) throw error;
          })
        );

        results.forEach(r => r.status === 'fulfilled' ? successCount++ : failCount++);

        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast.success(`Campaña enviada: ${successCount} exitosos, ${failCount} fallidos`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error enviando campaña');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Campaña
          </DialogTitle>
        </DialogHeader>

        {template && (
          <div className="space-y-1 p-3 rounded-md bg-muted">
            <p className="font-medium text-sm">{template.name}</p>
            <p className="text-xs text-muted-foreground">Asunto: {template.subject}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo de audiencia</Label>
            <Select value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="funnel_leads">Leads de Funnels</SelectItem>
                <SelectItem value="email_contacts">Contactos de Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audienceType === 'funnel_leads' && (
            <div className="space-y-1">
              <Label>Funnel</Label>
              <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los funnels</SelectItem>
                  {funnels?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <Badge variant="secondary" className="mr-1">{recipientCount}</Badge>
              destinatarios
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending || recipientCount === 0}>
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="h-4 w-4 mr-1" /> Enviar a {recipientCount}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
