import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UserCheck, Clock, X, Check, Loader2, Eye, FileText } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
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
import { formatDate, initials } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { PendingWorker } from '@/types';

const LIMIT = 15;

export default function WorkerApprovalQueuePage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedWorker, setSelectedWorker] = useState<PendingWorker | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'worker-approvals', { page, limit: LIMIT }],
    queryFn: () => adminService.workerApprovals({ page, limit: LIMIT }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminService.approveWorker(id),
    onSuccess: () => {
      toast.success('Worker approved');
      qc.invalidateQueries({ queryKey: ['admin', 'worker-approvals'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminService.rejectWorker(id),
    onSuccess: () => {
      toast.success('Worker rejected');
      qc.invalidateQueries({ queryKey: ['admin', 'worker-approvals'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Rejection failed'),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const openDetailDialog = (worker: PendingWorker) => {
    setSelectedWorker(worker);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Worker Approval Queue</h1>
          <p className="text-muted-foreground">Review and approve pending worker applications.</p>
        </div>
        <Badge className="bg-primary/15 text-primary border-primary/30">
          {data?.total ?? 0} Pending
        </Badge>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load approvals" icon={<UserCheck className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No pending approvals" icon={<UserCheck className="h-8 w-8" />} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['Worker', 'Profession', 'Experience', 'Applied', 'Documents', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((w: PendingWorker, i: number) => (
                    <motion.tr
                      key={w._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/20 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={w.avatar} />
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {initials(w.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{w.name}</span>
                            <p className="text-xs text-muted-foreground">{w.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{w.profession}</td>
                      <td className="px-4 py-3 text-muted-foreground">{w.experience}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(w.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" /> {w.documents.length}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => openDetailDialog(w)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-success hover:bg-success/10"
                            onClick={() => approveMutation.mutate(w._id)}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject worker application?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will reject {w.name}'s application. They can reapply later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => rejectMutation.mutate(w._id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
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

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Worker Application Details</DialogTitle>
            <DialogDescription>Review the worker's information and documents.</DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedWorker.avatar} />
                  <AvatarFallback className="bg-primary/10 text-lg text-primary">
                    {initials(selectedWorker.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedWorker.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedWorker.email}</p>
                  {selectedWorker.phone && (
                    <p className="text-sm text-muted-foreground">{selectedWorker.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Profession</h4>
                  <p className="text-sm text-muted-foreground">{selectedWorker.profession}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Experience</h4>
                  <p className="text-sm text-muted-foreground">{selectedWorker.experience}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWorker.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Documents</h4>
                <div className="space-y-2">
                  {selectedWorker.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{doc.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Applied On</h4>
                <p className="text-sm text-muted-foreground">{formatDate(selectedWorker.createdAt)}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    approveMutation.mutate(selectedWorker._id);
                    setIsDetailDialogOpen(false);
                  }}
                  disabled={approveMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Approve
                    </>
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex-1 gap-2">
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject worker application?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reject {selectedWorker.name}'s application. They can reapply later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          rejectMutation.mutate(selectedWorker._id);
                          setIsDetailDialogOpen(false);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
