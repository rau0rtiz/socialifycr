import { useBrand } from '@/contexts/BrandContext';
import { useTeamPresence } from '@/hooks/use-team-presence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 6;

const roleLabels: Record<string, string> = {
  account_manager: 'Account Manager',
  editor: 'Editor',
  viewer: 'Viewer',
};

const initialsOf = (name: string | null | undefined, fallback: string) => {
  const src = name || fallback || '?';
  return src
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

interface MemberDotProps {
  member: any;
  online: boolean;
  size?: 'sm' | 'md';
}

const MemberAvatar = ({ member, online, size = 'md' }: MemberDotProps) => {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  return (
    <div className="relative">
      <Avatar className={cn(dim, 'border-2 border-background')}>
        <AvatarImage src={member.avatar_url || undefined} />
        <AvatarFallback className="text-[10px]">
          {initialsOf(member.full_name, member.email || '?')}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background',
          dotSize,
          online ? 'bg-emerald-500' : 'bg-muted-foreground/40'
        )}
      />
    </div>
  );
};

const MemberTooltipBody = ({ member, online }: { member: any; online: boolean }) => (
  <div className="text-xs space-y-0.5">
    <p className="font-medium">{member.full_name || member.email}</p>
    {member.role && <p className="text-muted-foreground">{roleLabels[member.role] || member.role}</p>}
    <p className={online ? 'text-emerald-500' : 'text-muted-foreground'}>
      {online
        ? 'En línea'
        : member.last_sign_in_at
        ? `Última vez: hace ${formatDistanceToNow(new Date(member.last_sign_in_at), { locale: es })}`
        : 'Nunca ingresó'}
    </p>
  </div>
);

export const TeamPresenceBar = () => {
  const { selectedClient } = useBrand();
  const { members, onlineUserIds } = useTeamPresence(selectedClient?.id);

  if (!selectedClient || members.length === 0) return null;

  // Sort online first
  const sorted = [...members].sort((a, b) => {
    const aOn = onlineUserIds.has(a.user_id) ? 0 : 1;
    const bOn = onlineUserIds.has(b.user_id) ? 0 : 1;
    if (aOn !== bOn) return aOn - bOn;
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  const visible = sorted.slice(0, MAX_VISIBLE);
  const overflow = sorted.slice(MAX_VISIBLE);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="hidden md:flex items-center -space-x-2">
        {visible.map((m) => {
          const online = onlineUserIds.has(m.user_id);
          return (
            <Tooltip key={m.user_id}>
              <TooltipTrigger asChild>
                <button className="relative outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                  <MemberAvatar member={m} online={online} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <MemberTooltipBody member={m} online={online} />
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative h-8 w-8 rounded-full border-2 border-background bg-muted text-[10px] font-semibold flex items-center justify-center hover:bg-muted/80 transition-colors">
                +{overflow.length}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {overflow.map((m) => {
                  const online = onlineUserIds.has(m.user_id);
                  return (
                    <div key={m.user_id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50">
                      <MemberAvatar member={m} online={online} size="sm" />
                      <div className="flex-1 min-w-0">
                        <MemberTooltipBody member={m} online={online} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
};
