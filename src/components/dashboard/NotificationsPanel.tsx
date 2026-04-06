import { Bell, Check, CheckCheck, ShoppingCart, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, AppNotification } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  sale_created: ShoppingCart,
  appointment_created: CalendarCheck,
};

const typeColors: Record<string, string> = {
  sale_created: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  appointment_created: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
};

const NotificationItem = ({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) => {
  const Icon = typeIcons[notification.type] || Bell;
  const colorClass = typeColors[notification.type] || 'text-muted-foreground bg-muted';

  return (
    <button
      onClick={() => !notification.read && onRead(notification.id)}
      className={cn(
        'w-full text-left px-4 py-3 flex gap-3 items-start transition-colors hover:bg-accent/50',
        !notification.read && 'bg-primary/5'
      )}
    >
      <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', !notification.read && 'font-semibold')}>{notification.body}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {notification.metadata?.client_name && (
            <span className="font-medium">{notification.metadata.client_name} · </span>
          )}
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>
      {!notification.read && (
        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </button>
  );
};

export const NotificationsPanel = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-9 md:w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todo leído
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Sin notificaciones
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={(id) => markAsRead.mutate(id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
