import { useQuery } from '@tanstack/react-query';
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

      // 1. Get user-based closers from team members
      const { data: members } = await supabase
        .from('client_team_members')
        .select('user_id, role')
        .eq('client_id', clientId);

      let userClosers: ClientCloser[] = [];

      if (members?.length) {
        const clientCloserIds = members
          .filter(m => m.role === 'closer')
          .map(m => m.user_id);

        const nonClientCloserIds = members
          .filter(m => m.role !== 'closer')
          .map(m => m.user_id);

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

      // 2. Get named closers from client_closers table
      const { data: namedClosers } = await supabase
        .from('client_closers' as any)
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
