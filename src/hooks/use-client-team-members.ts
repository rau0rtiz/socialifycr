import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientTeamMember {
  userId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
}

/** Returns ALL team members of a client regardless of role (closer, setter, manager, etc.). */
export const useClientTeamMembers = (clientId: string | null) => {
  return useQuery({
    queryKey: ['client-team-members', clientId],
    queryFn: async (): Promise<ClientTeamMember[]> => {
      if (!clientId) return [];
      const { data: members, error } = await supabase
        .from('client_team_members')
        .select('user_id, role')
        .eq('client_id', clientId);
      if (error) throw error;
      const ids = (members || []).map(m => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', ids);
      return (profiles || []).map(p => {
        const m = members!.find(x => x.user_id === p.id);
        return {
          userId: p.id,
          fullName: p.full_name || p.email || 'Sin nombre',
          email: p.email,
          avatarUrl: p.avatar_url,
          role: (m?.role as string) || 'member',
        };
      });
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });
};
