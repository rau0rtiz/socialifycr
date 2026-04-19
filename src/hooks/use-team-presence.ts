import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMemberActivity {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  last_sign_in_at: string | null;
}

export function useTeamPresence(clientId: string | null | undefined) {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const { data: members = [] } = useQuery({
    queryKey: ['team-members-activity', clientId],
    queryFn: async (): Promise<TeamMemberActivity[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase.rpc('get_team_members_with_activity', { _client_id: clientId });
      if (error) throw error;
      return (data as TeamMemberActivity[]) || [];
    },
    enabled: !!clientId,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!clientId || !user) return;

    const channel = supabase.channel(`team-presence:${clientId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUserIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, user?.id]);

  return { members, onlineUserIds };
}
