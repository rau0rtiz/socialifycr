import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Users, Plus, Send, Trash2, Search, FileUp, BarChart3, AlertTriangle } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { useAuth } from '@/contexts/AuthContext';

// ─── Contacts Tab ───────────────────────────────────────────

const ContactsTab = ({ clientId }: { clientId: string }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [addDialog, setAddDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [newContact, setNewContact] = useState({ email: '', full_name: '', tags: '' });
  const [csvText, setCsvText] = useState('');

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['email-contacts', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const tags = newContact.tags ? newContact.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const { error } = await supabase.from('email_contacts').insert({
        client_id: clientId,
        email: newContact.email,
        full_name: newContact.full_name || null,
        tags,
        created_by: user?.id,
      });
      if (error) {
        if (error.code === '23505') throw new Error('Este email ya existe en la lista');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-contacts', clientId] });
      toast.success('Contacto agregado');
      setAddDialog(false);
      setNewContact({ email: '', full_name: '', tags: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const importContacts = useMutation({
    mutationFn: async () => {
      const lines = csvText.trim().split('\n').filter(Boolean);
      const contacts = lines.map(line => {
        const [email, full_name, ...tagParts] = line.split(',').map(s => s.trim());
        return {
          client_id: clientId,
          email,
          full_name: full_name || null,
          tags: tagParts.filter(Boolean),
          created_by: user?.id,
        };
      }).filter(c => c.email && c.email.includes('@'));

      if (contacts.length === 0) throw new Error('No se encontraron emails válidos');

      const { error } = await supabase.from('email_contacts').upsert(contacts, {
        onConflict: 'client_id,email',
        ignoreDuplicates: true,
      });
      if (error) throw error;
      return contacts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['email-contacts', clientId] });
      toast.success(`${count} contactos importados`);
      setImportDialog(false);
      setCsvText('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-contacts', clientId] });
      toast.success('Contacto eliminado');
    },
  });

  const filtered = contacts.filter((c: any) => {
    const term = search.toLowerCase();
    return !term || c.email?.toLowerCase().includes(term) || c.full_name?.toLowerCase().includes(term);
  });

  const activeCount = contacts.filter((c: any) => c.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {activeCount} contactos activos de {contacts.length} total
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setImportDialog(true)}>
            <FileUp className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button size="sm" onClick={() => setAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay contactos aún</p>
              <p className="text-xs mt-1">Agregá contactos manualmente o importá un CSV</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.email}</TableCell>
                    <TableCell className="text-muted-foreground">{c.full_name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(c.tags || []).map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'default' : 'outline'} className="text-xs">
                        {c.status === 'active' ? 'Activo' : 'Desuscrito'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteContact.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add contact dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar contacto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={newContact.full_name} onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (separados por coma)</Label>
              <Input placeholder="leads, premium" value={newContact.tags} onChange={e => setNewContact(p => ({ ...p, tags: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancelar</Button>
            <Button onClick={() => addContact.mutate()} disabled={!newContact.email || addContact.isPending}>
              {addContact.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar contactos</DialogTitle>
            <DialogDescription>Pegá los contactos en formato CSV: email, nombre, tags</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={8}
            placeholder={"email@ejemplo.com, Juan Pérez, lead\notro@email.com, María, premium, vip"}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(false)}>Cancelar</Button>
            <Button onClick={() => importContacts.mutate()} disabled={!csvText.trim() || importContacts.isPending}>
              {importContacts.isPending ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Campaigns Tab ──────────────────────────────────────────

const CampaignsTab = ({ clientId }: { clientId: string }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [createDialog, setCreateDialog] = useState(false);
  const [sendConfirm, setSendConfirm] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '', subject: '', html_content: '', target_tags: '',
    from_name: 'Socialify', from_email: 'notificaciones@socialifycr.com',
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['email-campaigns', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      const tags = newCampaign.target_tags ? newCampaign.target_tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const { error } = await supabase.from('email_campaigns').insert({
        client_id: clientId,
        name: newCampaign.name,
        subject: newCampaign.subject,
        html_content: newCampaign.html_content,
        from_name: newCampaign.from_name,
        from_email: newCampaign.from_email,
        target_tags: tags,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns', clientId] });
      toast.success('Campaña creada');
      setCreateDialog(false);
      setNewCampaign({ name: '', subject: '', html_content: '', target_tags: '', from_name: 'Socialify', from_email: 'notificaciones@socialifycr.com' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns', clientId] });
      toast.success(`Campaña enviada: ${data.sent}/${data.total} emails exitosos`);
      setSendConfirm(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setSendConfirm(null);
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns', clientId] });
      toast.success('Campaña eliminada');
    },
  });

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
    sending: { label: 'Enviando...', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
    sent: { label: 'Enviada', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva campaña
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay campañas aún</p>
              <p className="text-xs mt-1">Creá tu primera campaña de email</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => {
                  const st = statusLabels[c.status] || statusLabels.draft;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={st.color}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.status === 'sent' ? `${c.sent_count}/${c.total_recipients}` : '—'}
                        {c.failed_count > 0 && (
                          <span className="text-destructive ml-1">({c.failed_count} fallos)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.sent_at ? new Date(c.sent_at).toLocaleDateString('es-CR') : new Date(c.created_at).toLocaleDateString('es-CR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status === 'draft' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSendConfirm(c.id)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {c.status === 'draft' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCampaign.mutate(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create campaign dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva campaña</DialogTitle>
            <DialogDescription>Creá una campaña de email para enviar a tus contactos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre de la campaña *</Label>
                <Input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} placeholder="Newsletter Marzo 2026" />
              </div>
              <div className="space-y-1.5">
                <Label>Asunto del email *</Label>
                <Input value={newCampaign.subject} onChange={e => setNewCampaign(p => ({ ...p, subject: e.target.value }))} placeholder="🚀 Novedades de marzo" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre del remitente</Label>
                <Input value={newCampaign.from_name} onChange={e => setNewCampaign(p => ({ ...p, from_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email del remitente</Label>
                <Input value={newCampaign.from_email} onChange={e => setNewCampaign(p => ({ ...p, from_email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags de audiencia (vacío = todos)</Label>
              <Input value={newCampaign.target_tags} onChange={e => setNewCampaign(p => ({ ...p, target_tags: e.target.value }))} placeholder="leads, premium" />
            </div>
            <div className="space-y-1.5">
              <Label>Contenido HTML *</Label>
              <Textarea
                rows={12}
                className="font-mono text-xs"
                value={newCampaign.html_content}
                onChange={e => setNewCampaign(p => ({ ...p, html_content: e.target.value }))}
                placeholder={'<div style="font-family: Arial;">\n  <h1>Hola {{name}}</h1>\n  <p>Tu contenido aquí...</p>\n</div>'}
              />
              <p className="text-xs text-muted-foreground">
                Variables disponibles: {"{{name}}"}, {"{{email}}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => createCampaign.mutate()}
              disabled={!newCampaign.name || !newCampaign.subject || !newCampaign.html_content || createCampaign.isPending}
            >
              {createCampaign.isPending ? 'Creando...' : 'Crear campaña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send confirm */}
      <Dialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar envío
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de enviar esta campaña? Se enviará a todos los contactos activos que coincidan con los tags configurados. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendConfirm(null)}>Cancelar</Button>
            <Button onClick={() => sendConfirm && sendCampaign.mutate(sendConfirm)} disabled={sendCampaign.isPending}>
              {sendCampaign.isPending ? 'Enviando...' : 'Enviar campaña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────

const EmailMarketing = () => {
  const { selectedClient } = useBrand();
  const clientId = selectedClient?.id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona contactos y envía campañas de email
          </p>
        </div>

        {!clientId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Seleccioná un cliente</p>
              <p className="text-sm mt-1">Elegí un cliente desde el selector para gestionar sus campañas de email</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="contacts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="contacts" className="gap-2">
                <Users className="h-4 w-4" />
                Contactos
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-2">
                <Send className="h-4 w-4" />
                Campañas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts">
              <ContactsTab clientId={clientId} />
            </TabsContent>

            <TabsContent value="campaigns">
              <CampaignsTab clientId={clientId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EmailMarketing;
