import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientCloser {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export const useClientClosers = (clientId: string | null) => {
  return useQuery({
    queryKey: ['client-closers', clientId],
    queryFn: async (): Promise<ClientCloser[]> => {
      if (!clientId) return [];

      const { data: members } = await supabase
        .from('client_team_members')
        .select('user_id, role')
        .eq('client_id', clientId);

      let userClosers: ClientCloser[] = [];

      if (members?.length) {
        const clientCloserIds = members.filter(m => m.role === 'closer').map(m => m.user_id);
        const nonClientCloserIds = members.filter(m => m.role !== 'closer').map(m => m.user_id);

        let systemCloserIds: string[] = [];
        if (nonClientCloserIds.length > 0) {
          const { data: closerRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'closer' as any)
            .in('user_id', nonClientCloserIds);
          systemCloserIds = (closerRoles || []).map(r => r.user_id);
        }

        const allCloserIds = [...new Set([...clientCloserIds, ...systemCloserIds])];
        if (allCloserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', allCloserIds);

          userClosers = (profiles || []).map(p => ({
            userId: p.id,
            fullName: p.full_name || 'Sin nombre',
            avatarUrl: p.avatar_url,
          }));
        }
      }

      const { data: namedClosers } = await supabase
        .from('client_closers')
        .select('id, name')
        .eq('client_id', clientId)
        .order('name');

      const manualClosers: ClientCloser[] = (namedClosers || []).map((c: any) => ({
        userId: c.id,
        fullName: c.name,
        avatarUrl: null,
      }));

      return [...userClosers, ...manualClosers];
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddClientCloser = (clientId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      if (!clientId) throw new Error('Missing client');
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Nombre requerido');
      const { data, error } = await supabase
        .from('client_closers')
        .insert({ client_id: clientId, name: trimmed } as any)
        .select('id, name')
        .single();
      if (error) throw error;
      return (data as any).name as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-closers', clientId] });
    },
  });
};
