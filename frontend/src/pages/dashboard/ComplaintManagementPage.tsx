import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AlertTriangle, Search, Loader2, Check, X, Eye, MessageSquare } from 'lucide-react';
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
import { formatDate, initials } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Complaint } from '@/types';

const LIMIT = 15;

const STATUS_COLORS: Record<Complaint['status'], string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  investigating: 'bg-primary/15 text-primary border-primary/30',
  resolved: 'bg-success/15 text-success border-success/30',
  dismissed: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLORS: Record<Complaint['priority'], string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/15 text-warning border-warning/30',
  high: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function ComplaintManagementPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const params = {
    page,
    limit: LIMIT,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'complaints', params],
    queryFn: () => adminService.complaints(params),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: Complaint['status']; notes?: string }) =>
      adminService.updateComplaint(id, { status, adminNotes: notes }),
    onSuccess: () => {
      toast.success('Complaint updated');
      qc.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      setIsResolveDialogOpen(false);
      setAdminNotes('');
      setSelectedComplaint(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const openDetailDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailDialogOpen(true);
  };

  const openResolveDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setAdminNotes(complaint.adminNotes || '');
    setIsResolveDialogOpen(true);
  };

  const handleResolve = () => {
    if (selectedComplaint) {
      updateStatusMutation.mutate({
        id: selectedComplaint._id,
        status: 'resolved',
        notes: adminNotes,
      });
    }
  };

  const handleDismiss = () => {
    if (selectedComplaint) {
      updateStatusMutation.mutate({
        id: selectedComplaint._id,
        status: 'dismissed',
        notes: adminNotes,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Complaint Management</h1>
        <p className="text-muted-foreground">Review and resolve customer complaints.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Search by subject or customer…"
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
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load complaints" icon={<AlertTriangle className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No complaints found" icon={<AlertTriangle className="h-8 w-8" />} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['ID', 'Customer', 'Worker', 'Subject', 'Priority', 'Status', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((c: Complaint, i: number) => (
                    <motion.tr
                      key={c._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/20 transition"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{c._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={c.customer.avatar} />
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {initials(c.customer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{c.customer.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.worker.name}</td>
                      <td className="px-4 py-3 font-medium">{c.subject}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn('capitalize border text-xs', PRIORITY_COLORS[c.priority])}>
                          {c.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('capitalize border text-xs', STATUS_COLORS[c.status])}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => openDetailDialog(c)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {c.status !== 'resolved' && c.status !== 'dismissed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-primary hover:bg-primary/10"
                              onClick={() => openResolveDialog(c)}
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
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>Full complaint information and history.</DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedComplaint.customer.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials(selectedComplaint.customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedComplaint.customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedComplaint.worker.avatar} />
                    <AvatarFallback className="bg-accent/10 text-accent">
                      {initials(selectedComplaint.worker.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Worker</p>
                    <p className="font-medium">{selectedComplaint.worker.name}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Subject</h4>
                <p className="text-sm">{selectedComplaint.subject}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedComplaint.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Priority</h4>
                  <Badge className={cn('capitalize border', PRIORITY_COLORS[selectedComplaint.priority])}>
                    {selectedComplaint.priority}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Status</h4>
                  <Badge className={cn('capitalize border', STATUS_COLORS[selectedComplaint.status])}>
                    {selectedComplaint.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Filed On</h4>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedComplaint.createdAt)}</p>
                </div>
              </div>

              {selectedComplaint.adminNotes && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Admin Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedComplaint.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Complaint</DialogTitle>
            <DialogDescription>Add resolution notes and mark as resolved or dismissed.</DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Subject</h4>
                <p className="text-sm">{selectedComplaint.subject}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="adminNotes" className="text-sm font-semibold">Admin Notes</label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add resolution details or reason for dismissal..."
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleResolve}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Mark Resolved
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDismiss}
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
                      <X className="h-4 w-4" /> Dismiss
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
