import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@shared/types";
import {
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  Zap,
  Check,
  Inbox,
  Filter,
} from "lucide-react";

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'tasks' | 'payments'>('all');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user?.id,
    staleTime: 5000,
  });

  // Realtime Subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ['/api/notifications'],
            (oldNotifications: Notification[] | undefined) => {
              const current = oldNotifications || [];

              if (payload.eventType === 'INSERT') {
                const newNotification = payload.new as Notification;
                if (current.some((n) => n.id === newNotification.id)) return current;
                return [newNotification, ...current];
              }

              if (payload.eventType === 'UPDATE') {
                const updated = payload.new as Notification;
                return current.map((n) => (n.id === updated.id ? updated : n));
              }

              if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as any).id;
                return current.filter((n) => n.id !== deletedId);
              }

              return current;
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(
        ['/api/notifications'],
        (oldNotifications: Notification[] | undefined) => {
          if (!oldNotifications) return [];
          return oldNotifications.map((n) =>
            Number(n.id) === Number(notificationId) ? { ...n, is_read: true } : n
          );
        }
      );
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadList = notifications.filter((n) => !n.is_read);
      await Promise.all(
        unreadList.map((n) => apiRequest("PATCH", `/api/notifications/${n.id}/read`))
      );
    },
    onSuccess: () => {
      queryClient.setQueryData(
        ['/api/notifications'],
        (oldNotifications: Notification[] | undefined) => {
          if (!oldNotifications) return [];
          return oldNotifications.map((n) => ({ ...n, is_read: true }));
        }
      );
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task":
      case "task_completion":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "task_submission":
      case "task_claim":
      case "task_bid":
        return <Clock className="w-5 h-5 text-accent" />;
      case "payment":
        return <DollarSign className="w-5 h-5 text-emerald-500" />;
      case "skill-upgrade":
        return <Zap className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-accent" />;
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.is_read;
      if (filter === 'tasks') return n.type.includes('task');
      if (filter === 'payments') return n.type === 'payment';
      return true;
    });
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Communications & Alerts</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full text-xs font-bold">
                {unreadCount} New
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time administrative updates, task review outcomes, and earnings confirmations.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="rounded-xl text-xs font-semibold self-start sm:self-auto"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            filter === 'all'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-muted-foreground hover:text-foreground border-border/60'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            filter === 'unread'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-muted-foreground hover:text-foreground border-border/60'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('tasks')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            filter === 'tasks'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-muted-foreground hover:text-foreground border-border/60'
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setFilter('payments')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            filter === 'payments'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-muted-foreground hover:text-foreground border-border/60'
          }`}
        >
          Payouts
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/40 rounded-2xl animate-pulse border border-border/40" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card/60 border border-dashed border-border/80 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 text-2xl">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold text-foreground">No notifications in this view</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              You are all caught up! Platform alerts will display here as your tasks and payouts progress.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-3.5 backdrop-blur-sm ${
                notification.is_read
                  ? "bg-card/70 border-border/40 text-muted-foreground"
                  : "bg-card border-accent/30 shadow-sm text-foreground"
              }`}
            >
              <div className="p-2.5 rounded-xl bg-muted/50 shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-sm text-foreground">
                    {notification.title}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString()} · {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  {notification.message}
                </p>
              </div>

              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markReadMutation.mutate(notification.id)}
                  disabled={markReadMutation.isPending}
                  className="rounded-xl text-xs h-8 px-2.5 text-accent hover:bg-accent/10 shrink-0"
                >
                  Mark read
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
