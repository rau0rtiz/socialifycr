import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Users, UserPlus, Trash2, Search, Mail, Circle } from 'lucide-react';
import { useUserRole, type SystemRole } from '@/hooks/use-user-role';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SystemUser {
  id: string;
  user_id: string;
  role: SystemRole;
  created_at: string;
  last_sign_in_at?: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface ClientMember {
  id: string;
  client_id: string;
  user_id: string;
  role: string;
  created_at: string;
  client_name?: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

const roleLabels: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  admin: { label: 'Admin', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20' },
  manager: { label: 'Manager', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  analyst: { label: 'Analista', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  viewer: { label: 'Viewer', color: 'bg-muted text-muted-foreground border-border' },
  account_manager: { label: 'Account Manager', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  editor: { label: 'Editor', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
};

const Accesos = () => {
  const { user } = useAuth();
  const { systemRole } = useUserRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'system' | 'client'; id: string; name: string }>({ open: false, type: 'system', id: '', name: '' });
  const [addDialog, setAddDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<SystemRole>('viewer');

  const isOwner = systemRole === 'owner';

  // Fetch system users with profiles
  const { data: systemUsers = [], isLoading: loadingSystem } = useQuery({
    queryKey: ['admin-system-users'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at');
      if (error) throw error;

      const userIds = [...new Set(roles.map(r => r.user_id))];
      const [{ data: profiles }, { data: signIns }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds),
        supabase.rpc('get_users_last_sign_in', { user_ids: userIds }),
      ]);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const signInMap = new Map((signIns as any[])?.map(s => [s.user_id, s.last_sign_in_at]) || []);

      return roles.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || { full_name: null, email: null, avatar_url: null },
        last_sign_in_at: signInMap.get(r.user_id) || null,
      })) as SystemUser[];
    },
  });

  // Fetch client team members with profiles and client names
  const { data: clientMembers = [], isLoading: loadingClients } = useQuery({
    queryKey: ['admin-client-members'],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('client_team_members')
        .select('id, client_id, user_id, role, created_at');
      if (error) throw error;

      const userIds = [...new Set(members.map(m => m.user_id))];
      const clientIds = [...new Set(members.map(m => m.client_id))];

      const [profilesRes, clientsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', userIds),
        supabase.from('clients').select('id, name').in('id', clientIds),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const clientMap = new Map(clientsRes.data?.map(c => [c.id, c.name]) || []);

      return members.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || { full_name: null, email: null },
        client_name: clientMap.get(m.client_id) || 'Desconocido',
      })) as ClientMember[];
    },
  });

  // Delete system role
  const deleteSystemRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-users'] });
      toast.success('Rol de sistema eliminado');
      setDeleteDialog({ open: false, type: 'system', id: '', name: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete client member
  const deleteClientMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_team_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-client-members'] });
      toast.success('Acceso de cliente eliminado');
      setDeleteDialog({ open: false, type: 'system', id: '', name: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Add system role
  const addSystemRole = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: SystemRole }) => {
      // Find user by email in profiles
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (profileErr) throw profileErr;
      if (!profile) throw new Error('No se encontró un usuario con ese email');

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.id, role });
      if (error) {
        if (error.code === '23505') throw new Error('Este usuario ya tiene ese rol asignado');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-users'] });
      toast.success('Rol asignado correctamente');
      setAddDialog(false);
      setNewUserEmail('');
      setNewUserRole('viewer');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = () => {
    if (deleteDialog.type === 'system') {
      deleteSystemRole.mutate(deleteDialog.id);
    } else {
      deleteClientMember.mutate(deleteDialog.id);
    }
  };

  const filteredSystemUsers = systemUsers.filter(u => {
    const term = search.toLowerCase();
    return !term || 
      u.profile?.full_name?.toLowerCase().includes(term) ||
      u.profile?.email?.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term);
  });

  const filteredClientMembers = clientMembers.filter(m => {
    const term = search.toLowerCase();
    return !term ||
      m.profile?.full_name?.toLowerCase().includes(term) ||
      m.profile?.email?.toLowerCase().includes(term) ||
      m.client_name?.toLowerCase().includes(term) ||
      m.role.toLowerCase().includes(term);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Control de Accesos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestiona todos los usuarios con acceso a la plataforma
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            {isOwner && (
              <Button onClick={() => setAddDialog(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Agregar rol
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="system" className="space-y-4">
          <TabsList>
            <TabsTrigger value="system" className="gap-2">
              <Shield className="h-4 w-4" />
              Equipo interno ({filteredSystemUsers.length})
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="h-4 w-4" />
              Acceso por cliente ({filteredClientMembers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Roles de sistema</CardTitle>
                <CardDescription>
                  Usuarios con permisos globales en la plataforma (owner, admin, manager, analyst, viewer)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSystem ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                ) : filteredSystemUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hay usuarios con roles de sistema</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Desde</TableHead>
                        {isOwner && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSystemUsers.map((u) => {
                        const isCurrentUser = u.user_id === user?.id;
                        const isOwnerRole = u.role === 'owner';
                        const canDelete = isOwner && !isCurrentUser && !isOwnerRole;

                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {u.profile?.full_name || '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                {u.profile?.email || '—'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={roleLabels[u.role]?.color || ''}>
                                {roleLabels[u.role]?.label || u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(u.created_at!).toLocaleDateString('es-CR')}
                            </TableCell>
                            {isOwner && (
                              <TableCell>
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteDialog({
                                      open: true,
                                      type: 'system',
                                      id: u.id,
                                      name: u.profile?.full_name || u.profile?.email || 'este usuario',
                                    })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Accesos por cliente</CardTitle>
                <CardDescription>
                  Usuarios asignados a clientes específicos con roles de cliente (account_manager, editor, viewer)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClients ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                ) : filteredClientMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hay miembros de equipo asignados a clientes</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Desde</TableHead>
                        {isOwner && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientMembers.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            {m.profile?.full_name || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {m.profile?.email || '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{m.client_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={roleLabels[m.role]?.color || ''}>
                              {roleLabels[m.role]?.label || m.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(m.created_at!).toLocaleDateString('es-CR')}
                          </TableCell>
                          {isOwner && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  type: 'client',
                                  id: m.id,
                                  name: `${m.profile?.full_name || m.profile?.email || 'este usuario'} de ${m.client_name}`,
                                })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteDialog.open} onOpenChange={(o) => !o && setDeleteDialog({ ...deleteDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar el acceso de <strong>{deleteDialog.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar acceso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add system role dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar rol de sistema</DialogTitle>
            <DialogDescription>
              Asigna un rol global a un usuario existente por su email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email del usuario</Label>
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as SystemRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="analyst">Analista</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => addSystemRole.mutate({ email: newUserEmail, role: newUserRole })}
              disabled={!newUserEmail || addSystemRole.isPending}
            >
              {addSystemRole.isPending ? 'Asignando...' : 'Asignar rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Accesos;
