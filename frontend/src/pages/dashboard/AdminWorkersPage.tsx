import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Wrench, Search, Trash2, Loader2, Star, BadgeCheck, ToggleLeft, ToggleRight, ShieldCheck } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency, initials } from '@/utils/format';
import type { Worker } from '@/types';

const LIMIT = 15;

export default function AdminWorkersPage() {
  const qc = useQueryClient();
  const [page, setPage]             = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');

  const params = { page, limit: LIMIT, search: search || undefined };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.workers(params as Record<string, unknown>),
    queryFn: () => adminService.workers(params),
  });

  const toggleMutation = useMutation({
    mutationFn: (w: Worker) =>
      adminService.updateWorker(w._id, { isOnline: !w.isOnline } as Partial<Worker>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'workers'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteWorker(id),
    onSuccess: () => {
      toast.success('Worker deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'workers'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Manage Workers</h1>
        <p className="text-muted-foreground">View, toggle availability, and remove workers.</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Search by name or profession…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setSearch(searchInput); setPage(1); }} variant="outline" className="rounded-full gap-2 shrink-0">
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load workers" icon={<Wrench className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No workers found" icon={<Wrench className="h-8 w-8" />} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['Worker', 'Profession', 'Rating', 'Jobs', 'Rate', 'Online', 'Aadhaar', 'Verified', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((w, i) => (
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
                          <span className="font-medium">{w.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{w.profession}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 font-medium">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {w.rating?.toFixed(1) ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{w.completedJobs}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(w.hourlyRate)}/hr</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleMutation.mutate(w)}
                          disabled={toggleMutation.isPending}
                          className="transition"
                          aria-label={w.isOnline ? 'Set offline' : 'Set online'}
                        >
                          {w.isOnline
                            ? <ToggleRight className="h-5 w-5 text-success" />
                            : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {w.aadhaarVerified
                          ? <ShieldCheck className="h-4 w-4 text-success" />
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {w.isVerified
                          ? <BadgeCheck className="h-4 w-4 text-success" />
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete worker?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {w.name}'s account. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(w._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
