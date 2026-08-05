import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Package,
  Search,
  IndianRupee,
  Clock,
  Zap,
  CalendarClock,
  House,
  Timer,
  Hammer,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { BiddingProvider, useBidding, useOpenJobs } from '@/features/bidding';
import { useSocketEvent } from '@/hooks/useSocket';
import { categoryService } from '@/services';
import type { OpenJob, SubmitBidPayload, Category } from '@/features/bidding/types';

export function WorkerMarketplacePage() {
  return (
    <BiddingProvider>
      <WorkerMarketplaceContent />
    </BiddingProvider>
  );
}

export default WorkerMarketplacePage;

const URGENCY_LABEL: Record<string, { label: string; Icon: typeof Zap; cls: string }> = {
  asap: { label: 'ASAP', Icon: Zap, cls: 'text-red-600 bg-red-100 dark:bg-red-900/20' },
  today: { label: 'Today', Icon: CalendarClock, cls: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20' },
  weekend: { label: 'This Weekend', Icon: House, cls: 'text-green-600 bg-green-100 dark:bg-green-900/20' },
  anytime: { label: 'Anytime', Icon: Timer, cls: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20' },
};

/**
 * Converts a `bidding:new-job` socket payload into an OpenJob.
 * Socket emits are pre-camelized by the backend, but `id` becomes `_id`.
 */
function socketJobToOpenJob(payload: Record<string, unknown>): OpenJob {
  const { _id, ...rest } = payload;
  return { id: (_id ?? rest.id) as string, ...(rest as Omit<OpenJob, 'id'>) } as OpenJob;
}

function WorkerMarketplaceContent() {
  const qc = useQueryClient();
  const { submitBid } = useBidding();
  const { data: jobs, isLoading } = useOpenJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [biddingJobId, setBiddingJobId] = useState<string | null>(null);

  const newJobEvent = useSocketEvent<{ job: Record<string, unknown> }>('bidding:new-job');
  const messageEvent = useSocketEvent<{ job?: Record<string, unknown>; message?: Record<string, unknown> }>('bidding:message');

  useEffect(() => {
    if (!messageEvent.data?.message) return;
    const m = messageEvent.data.message;
    const jobTitle = (messageEvent.data.job?.title as string) ?? 'your job';
    const price = m.proposedPrice as number | undefined;
    const text = m.message as string | undefined;
    if (typeof price === 'number' && !Number.isNaN(price)) {
      toast(`Counter offer on "${jobTitle}" — New price: ₹${price}${text ? ` — ${text}` : ''}`, {
        icon: '🏷️',
      });
    } else if (text) {
      toast(`New message on "${jobTitle}": ${text}`, { icon: '💬' });
    }
  }, [messageEvent.data]);

  useEffect(() => {
    categoryService
      .list()
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? data : (data as { data?: Category[] }).data ?? [];
        setCategories(arr);
      })
      .catch(() => {
        // silently skip
      });
  }, []);

  useEffect(() => {
    if (!newJobEvent.data?.job) return;
    const job = socketJobToOpenJob(newJobEvent.data.job);
    qc.setQueryData<OpenJob[]>(['bidding-jobs', 'open'], (prev) =>
      prev && prev.some((j) => j.id === job.id) ? prev : [job, ...(prev ?? [])],
    );
    toast.success(`New custom job: ${job.title}`);
  }, [newJobEvent.data, qc]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = jobs ?? [];
    if (!q) return list;
    return list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q),
    );
  }, [jobs, searchQuery]);

  const handleBidSuccess = async () => {
    await qc.invalidateQueries({ queryKey: ['bidding-jobs', 'open'] });
    toast.success('Bid submitted! The customer can now review your offer.');
    setBiddingJobId(null);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display">Job Marketplace</h1>
          <p className="mt-2 text-muted-foreground">
            Custom jobs posted by customers. Place your bid and win the work.
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search open jobs..."
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading open jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No open jobs right now</h3>
            <p className="text-sm text-muted-foreground mb-4">
              When a customer posts a custom job you'll be notified instantly.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                category={job.categoryId ? categories.find((c) => c._id === job.categoryId) : null}
                bidding={biddingJobId === job.id}
                onToggleBid={() =>
                  setBiddingJobId((prev) => (prev === job.id ? null : job.id))
                }
                onSubmitBid={async (payload) => {
                  await submitBid(job.id, payload);
                  await handleBidSuccess();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface JobCardProps {
  job: OpenJob;
  category: Category | null | undefined;
  bidding: boolean;
  onToggleBid: () => void;
  onSubmitBid: (payload: SubmitBidPayload) => Promise<void>;
}

function JobCard({ job, category, bidding, onToggleBid, onSubmitBid }: JobCardProps) {
  const urgency = job.urgency ? URGENCY_LABEL[job.urgency] : null;
  const UrgencyIcon = urgency?.Icon ?? Timer;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn('p-6', job.myBid && 'border-primary/20 ring-1 ring-primary/10')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">{job.title}</h3>
              <span
                className={
                  job.status === 'open'
                    ? 'text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded-full'
                    : 'text-xs font-medium text-muted-foreground bg-muted/20 px-2 py-1 rounded-full'
                }
              >
                {job.status}
              </span>
            </div>
            {category && (
              <span className="text-xs text-muted-foreground">Category: {category.name}</span>
            )}
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{job.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-foreground">
                Budget: {formatCurrency(job.budgetMin)} - {formatCurrency(job.budgetMax)}
              </span>
              {urgency && (
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', urgency.cls)}>
                  <UrgencyIcon className="h-3 w-3" />
                  {urgency.label}
                </span>
              )}
              {job.preferredTime && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Preferred: {new Date(job.preferredTime).toLocaleString()}
                </span>
              )}
              {job.createdAt && (
                <span className="text-xs text-muted-foreground">
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {job.images.length > 0 && (
              <div className="mt-3 flex gap-2">
                {job.images.slice(0, 3).map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            {job.myBid ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium">
                  Your bid: {formatCurrency(job.myBid.bidAmount)}
                </span>
                <span className="text-muted-foreground">· {job.myBid.status}</span>
                {job.myBid.estimatedTime && (
                  <span className="text-muted-foreground">· ETA {job.myBid.estimatedTime}</span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto rounded-full text-primary"
                  onClick={onToggleBid}
                >
                  Update bid
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant={bidding ? 'ghost' : 'outline'}
                onClick={onToggleBid}
                className="mt-4 gap-2 rounded-full"
              >
                <Hammer className="h-4 w-4" />
                {bidding ? 'Cancel' : 'Place a bid'}
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {bidding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <BidForm
                job={job}
                defaultAmount={job.myBid?.bidAmount}
                defaultTime={job.myBid?.estimatedTime ?? undefined}
                defaultMessage={job.myBid?.message ?? undefined}
                onSubmit={onSubmitBid}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

interface BidFormProps {
  job: OpenJob;
  defaultAmount?: number;
  defaultTime?: string;
  defaultMessage?: string;
  onSubmit: (payload: SubmitBidPayload) => Promise<void>;
}

function BidForm({ job, defaultAmount, defaultTime, defaultMessage, onSubmit }: BidFormProps) {
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [estimatedTime, setEstimatedTime] = useState(defaultTime ?? '');
  const [message, setMessage] = useState(defaultMessage ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError('Enter a valid bid amount');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ bidAmount: value, estimatedTime: estimatedTime || undefined, message: message || undefined });
    } catch {
      setError('Could not submit bid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl bg-muted/40 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`bid-amount-${job.id}`}>Your price (₹)</Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id={`bid-amount-${job.id}`}
              type="number"
              min={0}
              placeholder={`Customer budget: ${formatCurrency(job.budgetMin)} - ${formatCurrency(job.budgetMax)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`bid-time-${job.id}`}>Estimated time</Label>
          <Input
            id={`bid-time-${job.id}`}
            placeholder="e.g. 3 hours"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`bid-message-${job.id}`}>Message (optional)</Label>
        <Textarea
          id={`bid-message-${job.id}`}
          placeholder="Tell the customer why you're the right fit..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="gap-2 rounded-full">
          {submitting ? 'Submitting...' : 'Submit bid'}
          {!submitting && <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
