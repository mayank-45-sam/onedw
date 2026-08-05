import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Megaphone,
  Plus,
  Search,
  Trash2,
  RotateCcw,
  Loader2,
  CalendarClock,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatTime } from '@/utils/format';
import type {
  AdminBroadcast,
  BroadcastAudience,
  BroadcastCategory,
  BroadcastPriority,
} from '@/types';

const LIMIT = 15;

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: 'All users',
  customers: 'Customers',
  workers: 'Workers',
  verified_workers: 'Verified workers',
  pending_workers: 'Pending verification workers',
};

const CATEGORY_LABELS: Record<BroadcastCategory, string> = {
  announcement: '📢 Announcement',
  maintenance: '🔧 Maintenance',
  emergency: '🚨 Emergency Alert',
  promotion: '🎉 Promotion',
  policy: '📋 Policy Update',
};

const PRIORITY_STYLE: Record<BroadcastPriority, string> = {
  low: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
  medium: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500',
  high: 'border-red-500/30 bg-red-500/10 text-red-500',
};

function toUTCISO(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function AdminBroadcastsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audience: 'all' as BroadcastAudience,
    category: 'announcement' as BroadcastCategory,
    priority: 'medium' as BroadcastPriority,
    scheduleNow: true,
    scheduledAt: '',
  });

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: search || undefined,
      category: categoryFilter || undefined,
      audience: audienceFilter || undefined,
    }),
    [page, search, categoryFilter, audienceFilter]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.broadcasts(params as Record<string, unknown>),
    queryFn: () => adminService.broadcasts(params),
  });

  const stats = useQuery({
    queryKey: queryKeys.admin.broadcastStats,
    queryFn: () => adminService.broadcastStats(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      message: string;
      audience: BroadcastAudience;
      category: BroadcastCategory;
      priority: BroadcastPriority;
      schedule_now: boolean;
      scheduled_at: string | null;
    }) => adminService.createBroadcast(payload),
    onSuccess: (b) => {
      toast.success(b.status === 'sent' ? 'Broadcast sent to all recipients' : 'Broadcast scheduled');
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      setIsConfirmOpen(false);
      setIsComposeOpen(false);
      setFormData({ title: '', message: '', audience: 'all', category: 'announcement', priority: 'medium', scheduleNow: true, scheduledAt: '' });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Send failed'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => adminService.resendBroadcast(id),
    onSuccess: () => {
      toast.success('Broadcast re-sent');
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Resend failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteBroadcast(id),
    onSuccess: () => {
      toast.success('Broadcast deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;
  const canSubmit = formData.title.trim() && formData.message.trim();

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Please enter a title and message');
      return;
    }
    setIsConfirmOpen(true);
  };

  const confirmSend = () => {
    createMutation.mutate({
      title: formData.title.trim(),
      message: formData.message.trim(),
      audience: formData.audience,
      category: formData.category,
      priority: formData.priority,
      schedule_now: formData.scheduleNow,
      scheduled_at: formData.scheduleNow ? null : toUTCISO(formData.scheduledAt),
    });
  };

  const statCards = [
    { label: 'Sent today', value: stats.data?.sentToday ?? '—', icon: Send, color: 'text-primary' },
    { label: 'Sent this week', value: stats.data?.sentThisWeek ?? '—', icon: CalendarClock, color: 'text-accent' },
    { label: 'Total broadcasts', value: stats.data?.totalBroadcasts ?? '—', icon: Megaphone, color: 'text-success' },
    { label: 'Delivery success rate', value: stats.data ? `${stats.data.successRate}%` : '—', icon: TrendingUp, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Notification Broadcasts</h1>
          <p className="text-muted-foreground">Send announcements, alerts and updates to users in real time.</p>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-full">
              <Plus className="h-4 w-4" /> New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Compose Broadcast</DialogTitle>
              <DialogDescription>Choose an audience, category and delivery time.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
              <div className="space-y-2">
                <Label htmlFor="bc-title">Title</Label>
                <Input
                  id="bc-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="E.g. Platform maintenance tonight"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bc-message">Message</Label>
                <Textarea
                  id="bc-message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Write the message users will see..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={formData.audience} onValueChange={(v: BroadcastAudience) => setFormData({ ...formData, audience: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AUDIENCE_LABELS) as BroadcastAudience[]).map((a) => (
                        <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.category} onValueChange={(v: BroadcastCategory) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABELS) as BroadcastCategory[]).map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v: BroadcastPriority) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select
                    value={formData.scheduleNow ? 'now' : 'later'}
                    onValueChange={(v) => setFormData({ ...formData, scheduleNow: v === 'now' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send now</SelectItem>
                      <SelectItem value="later">Schedule for later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!formData.scheduleNow && (
                <div className="space-y-2">
                  <Label htmlFor="bc-schedule">Send on</Label>
                  <Input
                    id="bc-schedule"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <p className="flex flex-1 items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Recipients: {AUDIENCE_LABELS[formData.audience]}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!canSubmit}>
                  {formData.scheduleNow ? <Send className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  {formData.scheduleNow ? 'Send now' : 'Schedule'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${c.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold font-display">{c.value}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title or message..."
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as BroadcastCategory[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={audienceFilter} onValueChange={(v) => { setAudienceFilter(v); setPage(1); }}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All audiences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All audiences</SelectItem>
            {(Object.keys(AUDIENCE_LABELS) as BroadcastAudience[]).map((a) => (
              <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* History */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load broadcasts" icon={<Megaphone className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState
          title="No broadcasts yet"
          description="Compose your first announcement or alert to see it here."
          icon={<Megaphone className="h-8 w-8" />}
        />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['Broadcast', 'Audience', 'Type', 'Priority', 'Delivery', 'Sent', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((b, i) => (
                    <motion.tr
                      key={b._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/20 transition"
                    >
                      <td className="max-w-xs px-4 py-3">
                        <p className="flex items-center gap-1.5 font-medium">
                          {b.title}
                          {b.priority === 'high' && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{b.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="whitespace-nowrap">{AUDIENCE_LABELS[b.audience]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="whitespace-nowrap">{CATEGORY_LABELS[b.category]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${PRIORITY_STYLE[b.priority]} capitalize`}>{b.priority}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {b.deliveredCount}/{b.totalRecipients}
                        </span>
                        {b.failedCount > 0 && (
                          <span className="flex items-center gap-1 text-error">
                            <XCircle className="h-3.5 w-3.5" /> {b.failedCount} failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {b.status === 'scheduled' ? (
                          <span className="flex items-center gap-1 text-warning">
                            <Clock className="h-3.5 w-3.5" /> {b.scheduledAt ? formatDate(b.scheduledAt) : 'Scheduled'}
                          </span>
                        ) : b.sentAt ? (
                          <span className="flex items-center gap-1">
                            <Send className="h-3.5 w-3.5" /> {formatDate(b.sentAt)} {formatTime(b.sentAt)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            title="Resend"
                            onClick={() => resendMutation.mutate(b._id)}
                            disabled={resendMutation.isPending}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete broadcast?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{b.title}" and remove it from all recipients' inboxes. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(b._id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {formData.scheduleNow ? <ShieldCheck className="h-5 w-5 text-primary" /> : <CalendarClock className="h-5 w-5 text-primary" />}
              {formData.scheduleNow ? 'Send this broadcast?' : 'Schedule this broadcast?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This {formData.scheduleNow ? 'will send immediately to' : 'will be delivered to'}{' '}
              <strong>{AUDIENCE_LABELS[formData.audience]}</strong> as a {formData.category.replace('_', ' ')} notification
              with <strong>{formData.priority}</strong> priority.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSend} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : formData.scheduleNow ? 'Send now' : 'Schedule'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
