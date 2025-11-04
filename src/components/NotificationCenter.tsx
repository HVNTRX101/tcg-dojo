import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, Notification } from '../services/notification.service';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { Bell, Check, CheckCheck, Trash2, Settings, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from './ui/utils';

export function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { markNotificationRead, markAllNotificationsRead } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications({ limit: 50 }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      markNotificationRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      markAllNotificationsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      toast.success('All notifications marked as read');
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      toast.success('Notification deleted');
    },
  });

  // Delete all read notifications mutation
  const deleteAllReadMutation = useMutation({
    mutationFn: () => notificationService.deleteAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All read notifications deleted');
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.data?.url) {
      navigate(notification.data.url);
    }
  };

  const getNotificationIcon = (type: string) => {
    // You can customize icons based on notification type
    switch (type) {
      case 'ORDER_UPDATE':
        return '📦';
      case 'MESSAGE':
        return '💬';
      case 'PRICE_ALERT':
        return '💰';
      case 'COMMENT':
        return '💭';
      case 'FOLLOW':
        return '👤';
      default:
        return '🔔';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className="flex-1"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteAllReadMutation.mutate()}
              disabled={deleteAllReadMutation.isPending}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear read
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-gray-50 transition-colors cursor-pointer group',
                    !notification.isRead && 'bg-blue-50'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm mb-1">{notification.title}</p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={e => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={e => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications settings or full page
                  navigate('/account/settings#notifications');
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Notification Settings
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
