import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search,
  Loader2,
  Eye,
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquarePlus,
  ClipboardCheck,
  GraduationCap,
  Award,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDate, initials } from '@/utils/format';
import type { Verification } from '@/types/verification';

const LIMIT = 15;

const ADMIN_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-error/10 text-error border-error/30',
};

const FLOW_STYLES: Record<string, string> = {
  completed: 'bg-success/10 text-success border-success/30',
  in_progress: 'bg-primary/10 text-primary border-primary/30',
  failed: 'bg-error/10 text-error border-error/30',
};

function AdminPill({ label, styles }: { label: string; styles: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles}`}>
      {label.replace('_', ' ')}
    </span>
  );
}

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value != null ? `${Math.round(value)}/100` : '—'}</span>
      </div>
      <Progress value={value ?? 0} className="h-2" />
    </div>
  );
}

export default function AdminVerificationPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [adminStatus, setAdminStatus] = useState('all');
  const [badgeFilter, setBadgeFilter] = useState('all');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const params = {
    page,
    limit: LIMIT,
    search: search || undefined,
    admin_status: adminStatus === 'all' ? undefined : adminStatus,
    badge: badgeFilter === 'all' ? undefined : badgeFilter,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.verification.list(params as Record<string, unknown>),
    queryFn: () => adminService.verifications(params),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.admin.verification.stats,
    queryFn: () => adminService.verificationStats(),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.admin.verification.detail(selectedId ?? ''),
    queryFn: () => adminService.verificationDetail(selectedId as string),
    enabled: !!selectedId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'verification'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminService.approveVerification(id),
    onSuccess: () => {
      toast.success('Verification approved');
      setSelectedId(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Approve failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminService.rejectVerification(id),
    onSuccess: () => {
      toast.success('Verification rejected');
      setSelectedId(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Reject failed'),
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => adminService.addVerificationNote(id, note),
    onSuccess: () => {
      toast.success('Note added');
      setNoteText('');
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add note'),
  });

  const retakeMutation = useMutation({
    mutationFn: (id: string) => adminService.allowVerificationRetake(id),
    onSuccess: () => {
      toast.success('Retake allowed');
      setSelectedId(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not allow retake'),
  });

  const demoMutation = useMutation({
    mutationFn: () => adminService.loadDemoVerifications(),
    onSuccess: (res) => {
      toast.success(`Demo data ready (${res.created} created, ${res.updated} updated)`);
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Demo load failed'),
  });

  const stats = statsQuery.data;
  const detail = detailQuery.data;
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;
  const isReviewing = approveMutation.isPending || rejectMutation.isPending || retakeMutation.isPending;

  const statCards = stats
    ? [
        { label: 'Total attempts', value: stats.total, icon: ClipboardCheck, cls: 'text-primary bg-primary/10' },
        { label: 'Pending review', value: stats.pending, icon: Eye, cls: 'text-warning bg-warning/10' },
        { label: 'Approved', value: stats.approved, icon: CheckCircle2, cls: 'text-success bg-success/10' },
        { label: 'Rejected', value: stats.rejected, icon: XCircle, cls: 'text-error bg-error/10' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Skill Verification Hub</h1>
          <p className="text-muted-foreground">Review worker skill tests, practicals, and interviews.</p>
        </div>
        <Button
          onClick={() => demoMutation.mutate()}
          disabled={demoMutation.isPending}
          variant="outline"
          className="rounded-full gap-2"
        >
          {demoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          Demo Mode: load samples
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.cls}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Search by name, email, or profession…"
            className="pl-9"
          />
        </div>
        <Select value={adminStatus} onValueChange={(v) => { setAdminStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={badgeFilter} onValueChange={(v) => { setBadgeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue placeholder="Filter badge" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All badges</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setSearch(searchInput); setPage(1); }} variant="outline" className="rounded-full gap-2 shrink-0">
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>

      {stats && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Badge breakdown:</span>
          {(['gold', 'pro', 'beginner', 'rejected'] as const).map((b) => (
            <div key={b} className="flex items-center gap-1.5">
              <VerificationBadge badge={b} size="xs" />
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">× {stats.badgeCounts[b] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load verifications" icon={<ShieldCheck className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState
          title="No verifications found"
          description="Workers haven't completed the skill verification yet, or no result matches your filters."
          icon={<ShieldCheck className="h-8 w-8" />}
        />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['Worker', 'Profession', 'Score', 'Badge', 'Status', 'Submitted', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((v, i) => (
                    <motion.tr
                      key={v._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/20 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={v.avatar ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {initials(v.workerName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{v.workerName ?? '—'}</p>
                            <p className="truncate text-xs text-muted-foreground">{v.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.profession}
                        {v.isDemo && (
                          <span className="ml-1.5 inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            demo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {v.trustScore != null ? `${Math.round(v.trustScore)}/100` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {v.badge ? <VerificationBadge badge={v.badge} size="xs" /> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {v.adminStatus && <AdminPill label={v.adminStatus} styles={ADMIN_STATUS_STYLES[v.adminStatus]} />}
                          <AdminPill label={v.status} styles={FLOW_STYLES[v.status]} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {v.submittedAt ? formatDate(v.submittedAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => setSelectedId(v._id)}>
                          <Eye className="h-3.5 w-3.5" /> Review
                        </Button>
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

      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) { setSelectedId(null); setNoteText(''); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Verification review
            </DialogTitle>
            <DialogDescription>
              {detail?.workerName ?? 'Worker'} · {detail?.profession ?? '…'} · attempt {detail?.attemptNumber ?? '—'}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <LoadingState title="Loading review…" />
          ) : detailQuery.isError ? (
            <ErrorState title="Couldn't load verification" icon={<ShieldCheck className="h-8 w-8" />} />
          ) : detail ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {detail.badge && <VerificationBadge badge={detail.badge} showScore={detail.trustScore != null} trustScore={detail.trustScore} size="md" />}
                <AdminPill label={detail.adminStatus} styles={ADMIN_STATUS_STYLES[detail.adminStatus]} />
                <AdminPill label={detail.status} styles={FLOW_STYLES[detail.status]} />
                {detail.isDemo && <Badge variant="secondary" className="gap-1"><FlaskConical className="h-3 w-3" /> demo</Badge>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ScoreRow label="Technical" value={detail.technicalScore} />
                <ScoreRow label="Practical" value={detail.practicalScore} />
                <ScoreRow label="Interview" value={detail.interviewScore} />
                <ScoreRow label="Documents" value={detail.documentsScore} />
                <ScoreRow label="Experience" value={detail.experienceScore} />
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">Overall trust score</span>
                    <span className="font-bold tabular-nums">{detail.trustScore != null ? `${Math.round(detail.trustScore)}/100` : '—'}</span>
                  </div>
                  <Progress value={detail.trustScore ?? 0} className="h-2.5" />
                </div>
              </div>

              {detail.skillTest && (
                <div className="rounded-xl border p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <GraduationCap className="h-4 w-4 text-primary" /> Skill test
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">Score {detail.skillTest.score != null ? Math.round(detail.skillTest.score) : '—'}/100</span>
                    <span className="rounded-full bg-muted px-2 py-1">Tab switches: {detail.skillTest.tabSwitchCount}</span>
                    <span className="rounded-full bg-muted px-2 py-1">Warnings: {detail.skillTest.warningsIssued}</span>
                    <span className="rounded-full bg-muted px-2 py-1">Skipped: {detail.skillTest.skippedCount}</span>
                    <span className="rounded-full bg-muted px-2 py-1">Suspicious fast: {detail.skillTest.suspiciousFastAnswers.length}</span>
                  </div>
                  {detail.skillTest.failed && (
                    <p className="mt-2 text-xs font-medium text-error">Auto-failed due to anti-cheat policy.</p>
                  )}
                </div>
              )}

              {detail.practical && detail.practical.mediaUrls.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Practical work samples</h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.practical.mediaUrls.map((m, i) => (
                      <a key={i} href={m.url} target="_blank" rel="noreferrer" className="group relative">
                        <img src={m.url} alt={`Work sample ${i + 1}`} className="h-20 w-20 rounded-xl border object-cover transition group-hover:opacity-80" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {detail.documentMedia && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold">Documents:</span>
                  <span className="text-muted-foreground">
                    {detail.documentMedia.certificateImages.length} cert image(s) · {detail.documentMedia.workPhotos.length} work photo(s)
                    {detail.documentMedia.workVideos.length > 0 && ` · ${detail.documentMedia.workVideos.length} video(s)`}
                  </span>
                </div>
              )}

              {detail.interview && detail.interview.exchanges.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Interview transcript</h3>
                  {detail.interview.exchanges.map((ex, i) => (
                    <div key={i} className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="font-medium text-primary">Q: {ex.aiQuestion}</p>
                      {ex.workerAnswer && <p className="mt-1 text-muted-foreground">A: {ex.workerAnswer}</p>}
                    </div>
                  ))}
                </div>
              )}

              {detail.trainingRecommendations && detail.trainingRecommendations.length > 0 && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Award className="h-4 w-4 text-warning" /> Training recommendations
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {detail.trainingRecommendations.map((r, i) => (
                      <li key={i}>• {r.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.certificate && (
                <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                  <h3 className="mb-2 font-semibold">Certificate</h3>
                  <p>Number: {detail.certificate.certificateNo ?? '—'}</p>
                  <p className="text-muted-foreground">Issued: {detail.certificate.issuedAt ? formatDate(detail.certificate.issuedAt) : '—'}</p>
                  {detail.certificate.qrCodeUrl && (
                    <img src={detail.certificate.qrCodeUrl} alt="Certificate QR" className="mt-2 h-20 w-20 rounded-lg border bg-white p-1" />
                  )}
                </div>
              )}

              {detail.adminNotes && (
                <div className="rounded-xl bg-muted/40 p-3 text-sm">
                  <h3 className="mb-1 font-semibold">Admin notes</h3>
                  <p className="whitespace-pre-line text-muted-foreground">{detail.adminNotes}</p>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Add a note</h3>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Internal note for the reviewer…"
                  rows={2}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={() => noteMutation.mutate({ id: detail._id, note: noteText })}
                  disabled={!noteText.trim() || noteMutation.isPending}
                >
                  {noteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
                  Save note
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={() => retakeMutation.mutate(detail._id)}
                  disabled={detail.status === 'in_progress' || isReviewing}
                >
                  {retakeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Allow retake
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-1.5 text-error hover:bg-error/10"
                      disabled={isReviewing || detail.adminStatus === 'rejected'}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject this verification?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This sets the badge to rejected, unverifies the worker, and enforces a 7-day retry cooldown.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => rejectMutation.mutate(detail._id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={() => approveMutation.mutate(detail._id)}
                  disabled={isReviewing || detail.adminStatus === 'approved' || detail.status !== 'completed'}
                >
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
