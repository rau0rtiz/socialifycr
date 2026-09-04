import { useMemo, useState, useTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Search, User } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel';
import { useProfile, ProfileDialog } from '@/components/dashboard/ProfileDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/contexts/AuthContext';
import { AGENCY_NAV, agencyRouteTitle } from './nav-items';
import { prefetchRoute } from '@/lib/route-prefetch';
import { cn } from '@/lib/utils';

/**
 * Top bar of the agency hub: section title, section search, notifications
 * and the user menu. Purely presentational shell for the dark neon revamp.
 */
export const AgencyTopBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const title = agencyRouteTitle(pathname);
  const displayName = profile?.full_name || profile?.email || 'Usuario';
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : displayName[0]?.toUpperCase() || '?';

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return AGENCY_NAV.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const go = (url: string) => {
    setOpen(false);
    setQuery('');
    startTransition(() => navigate(url));
  };

  return (
    <>
      <header className="shrink-0 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:px-6">
          <SidebarTrigger className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground md:h-9 md:w-9" />

          <h1
            data-agency-display
            className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground md:text-2xl"
          >
            {title}
          </h1>

          <div className="relative ml-auto hidden min-w-0 max-w-sm flex-1 sm:block">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-colors focus-within:border-primary/60">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) go(results[0].url);
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Buscar sección..."
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            {open && results.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-border bg-popover p-1.5 shadow-xl">
                {results.map((item) => (
                  <button
                    key={item.url}
                    onMouseEnter={() => prefetchRoute(item.url)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(item.url)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>


          <div className={cn('flex items-center gap-1.5 sm:gap-2', 'ml-auto sm:ml-0')}>
            <NotificationsPanel />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 ring-1 ring-primary/40">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/15 text-xs text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Interno · Agencia
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Mi perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate('/auth');
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
};
