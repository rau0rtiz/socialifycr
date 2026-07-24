import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InternalTeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

/**
 * Internal Socialify team (owner + admins): Raúl, Ale, Naty, Lu.
 * Everyone else is a per-client collaborator, not part of the internal agency team.
 */
export const useInternalTeam = () => {
  return useQuery({
    queryKey: ['internal-team'],
    queryFn: async (): Promise<InternalTeamMember[]> => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['owner', 'admin']);
      if (rolesError) throw rolesError;
      const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', ids)
        .order('full_name');
      if (error) throw error;
      return (data || []) as InternalTeamMember[];
    },
    staleTime: 5 * 60_000,
  });
};

export const getInitials = (name?: string | null, email?: string | null) => {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
