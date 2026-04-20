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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, Users, Search, ArrowRight, ArrowLeft, Eye, Code, User, Clock, CalendarClock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EmailTemplate } from '@/hooks/use-email-templates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  preselectedRecipients?: { id: string; name: string; email: string }[];
  leadContext?: any; // Full lead object from funnel_leads
}

type AudienceType = 'funnel_leads' | 'email_contacts';
type Step = 'audience' | 'editor' | 'confirm';

interface Recipient {
  id: string;
  name: string;
  email: string;
}

// ─── Lead Context Mapper ───
const levelNames: Record<number, string> = {
  1: 'Idea', 2: 'Startup', 3: 'En crecimiento', 4: 'Escalando', 5: 'Establecido', 6: 'Imperio',
};

const levelIntros: Record<number, string> = {
  1: 'Vi que estás en las primeras etapas de tu negocio y eso me parece increíble — arrancar es lo más difícil. Muchos emprendedores en esta fase tienen la idea clara pero no saben por dónde empezar con el marketing digital.',
  2: 'Vi que ya arrancaste con tu negocio y estás dando los primeros pasos. Esta es una etapa clave donde tener una estrategia clara puede hacer toda la diferencia para empezar a generar tracción.',
  3: 'Vi que tu negocio ya está creciendo y eso habla muy bien de lo que has construido. En esta etapa, una buena estrategia de marketing puede acelerar ese crecimiento y ayudarte a llegar al siguiente nivel.',
  4: 'Vi que tu negocio está en una etapa de escalar y eso es un gran logro. Cuando un negocio llega a este punto, optimizar la estrategia digital se vuelve fundamental para crecer de forma sostenible.',
  5: 'Vi que tienes un negocio establecido con buena tracción. En esta etapa, el reto suele ser encontrar nuevas palancas de crecimiento y maximizar el retorno de cada acción de marketing.',
  6: 'Vi que manejas una operación sólida y consolidada. A este nivel, la diferencia la hace una estrategia digital de alto nivel que te permita seguir dominando tu mercado.',
};

function buildLeadVariables(lead: any): Record<string, string> {
  if (!lead) return {};
  const level = lead.business_level || 1;
  const intro = levelIntros[level] || levelIntros[1];

  return {
    name: lead.name || '',
    email: lead.email || '',
    custom_intro: intro,
  };
}

function replaceVariables(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

export const SendCampaignDialog = ({ open, onOpenChange, template, preselectedRecipients, leadContext }: Props) => {
  const isOutboundMode = !!leadContext && !!preselectedRecipients?.length;

  const [step, setStep] = useState<Step>('audience');
  const [audienceType, setAudienceType] = useState<AudienceType>('funnel_leads');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recipientSearch, setRecipientSearch] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [editorTab, setEditorTab] = useState('preview');
  const [sending, setSending] = useState(false);
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledFor, setScheduledFor] = useState<string>(''); // datetime-local value
  const queryClient = useQueryClient();

  // Build variables from lead context
  const leadVars = useMemo(() => buildLeadVariables(leadContext), [leadContext]);

  // Reset state when opening
  useEffect(() => {
    if (open && template) {
      setRecipientSearch('');
      setEditorTab('preview');

      if (isOutboundMode) {
        // Outbound mode: pre-fill with lead context
        setStep('editor');
        setSelectedIds(new Set(preselectedRecipients!.map(r => r.id)));
        const vars = buildLeadVariables(leadContext);
        setEditedSubject(replaceVariables(template.subject, vars));
        setEditedHtml(replaceVariables(template.html_content, vars));
        setEditedMessage(vars.custom_intro || '');
      } else {
        setStep('audience');
        setSelectedIds(new Set());
        setEditedSubject(template.subject);
        setEditedHtml(template.html_content);
        setEditedMessage('');
      }
      setSendMode('now');
      setScheduledFor('');
    }
  }, [open, template, preselectedRecipients, leadContext, isOutboundMode]);

  // When editedMessage changes in outbound mode, update the {{custom_intro}} in html
  useEffect(() => {
    if (isOutboundMode && template && editedMessage !== undefined) {
      const vars = { ...buildLeadVariables(leadContext), custom_intro: editedMessage };
      setEditedHtml(replaceVariables(template.html_content, vars));
    }
  }, [editedMessage]);

  const { data: funnels } = useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funnels').select('*').eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: open && !isOutboundMode,
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
    enabled: open && !isOutboundMode && audienceType === 'funnel_leads',
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
    enabled: open && !isOutboundMode && audienceType === 'email_contacts',
  });

  const allRecipients: Recipient[] = audienceType === 'funnel_leads' ? (funnelLeads || []) : (emailContacts || []);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch) return allRecipients;
    const q = recipientSearch.toLowerCase();
    return allRecipients.filter(r =>
      r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [allRecipients, recipientSearch]);

  const selectedRecipients = useMemo(() => {
    if (isOutboundMode && preselectedRecipients) return preselectedRecipients;
    const fromAll = allRecipients.filter(r => selectedIds.has(r.id));
    if (preselectedRecipients && preselectedRecipients.length > 0) {
      const existingIds = new Set(fromAll.map(r => r.id));
      const extra = preselectedRecipients.filter(r => selectedIds.has(r.id) && !existingIds.has(r.id));
      return [...fromAll, ...extra];
    }
    return fromAll;
  }, [allRecipients, selectedIds, preselectedRecipients, isOutboundMode]);

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
            const personalizedHtml = replaceVariables(editedHtml, { name: r.name, email: r.email, link: '' });
            const personalizedSubject = replaceVariables(editedSubject, { name: r.name, email: r.email });

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

  const previewHtml = editedHtml;

  // ─── Outbound Mode: simplified 2-panel layout ───
  if (isOutboundMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar email a {preselectedRecipients![0]?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-1">
            {/* Recipient banner */}
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-primary/10 border border-primary/20">
              <User className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">
                Para: {preselectedRecipients!.map(r => r.name || r.email).join(', ')}
              </span>
              {leadContext?.business_level && (
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Nivel {leadContext.business_level}: {levelNames[leadContext.business_level]}
                </Badge>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <Label className="text-xs">Asunto</Label>
              <Input value={editedSubject} onChange={e => setEditedSubject(e.target.value)} className="h-9" />
            </div>

            {/* Editable intro */}
            <div className="space-y-1">
              <Label className="text-xs">Intro del email (basado en nivel {leadContext?.business_level})</Label>
              <Textarea
                value={editedMessage}
                onChange={e => setEditedMessage(e.target.value)}
                className="min-h-[70px] text-sm resize-none"
                placeholder="Intro según el nivel del lead..."
              />
            </div>

            {/* Preview */}
            <Tabs value={editorTab} onValueChange={setEditorTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-fit">
                <TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Vista previa</TabsTrigger>
                <TabsTrigger value="code" className="gap-1.5 text-xs"><Code className="h-3.5 w-3.5" /> HTML</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-2">
                <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '420px' }}>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    sandbox=""
                    title="Preview"
                  />
                </div>
              </TabsContent>
              <TabsContent value="code" className="mt-2">
                <Textarea
                  value={editedHtml}
                  onChange={e => setEditedHtml(e.target.value)}
                  className="h-[420px] font-mono text-xs resize-none"
                  spellCheck={false}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t sticky bottom-0 bg-background">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending} className="gap-1.5">
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="h-4 w-4" /> Enviar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Standard Campaign Mode (multi-recipient, 3-step) ───
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {step === 'audience' && 'Seleccionar destinatarios'}
            {step === 'editor' && 'Editar plantilla'}
            {step === 'confirm' && 'Confirmar envío'}
          </DialogTitle>
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

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o email..." value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll} className="shrink-0 h-9 text-xs">
                {selectedIds.size === filteredRecipients.length && filteredRecipients.length > 0 ? 'Deseleccionar' : 'Seleccionar todos'}
              </Button>
            </div>

            <ScrollArea className="h-[240px] rounded-md border">
              <div className="p-1">
                {filteredRecipients.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No hay destinatarios</p>
                ) : (
                  filteredRecipients.map(r => (
                    <label key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
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
                <div className="border rounded-lg overflow-hidden bg-white h-[400px]">
                  <iframe srcDoc={previewHtml} className="w-full h-full border-0" sandbox="" title="Preview" />
                </div>
              </TabsContent>
              <TabsContent value="code" className="flex-1 min-h-0 mt-2">
                <Textarea value={editedHtml} onChange={e => setEditedHtml(e.target.value)} className="h-[400px] font-mono text-xs resize-none" spellCheck={false} />
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
              <div><p className="text-xs text-muted-foreground">Plantilla</p><p className="font-medium text-sm">{template?.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Asunto</p><p className="font-medium text-sm">{editedSubject}</p></div>
              <div><p className="text-xs text-muted-foreground">Destinatarios</p><p className="font-medium text-sm">{selectedRecipients.length} personas</p></div>
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
