import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Users, Search, ArrowRight, ArrowLeft, Eye, Code, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EmailTemplate } from '@/hooks/use-email-templates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  preselectedRecipients?: { id: string; name: string; email: string }[];
}

type AudienceType = 'funnel_leads' | 'email_contacts';
type Step = 'audience' | 'editor' | 'confirm';

interface Recipient {
  id: string;
  name: string;
  email: string;
}

export const SendCampaignDialog = ({ open, onOpenChange, template, preselectedRecipients }: Props) => {
  const [step, setStep] = useState<Step>('audience');
  const [audienceType, setAudienceType] = useState<AudienceType>('funnel_leads');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recipientSearch, setRecipientSearch] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [editorTab, setEditorTab] = useState('preview');
  const [sending, setSending] = useState(false);

  // Reset state when opening/closing or template changes
  useEffect(() => {
    if (open && template) {
      setRecipientSearch('');
      setEditedSubject(template.subject);
      setEditedHtml(template.html_content);
      setEditorTab('preview');
      if (preselectedRecipients && preselectedRecipients.length > 0) {
        setStep('editor');
        setSelectedIds(new Set(preselectedRecipients.map(r => r.id)));
      } else {
        setStep('audience');
        setSelectedIds(new Set());
      }
    }
  }, [open, template, preselectedRecipients]);

  const { data: funnels } = useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funnels').select('*').eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: funnelLeads } = useQuery({
    queryKey: ['funnel-leads-for-campaign', selectedFunnelId],
    queryFn: async () => {
      let q = supabase.from('funnel_leads').select('id, name, email');
      if (selectedFunnelId !== 'all') q = q.eq('funnel_id', selectedFunnelId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r: any) => ({ id: r.id, name: r.name, email: r.email }));
    },
    enabled: open && audienceType === 'funnel_leads',
  });

  const { data: emailContacts } = useQuery({
    queryKey: ['email-contacts-for-campaign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_contacts')
        .select('id, email, full_name')
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((r: any) => ({ id: r.id, name: r.full_name || '', email: r.email }));
    },
    enabled: open && audienceType === 'email_contacts',
  });

  const allRecipients: Recipient[] = audienceType === 'funnel_leads' ? (funnelLeads || []) : (emailContacts || []);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch) return allRecipients;
    const q = recipientSearch.toLowerCase();
    return allRecipients.filter(r =>
      r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [allRecipients, recipientSearch]);

  const selectedRecipients = useMemo(() =>
    allRecipients.filter(r => selectedIds.has(r.id)),
    [allRecipients, selectedIds]
  );

  const toggleRecipient = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredRecipients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecipients.map(r => r.id)));
    }
  };

  const handleSend = async () => {
    if (!template || selectedRecipients.length === 0) return;
    setSending(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const batchSize = 5;

      for (let i = 0; i < selectedRecipients.length; i += batchSize) {
        const batch = selectedRecipients.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(async (r) => {
            const personalizedHtml = editedHtml
              .replace(/\{\{name\}\}/g, r.name)
              .replace(/\{\{email\}\}/g, r.email)
              .replace(/\{\{link\}\}/g, '');

            const personalizedSubject = editedSubject
              .replace(/\{\{name\}\}/g, r.name)
              .replace(/\{\{email\}\}/g, r.email);

            const { error } = await supabase.functions.invoke('send-notification-email', {
              body: {
                to: r.email,
                toName: r.name,
                subject: personalizedSubject,
                html: personalizedHtml,
              },
            });
            if (error) throw error;
          })
        );

        results.forEach(r => r.status === 'fulfilled' ? successCount++ : failCount++);
        if (i + batchSize < selectedRecipients.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast.success(`Enviado: ${successCount} exitosos${failCount > 0 ? `, ${failCount} fallidos` : ''}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error enviando');
    } finally {
      setSending(false);
    }
  };

  const previewHtml = editedHtml
    .replace(/\{\{name\}\}/g, selectedRecipients[0]?.name || 'Nombre')
    .replace(/\{\{email\}\}/g, selectedRecipients[0]?.email || 'email@ejemplo.com')
    .replace(/\{\{link\}\}/g, '#');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {step === 'audience' && 'Seleccionar destinatarios'}
            {step === 'editor' && 'Editar plantilla'}
            {step === 'confirm' && 'Confirmar envío'}
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            {(['audience', 'editor', 'confirm'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? 'bg-primary text-primary-foreground' :
                  (['audience', 'editor', 'confirm'].indexOf(step) > i) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                {i < 2 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* ─── Step 1: Audience ─── */}
        {step === 'audience' && (
          <div className="space-y-4 flex-1 min-h-0">
            {template && (
              <div className="p-3 rounded-md bg-muted">
                <p className="font-medium text-sm">{template.name}</p>
                <p className="text-xs text-muted-foreground">Asunto: {template.subject}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Audiencia</Label>
                <Select value={audienceType} onValueChange={(v) => { setAudienceType(v as AudienceType); setSelectedIds(new Set()); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funnel_leads">Leads de Funnels</SelectItem>
                    <SelectItem value="email_contacts">Contactos de Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {audienceType === 'funnel_leads' && (
                <div className="space-y-1">
                  <Label className="text-xs">Funnel</Label>
                  <Select value={selectedFunnelId} onValueChange={(v) => { setSelectedFunnelId(v); setSelectedIds(new Set()); }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {funnels?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Search + select all */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o email..." value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll} className="shrink-0 h-9 text-xs">
                {selectedIds.size === filteredRecipients.length && filteredRecipients.length > 0 ? 'Deseleccionar' : 'Seleccionar todos'}
              </Button>
            </div>

            {/* Recipients list */}
            <ScrollArea className="h-[240px] rounded-md border">
              <div className="p-1">
                {filteredRecipients.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No hay destinatarios</p>
                ) : (
                  filteredRecipients.map(r => (
                    <label
                      key={r.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleRecipient(r.id)} />
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.name || '(sin nombre)'}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <Badge variant="secondary">{selectedIds.size}</Badge> de {allRecipients.length} seleccionados
            </div>
          </div>
        )}

        {/* ─── Step 2: Editor ─── */}
        {step === 'editor' && (
          <div className="space-y-3 flex-1 min-h-0 flex flex-col">
            <div className="space-y-1">
              <Label className="text-xs">Asunto</Label>
              <Input value={editedSubject} onChange={e => setEditedSubject(e.target.value)} className="h-9" />
            </div>

            <Tabs value={editorTab} onValueChange={setEditorTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-fit">
                <TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Vista previa</TabsTrigger>
                <TabsTrigger value="code" className="gap-1.5 text-xs"><Code className="h-3.5 w-3.5" /> HTML</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="flex-1 min-h-0 mt-2">
                <div className="border rounded-lg overflow-hidden bg-white h-[300px]">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    sandbox=""
                    title="Preview"
                  />
                </div>
              </TabsContent>
              <TabsContent value="code" className="flex-1 min-h-0 mt-2">
                <Textarea
                  value={editedHtml}
                  onChange={e => setEditedHtml(e.target.value)}
                  className="h-[300px] font-mono text-xs resize-none"
                  spellCheck={false}
                />
              </TabsContent>
            </Tabs>

            {template && template.variables.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-1">Variables:</span>
                {template.variables.map(v => (
                  <Badge key={v.key} variant="outline" className="text-[10px] font-mono cursor-pointer hover:bg-muted" onClick={() => {
                    navigator.clipboard.writeText(`{{${v.key}}}`);
                    toast.success(`{{${v.key}}} copiado`);
                  }}>
                    {`{{${v.key}}}`}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Confirm ─── */}
        {step === 'confirm' && (
          <div className="space-y-4 flex-1">
            <div className="p-4 rounded-lg bg-muted space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Plantilla</p>
                <p className="font-medium text-sm">{template?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asunto</p>
                <p className="font-medium text-sm">{editedSubject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Destinatarios</p>
                <p className="font-medium text-sm">{selectedRecipients.length} personas</p>
              </div>
            </div>

            <ScrollArea className="h-[180px] rounded-md border">
              <div className="p-2 space-y-1">
                {selectedRecipients.map(r => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{r.name || '—'}</span>
                    <span className="text-muted-foreground text-xs">{r.email}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Mini preview */}
            <div className="border rounded-lg overflow-hidden bg-white h-[120px]">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0 pointer-events-none"
                sandbox=""
                title="Final preview"
                style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step !== 'audience' && (
            <Button variant="outline" onClick={() => setStep(step === 'confirm' ? 'editor' : 'audience')} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Atrás
            </Button>
          )}
          {step === 'audience' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => setStep('editor')} disabled={selectedIds.size === 0} className="gap-1.5">
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {step === 'editor' && (
            <Button onClick={() => setStep('confirm')} className="gap-1.5">
              Siguiente <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 'confirm' && (
            <Button onClick={handleSend} disabled={sending} className="gap-1.5">
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="h-4 w-4" /> Enviar a {selectedRecipients.length}</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
