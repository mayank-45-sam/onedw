import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Trash2, Calendar, MessageSquare, Wallet, Star, Percent, Info, Mail, ArrowRight } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { timeAgo } from '@/utils/format';
import type { AppNotification } from '@/types';
import { cn } from '@/lib/utils';

interface SupportMessageData {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const ICON_BY_TYPE: Record<AppNotification['type'], React.ComponentType<{ className?: string }>> = {
  booking: Calendar,
  chat: MessageSquare,
  wallet: Wallet,
  review: Star,
  offer: Percent,
  support: MessageSquare,
  system: Info,
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.notifications.all({ limit: 30 }),
    queryFn: () => notificationService.list({ limit: 30 }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => { toast.success('All marked as read'); qc.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: () => toast.error('Could not mark all as read'),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const removeOne = useMutation({
    mutationFn: (id: string) => notificationService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Deleted'); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not delete'),
  });

  const openSupportMessage = (n: AppNotification) => {
    setSelected(n);
    if (!n.read) markOne.mutate(n._id);
  };

  const selectedData = selected?.data as SupportMessageData | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on your bookings and activity.</p>
        </div>
        <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending} className="gap-2 rounded-full">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState title="Couldn't load notifications" icon={<Bell className="h-8 w-8" />} />
        ) : !data?.data?.length ? (
          <EmptyState title="No notifications" description="You're all caught up!" icon={<Bell className="h-8 w-8" />} />
        ) : (
          <div className="space-y-2">
            {data.data.map((n, i) => {
              const Icon = ICON_BY_TYPE[n.type] ?? Info;
              return (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={n.type === 'support' ? () => openSupportMessage(n) : undefined}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border p-4 transition',
                    !n.read && 'border-primary/30 bg-primary/5',
                    n.type === 'support' && 'cursor-pointer hover:border-primary/50 hover:bg-primary/5'
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    {n.type === 'support' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 gap-1 rounded-full px-3 text-primary"
                        onClick={(e) => { e.stopPropagation(); openSupportMessage(n); }}
                      >
                        View message <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!n.read && (
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={(e) => { e.stopPropagation(); markOne.mutate(n._id); }} aria-label="Mark read">
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="rounded-full text-error hover:bg-error/10" onClick={(e) => { e.stopPropagation(); removeOne.mutate(n._id); }} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Support message
            </DialogTitle>
            <DialogDescription>Message from the Help page.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{selectedData?.name ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedData?.email ?? '—'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Subject</p>
                <p className="text-sm font-medium">{selectedData?.subject ?? '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm">{selectedData?.message ?? '—'}</p>
              </div>
              <p className="text-xs text-muted-foreground">Received {timeAgo(selected.createdAt)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
