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
        .select('user_id')
        .eq('client_id', clientId);

      if (mErr || !members?.length) return [];

      const userIds = members.map(m => m.user_id);

      // Check which of these users have the "closer" system role
      const { data: closerRoles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'closer' as any)
        .in('user_id', userIds);

      if (rErr || !closerRoles?.length) return [];

      const closerIds = closerRoles.map(r => r.user_id);

      // Fetch profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', closerIds);

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
