import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { RotateCcw, Search, Loader2, Check, X, Eye, DollarSign } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate, initials } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { RefundRequest } from '@/types';

const LIMIT = 15;

const STATUS_COLORS: Record<RefundRequest['status'], string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  processed: 'bg-primary/15 text-primary border-primary/30',
};

export default function RefundRequestsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const params = {
    page,
    limit: LIMIT,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'refunds', params],
    queryFn: () => adminService.refunds(params),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: RefundRequest['status']; notes?: string }) =>
      adminService.updateRefund(id, { status, adminNotes: notes }),
    onSuccess: () => {
      toast.success('Refund request updated');
      qc.invalidateQueries({ queryKey: ['admin', 'refunds'] });
      setIsActionDialogOpen(false);
      setAdminNotes('');
      setSelectedRefund(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const openDetailDialog = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setIsDetailDialogOpen(true);
  };

  const openActionDialog = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setAdminNotes(refund.adminNotes || '');
    setIsActionDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedRefund) {
      updateStatusMutation.mutate({
        id: selectedRefund._id,
        status: 'approved',
        notes: adminNotes,
      });
    }
  };

  const handleReject = () => {
    if (selectedRefund) {
      updateStatusMutation.mutate({
        id: selectedRefund._id,
        status: 'rejected',
        notes: adminNotes,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Refund Requests</h1>
        <p className="text-muted-foreground">Review and process customer refund requests.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Search by booking ID or customer…"
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load refund requests" icon={<RotateCcw className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No refund requests found" icon={<RotateCcw className="h-8 w-8" />} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['ID', 'Customer', 'Worker', 'Amount', 'Reason', 'Status', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((r: RefundRequest, i: number) => (
                    <motion.tr
                      key={r._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/20 transition"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{r._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={r.customer.avatar} />
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {initials(r.customer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{r.customer.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.worker.name}</td>
                      <td className="px-4 py-3 font-medium">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(r.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('capitalize border text-xs', STATUS_COLORS[r.status])}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => openDetailDialog(r)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {r.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-primary hover:bg-primary/10"
                              onClick={() => openActionDialog(r)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refund Request Details</DialogTitle>
            <DialogDescription>Full refund request information.</DialogDescription>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedRefund.customer.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials(selectedRefund.customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedRefund.customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedRefund.worker.avatar} />
                    <AvatarFallback className="bg-accent/10 text-accent">
                      {initials(selectedRefund.worker.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Worker</p>
                    <p className="font-medium">{selectedRefund.worker.name}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Refund Amount</h4>
                  <p className="text-2xl font-bold font-display">{formatCurrency(selectedRefund.amount)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Booking ID</h4>
                  <p className="font-mono text-sm">#{selectedRefund.bookingId.slice(-6).toUpperCase()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Reason</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRefund.reason}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Status</h4>
                  <Badge className={cn('capitalize border', STATUS_COLORS[selectedRefund.status])}>
                    {selectedRefund.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Requested On</h4>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedRefund.createdAt)}</p>
                </div>
              </div>

              {selectedRefund.adminNotes && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Admin Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRefund.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund Request</DialogTitle>
            <DialogDescription>Review and approve or reject the refund request.</DialogDescription>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-xs text-muted-foreground">Refund Amount</p>
                  <p className="text-xl font-bold font-display">{formatCurrency(selectedRefund.amount)}</p>
                </div>
                <Badge className={cn('capitalize border', STATUS_COLORS[selectedRefund.status])}>
                  {selectedRefund.status}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Reason</h4>
                <p className="text-sm text-muted-foreground">{selectedRefund.reason}</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="adminNotes" className="text-sm font-semibold">Admin Notes</label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for approval or rejection..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={updateStatusMutation.isPending}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" /> Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
