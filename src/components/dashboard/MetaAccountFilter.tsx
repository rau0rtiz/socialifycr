import { Facebook } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrand } from '@/contexts/BrandContext';
import { useMetaConnections } from '@/hooks/use-platform-connections';

/**
 * Top-bar filter that lets the user focus on a single Meta connection
 * when the active client has more than one connected Meta portfolio.
 * Hidden automatically when there is 0 or 1 Meta connection.
 */
export const MetaAccountFilter = () => {
  const { selectedClient, selectedMetaConnectionId, setSelectedMetaConnectionId } = useBrand();
  const { data: metaConnections } = useMetaConnections(selectedClient?.id || null);

  if (!metaConnections || metaConnections.length < 2) {
    return null;
  }

  const value = selectedMetaConnectionId || 'all';

  return (
    <Select
      value={value}
      onValueChange={(v) => setSelectedMetaConnectionId(v === 'all' ? null : v)}
    >
      <SelectTrigger
        className="h-9 w-[180px] gap-2"
        aria-label="Filtrar por cuenta Meta"
      >
        <Facebook className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <SelectValue placeholder="Todas las cuentas" />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        <SelectItem value="all">Todas las cuentas Meta</SelectItem>
        {metaConnections.map((c) => {
          const label =
            c.account_label ||
            c.platform_page_name ||
            (c.ad_account_id ? `Ad ${c.ad_account_id}` : 'Sin nombre');
          return (
            <SelectItem key={c.id} value={c.id}>
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
