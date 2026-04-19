import { useMetaConnections } from '@/hooks/use-platform-connections';
import { useBrand } from '@/contexts/BrandContext';

/**
 * Returns the list of Meta connection IDs that data hooks should query for the
 * currently active client. Honors the user's "Filter by Meta account" choice in
 * the top bar — when a specific account is selected only that one is returned;
 * otherwise every active Meta connection is returned (aggregated mode).
 *
 * `requireAdAccount`: when true, only connections that have an ad_account_id
 * are returned (used by ads/campaigns endpoints).
 */
export function useTargetedMetaConnections(
  clientId: string | null,
  requireAdAccount = false
) {
  const { data: connections, isLoading } = useMetaConnections(clientId);
  const { selectedMetaConnectionId } = useBrand();

  const eligible = (connections || []).filter((c) =>
    requireAdAccount ? !!c.ad_account_id : true
  );

  const targets = selectedMetaConnectionId
    ? eligible.filter((c) => c.id === selectedMetaConnectionId)
    : eligible;

  return {
    connections: targets,
    allConnections: connections || [],
    isLoading,
    isAggregated: !selectedMetaConnectionId && targets.length > 1,
  };
}
