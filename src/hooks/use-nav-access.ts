import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { AGENCY_NAV } from '@/components/agency/nav-items';

/** Sections that can never be hidden (fallback landing page). */
export const ALWAYS_VISIBLE = ['/agencia'];

/** Map a pathname to the agency nav section url it belongs to. */
export const sectionForPath = (pathname: string): string | null => {
  if (pathname.startsWith('/producciones')) return '/agencia/producciones';
  const match = AGENCY_NAV.filter((i) => !i.exact)
    .sort((a, b) => b.url.length - a.url.length)
    .find((i) => pathname.startsWith(i.url));
  return match?.url ?? null;
};

/** Hidden menu sections for the signed-in user. The owner always sees everything. */
export const useNavAccess = () => {
  const { user } = useAuth();
  const { systemRole, loading: roleLoading } = useUserRole();
  const isOwner = systemRole === 'owner';
  const { data, isLoading } = useQuery({
    queryKey: ['nav-access', user?.id],
    enabled: !!user?.id && !roleLoading && !isOwner,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('agency_nav_access')
        .select('hidden_sections')
        .eq('user_id', user!.id)
        .maybeSingle();
      return (data?.hidden_sections ?? []) as string[];
    },
  });
  const hidden = isOwner ? [] : (data ?? []).filter((s) => !ALWAYS_VISIBLE.includes(s));
  return {
    hidden,
    isOwner,
    loading: roleLoading || (!isOwner && isLoading),
    canSee: (url: string) => !hidden.includes(url),
  };
};
