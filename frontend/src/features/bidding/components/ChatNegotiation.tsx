import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  IndianRupee,
  User,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import { useBidding, useJobMessages } from '../BiddingContext';
import type { WorkerBid, NegotiationMessage } from '../types';

interface ChatNegotiationProps {
  open: boolean;
  jobId: string;
  worker: WorkerBid;
  onClose: () => void;
}

export function ChatNegotiation({ open, jobId, worker, onClose }: ChatNegotiationProps) {
  const { sendMessage } = useBidding();
  const { data: messages, refetch, isLoading } = useJobMessages(jobId);
  const [text, setText] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(jobId, {
        message: text.trim(),
        proposedPrice: proposedPrice ? parseFloat(proposedPrice) : undefined,
      });
      setText('');
      setProposedPrice('');
      await refetch();
    } catch {
      // error handled by parent context
    } finally {
      setSending(false);
    }
  };

  const handleConfirmPrice = async () => {
    if (!proposedPrice) return;
    setSending(true);
    try {
      await sendMessage(jobId, {
        message: `I confirm ${formatCurrency(parseFloat(proposedPrice))} as final price`,
        proposedPrice: parseFloat(proposedPrice),
      });
      setProposedPrice('');
      await refetch();
    } catch {
      // error handled by parent
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const currentUserId = worker.workerId;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative mx-4 flex h-[70vh] w-full max-w-lg flex-col rounded-2xl bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                {worker.workerAvatar ? (
                  <img
                    src={worker.workerAvatar}
                    alt={worker.workerName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {worker.workerName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
              </div>
              <div>
                <h3 className="font-semibold">{worker.workerName}</h3>
                <p className="text-sm text-muted-foreground">{worker.workerProfession}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-muted text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading messages...</div>
            ) : !messages || messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No messages yet. Start the conversation below.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex max-w-[80%]',
                        isOwn ? 'ml-auto flex-col items-end' : 'items-start',
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2 text-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50',
                        )}
                      >
                        {msg.message && <p>{msg.message}</p>}
                        {msg.proposedPrice !== null && msg.proposedPrice !== undefined && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg bg-background/20 px-2 py-1 text-xs font-medium">
                            <IndianRupee className="h-3 w-3" />
                            <span>Proposed: {formatCurrency(msg.proposedPrice)}</span>
                          </div>
                        )}
                        <div className="mt-1 text-xs opacity-60">
                          {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Price Confirmation Banner */}
          {proposedPrice && (
            <div className="border-t px-4 py-3 bg-muted/30">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Confirm final price: {formatCurrency(parseFloat(proposedPrice))}</span>
                <Button size="sm" variant="ghost" onClick={handleConfirmPrice} disabled={sending}>
                  <Check className="h-4 w-4 mr-1" />
                  Confirm
                </Button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t px-4 py-3">
            <div className="mb-2 flex gap-2">
              <Input
                type="number"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                placeholder="Propose a price (₹)"
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                size="sm"
                className="px-3"
              >
                {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
