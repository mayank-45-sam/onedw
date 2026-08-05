import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  Clock,
  IndianRupee,
  MessageCircle,
  Star,
  User,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StarRating } from '@/components/common/StarRating';
import { formatCurrency } from '@/utils/format';
import { useBidding, useJobBids } from '../BiddingContext';
import { ChatNegotiation } from './ChatNegotiation';
import type { CustomJob, WorkerBid } from '../types';

interface BidsDashboardProps {
  open: boolean;
  job: CustomJob;
  onClose: () => void;
  onBidAccepted?: (result: { job: CustomJob; acceptedBid: WorkerBid }) => void;
}

export function BidsDashboard({ open, job, onClose, onBidAccepted }: BidsDashboardProps) {
  const { acceptBid } = useBidding();
  const { data: bids, refetch, isLoading } = useJobBids(job.id);
  const [refreshing, setRefreshing] = useState(false);
  const [chatOpen, setChatOpen] = useState<WorkerBid | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAccept = async (bid: WorkerBid) => {
    setAcceptingId(bid.id);
    try {
      const result = await acceptBid(bid.id);
      onBidAccepted?.(result);
      refetch();
    } catch {
      // error handling by parent
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCounterOffer = (bid: WorkerBid) => {
    setChatOpen(bid);
  };

  const handleChatOpen = (bid: WorkerBid) => {
    setChatOpen(bid);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!open) return null;

  const pendingBids = bids?.filter((b) => b.status === 'pending') ?? [];
  const otherBids = bids?.filter((b) => b.status !== 'pending') ?? [];

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative mx-4 w-full max-w-3xl rounded-2xl bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between rounded-t-2xl border-b px-6 py-4">
              <div>
                <h3 className="font-semibold font-display text-lg">Bids for: {job.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {bids?.length ?? 0} bids received
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1 hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading bids...
                </div>
              ) : bids && bids.length === 0 ? (
                <div className="py-12 text-center">
                  <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No bids yet. Professionals will appear here once they review your request.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Pending bids first */}
                  {pendingBids.map((bid) => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      showActions
                      accepting={acceptingId === bid.id}
                      onAccept={() => handleAccept(bid)}
                      onCounterOffer={() => handleCounterOffer(bid)}
                      onChat={() => handleChatOpen(bid)}
                    />
                  ))}
                  {/* Other status bids */}
                  {otherBids
                    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
                    .map((bid) => (
                      <BidCard
                        key={bid.id}
                        bid={bid}
                        showActions={false}
                        accepting={acceptingId === bid.id}
                        onAccept={() => handleAccept(bid)}
                        onCounterOffer={() => handleCounterOffer(bid)}
                        onChat={() => handleChatOpen(bid)}
                      />
                    ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                Refresh Bids
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {chatOpen && (
        <ChatNegotiation
          open={true}
          jobId={job.id}
          worker={chatOpen}
          onClose={() => setChatOpen(null)}
        />
      )}
    </>
  );
}

interface BidCardProps {
  bid: WorkerBid;
  showActions: boolean;
  accepting: boolean;
  onAccept: () => void;
  onCounterOffer: () => void;
  onChat: () => void;
}

function BidCard({ bid, showActions, accepting, onAccept, onCounterOffer, onChat }: BidCardProps) {
  const isPending = bid.status === 'pending';
  const isAccepted = bid.status === 'accepted';

  return (
    <Card
      className={cn(
        'p-4 transition-all',
        isAccepted && 'border-green-500/30 bg-green-50/30',
        isPending && 'border-primary/20 ring-1 ring-primary/10',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          {bid.workerAvatar ? (
            <img src={bid.workerAvatar} alt={bid.workerName} className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xs font-bold">
              {bid.workerName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
          )}
          {isAccepted && (
            <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 text-white" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{bid.workerName}</h4>
            <StarRating rating={bid.workerRating} size={12} showValue={false} />
          </div>

          <p className="text-sm text-muted-foreground">{bid.workerProfession}</p>

          <div className="flex items-center gap-4 text-sm">
            {bid.workerTrustScore !== null && bid.workerTrustScore !== undefined && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Trust: {bid.workerTrustScore}%
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {bid.workerReviewCount} reviews
            </span>
          </div>

          <div className="flex items-center gap-2 text-lg font-bold">
            <IndianRupee className="h-4 w-4" />
            {formatCurrency(bid.bidAmount)}
          </div>

          {bid.estimatedTime && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              ETA: {bid.estimatedTime}
            </div>
          )}

          {bid.message && (
            <p className="text-sm text-muted-foreground italic">&ldquo;{bid.message}&rdquo;</p>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Status: <span className="font-medium capitalize">{bid.status}</span>
            </span>
            <span className="text-muted-foreground">
              {bid.createdAt && new Date(bid.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {showActions && isPending && (
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={onAccept}
              disabled={accepting}
              className="gap-1"
            >
              {accepting ? 'Accepting...' : 'Accept'}
              <CheckCircle2 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={onCounterOffer} className="gap-1">
              Counter
              <IndianRupee className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onChat} className="gap-1">
              <MessageCircle className="h-3 w-3" />
            </Button>
          </div>
        )}

        {showActions && !isPending && (
          <button
            onClick={onChat}
            className="rounded-lg border border-border p-2 hover:bg-muted"
            title="Open chat"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </Card>
  );
}
