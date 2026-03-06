import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SystemRole = 'owner' | 'admin' | 'manager' | 'analyst' | 'viewer';
export type ClientRole = 'account_manager' | 'editor' | 'viewer';

interface ClientAccess {
  clientId: string;
  role: ClientRole;
}

interface UserRoleData {
  isAgency: boolean;
  isClient: boolean;
  systemRole: SystemRole | null;
  clientAccess: ClientAccess[];
  loading: boolean;
}

export const useUserRole = (): UserRoleData => {
  const { user } = useAuth();

  // Fetch system role
  const { data: systemRoleData, isLoading: roleLoading } = useQuery({
    queryKey: ['user-system-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      if (!data || data.length === 0) return null;
      
      // Pick highest priority role
      const priority: SystemRole[] = ['owner', 'admin', 'manager', 'analyst', 'viewer'];
      const roles = data.map(d => d.role as SystemRole);
      return priority.find(r => roles.includes(r)) || roles[0];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch client access
  const { data: clientAccessData, isLoading: accessLoading } = useQuery({
    queryKey: ['user-client-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('client_team_members')
        .select('client_id, role')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching client access:', error);
        return [];
      }
      
      return (data || []).map(item => ({
        clientId: item.client_id,
        role: item.role as ClientRole,
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const loading = roleLoading || accessLoading;
  const systemRole = systemRoleData || null;
  const clientAccess = clientAccessData || [];

  // Agency users are those with owner, admin, or manager system roles
  const isAgency = systemRole === 'owner' || systemRole === 'admin' || systemRole === 'manager';
  
  // Client users are those without agency roles but with client access
  // OR those with analyst/viewer system roles
  const isClient = !isAgency && (clientAccess.length > 0 || systemRole === 'analyst' || systemRole === 'viewer');

  return {
    isAgency,
    isClient,
    systemRole,
    clientAccess,
    loading,
  };
};
