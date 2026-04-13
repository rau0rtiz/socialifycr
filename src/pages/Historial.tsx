import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users, Link, Unlink, UserPlus, UserMinus, Pencil, Trash2, Plus, History, Filter, Building2, User,
} from 'lucide-react';

const ACTION_META: Record<string, { icon: typeof Users; label: string; color: string }> = {
  'client.create': { icon: Plus, label: 'Cliente creado', color: 'text-green-500' },
  'client.update': { icon: Pencil, label: 'Cliente actualizado', color: 'text-blue-500' },
  'client.delete': { icon: Trash2, label: 'Cliente eliminado', color: 'text-destructive' },
  'platform.connect': { icon: Link, label: 'Plataforma conectada', color: 'text-green-500' },
  'platform.disconnect': { icon: Unlink, label: 'Plataforma desconectada', color: 'text-orange-500' },
  'team_member.add': { icon: UserPlus, label: 'Miembro agregado', color: 'text-green-500' },
  'team_member.remove': { icon: UserMinus, label: 'Miembro removido', color: 'text-orange-500' },
};

const PAGE_SIZE = 50;

const Historial = () => {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // Fetch clients for the filter
  const { data: clients } = useQuery({
    queryKey: ['audit-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users (profiles) for the filter
  const { data: users } = useQuery({
    queryKey: ['audit-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', actionFilter, clientFilter, userFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles:user_id(full_name, email, avatar_url)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (clientFilter !== 'all') {
        query = query.eq('client_id', clientFilter);
      }

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const logs = data || [];

  // Build a map of client names for display
  const clientMap = new Map<string, string>();
  clients?.forEach(c => clientMap.set(c.id, c.name));

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Historial de Acciones</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {Object.entries(ACTION_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[220px]">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Filtrar por cliente" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[220px]">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Filtrar por usuario" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>
              {users?.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email || 'Sin nombre'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 pl-12 py-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay acciones registradas
              </div>
            ) : (
              logs.map((log: any) => {
                const meta = ACTION_META[log.action] || { icon: History, label: log.action, color: 'text-muted-foreground' };
                const Icon = meta.icon;
                const profile = log.profiles;
                const userName = profile?.full_name || profile?.email || 'Usuario';
                const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                const clientName = log.client_id ? clientMap.get(log.client_id) : null;

                return (
                  <div key={log.id} className="relative flex items-start gap-4 py-3 pl-12 group">
                    {/* Timeline dot */}
                    <div className={`absolute left-3 top-4 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center ${meta.color} bg-card`}>
                      <Icon className="h-2.5 w-2.5" />
                    </div>

                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{userName}</span>
                        {' '}
                        <span className="text-muted-foreground">{meta.label.toLowerCase()}</span>
                        {log.entity_name && (
                          <>
                            {': '}
                            <span className="font-medium">{log.entity_name}</span>
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                        </p>
                        {clientName && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {clientName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 0 && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
              Anteriores
            </Button>
          )}
          {logs.length === PAGE_SIZE && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={isFetching}>
              {isFetching ? 'Cargando...' : 'Cargar más'}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Historial;
