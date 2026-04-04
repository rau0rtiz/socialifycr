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

      // Get team members for this client
      const { data: members, error: mErr } = await supabase
        .from('client_team_members')
        .select('user_id, role')
        .eq('client_id', clientId);

      if (mErr || !members?.length) return [];

      // Collect user IDs that are closers by client role
      const clientCloserIds = members
        .filter(m => m.role === 'closer')
        .map(m => m.user_id);

      // Also check system roles for remaining members
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
      if (allCloserIds.length === 0) return [];

      // Fetch profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allCloserIds);

      if (pErr || !profiles?.length) return [];

      return profiles.map(p => ({
        userId: p.id,
        fullName: p.full_name || 'Sin nombre',
        avatarUrl: p.avatar_url,
      }));
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });
};
