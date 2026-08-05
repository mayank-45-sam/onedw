import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Calendar, Search, Trash2, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils/format';
import type { BookingStatus } from '@/types';
import { cn } from '@/lib/utils';

const LIMIT = 15;

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending:         'bg-warning/15 text-warning border-warning/30',
  accepted:        'bg-primary/15 text-primary border-primary/30',
  'worker-assigned': 'bg-primary/15 text-primary border-primary/30',
  'worker-on-the-way': 'bg-accent/15 text-accent border-accent/30',
  arrived:         'bg-accent/15 text-accent border-accent/30',
  'started-work':    'bg-info/15 text-info border-info/30',
  completed:       'bg-success/15 text-success border-success/30',
  cancelled:       'bg-destructive/15 text-destructive border-destructive/30',
  refunded:        'bg-muted text-muted-foreground',
};

const STATUSES: BookingStatus[] = ['pending', 'accepted', 'worker-assigned', 'worker-on-the-way', 'arrived', 'started-work', 'completed', 'cancelled', 'refunded'];

export default function AdminBookingsPage() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const params = {
    page,
    limit: LIMIT,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.bookings(params as Record<string, unknown>),
    queryFn: () => adminService.bookings(params),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      adminService.updateBooking(id, { status }),
    onSuccess: () => {
      toast.success('Booking status updated');
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteBooking(id),
    onSuccess: () => {
      toast.success('Booking deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Manage Bookings</h1>
        <p className="text-muted-foreground">View, update status, and delete bookings.</p>
      </div>

      {/* filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Search by ID or customer…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setSearch(searchInput); setPage(1); }} variant="outline" className="rounded-full gap-2 shrink-0">
          <Search className="h-4 w-4" /> Search
        </Button>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace('-', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load bookings" icon={<Calendar className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No bookings found" icon={<Calendar className="h-8 w-8" />} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['ID', 'Customer', 'Service', 'Date', 'Amount', 'Status', 'Actions'].map((h) => (
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
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{b._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium">{b.customer?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.service?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(b.scheduledDate)}
                      </td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(b.finalPrice)}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn('capitalize border text-xs', STATUS_COLORS[b.status])}>
                          {b.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-full px-2 text-xs">
                                <RefreshCw className="h-3 w-3" /> Status <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STATUSES.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  className="capitalize"
                                  onClick={() => updateMutation.mutate({ id: b._id, status: s })}
                                  disabled={b.status === s || updateMutation.isPending}
                                >
                                  {s.replace('-', ' ')}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete booking?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete booking #{b._id.slice(-6).toUpperCase()}. This action cannot be undone.
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
    </div>
  );
}
