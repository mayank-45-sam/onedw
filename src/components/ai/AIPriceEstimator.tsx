import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Sparkles, TrendingUp, Clock, Gauge, ArrowRight, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { searchService, type PriceEstimateInput, type PriceEstimate } from '@/services/search.service';
import { queryKeys } from '@/lib/queryClient';
import { formatCurrency, formatDuration } from '@/utils/format';
import { cn } from '@/lib/utils';
import { isApiError } from '@/lib/apiError';

const URGENCY_OPTIONS: { value: NonNullable<PriceEstimateInput['urgency']>; label: string }[] = [
  { value: 'low', label: 'Low — anytime this week' },
  { value: 'normal', label: 'Normal — within 2 days' },
  { value: 'high', label: 'High — within 24 hours' },
  { value: 'emergency', label: 'Emergency — ASAP' },
];

function ConfidenceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted" />
        <circle
          cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="text-primary transition-all duration-700"
        />
      </svg>
      <span className="absolute text-sm font-bold">{pct}%</span>
    </div>
  );
}

function ResultCard({ estimate }: { estimate: PriceEstimate }) {
  const trendMax = Math.max(...estimate.monthlyTrend.map((t) => t.value), 1);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-gradient-to-br from-primary/5 to-accent/5 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wide text-primary">AI estimate</span>
          </div>
          <p className="mt-2 text-4xl font-extrabold font-display gradient-text">{formatCurrency(estimate.estimated)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Estimated price for your job</p>
        </div>
        <ConfidenceRing value={estimate.confidence} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Minimum', value: estimate.minimum, tone: 'text-success' },
          { label: 'Average', value: estimate.average, tone: 'text-muted-foreground' },
          { label: 'Maximum', value: estimate.maximum, tone: 'text-error' },
        ].map((row) => (
          <div key={row.label} className="rounded-2xl bg-card p-3 text-center">
            <p className={cn('text-lg font-bold', row.tone)}>{formatCurrency(row.value)}</p>
            <p className="text-xs text-muted-foreground">{row.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Badge variant="secondary" className="gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(estimate.timeEstimateMinutes)}</Badge>
        <Badge variant="outline" className="gap-1"><Gauge className="h-3.5 w-3.5" /> {Math.round(estimate.confidence * 100)}% confidence</Badge>
      </div>

      {estimate.monthlyTrend.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> This month's price trend
          </p>
          <div className="flex items-end gap-1.5">
            {estimate.monthlyTrend.map((point) => (
              <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(point.value / trendMax) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[18px] rounded-t bg-brand-gradient"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface AIPriceEstimatorProps {
  initialServiceId?: string;
  initialServiceName?: string;
  className?: string;
  onBookNow?: () => void;
}

export function AIPriceEstimator({ initialServiceId, initialServiceName, className, onBookNow }: AIPriceEstimatorProps) {
  const [form, setForm] = useState<PriceEstimateInput>({
    serviceId: initialServiceId,
    serviceName: initialServiceName,
    problemDescription: '',
    location: '',
    urgency: 'normal',
  });
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState<PriceEstimateInput | null>(null);

  const estimateQuery = useQuery({
    queryKey: queryKeys.search.estimatePrice(submitted as Record<string, unknown>),
    queryFn: async () => {
      const result = await searchService.estimatePrice(submitted as PriceEstimateInput);
      return result;
    },
    enabled: submitted !== null,
  });

  if (estimateQuery.isError) {
    // Error handled by React Query
  }

  const canSubmit = Boolean(form.serviceName || form.serviceId) && (form.problemDescription?.trim().length ?? 0) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitted({ ...form });
  };

  const update = (patch: Partial<PriceEstimateInput>) => setForm((p) => ({ ...p, ...patch }));

  return (
    <div className={cn('card-premium overflow-hidden p-0', className)}>
      <div className="bg-brand-gradient p-5 text-white">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <h3 className="font-bold font-display">AI Price Estimator</h3>
        </div>
        <p className="mt-1 text-sm text-white/80">Get an instant price estimate before you book.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="ai-service">Service</Label>
          <Input
            id="ai-service"
            value={form.serviceName ?? ''}
            onChange={(e) => update({ serviceName: e.target.value })}
            placeholder="e.g. AC repair, deep cleaning"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-problem">Problem description</Label>
          <Textarea
            id="ai-problem"
            value={form.problemDescription ?? ''}
            onChange={(e) => update({ problemDescription: e.target.value })}
            placeholder="Describe the issue — e.g. 'Split AC not cooling, needs gas refill'"
            rows={3}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-location" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location</Label>
            <Input
              id="ai-location"
              value={form.location ?? ''}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="City or area"
            />
          </div>
          <div className="space-y-2">
            <Label>Urgency</Label>
            <Select value={form.urgency ?? 'normal'} onValueChange={(v) => update({ urgency: v as PriceEstimateInput['urgency'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" disabled={!canSubmit} className="btn-glow w-full gap-2 rounded-xl">
          <Sparkles className="h-4 w-4" /> Get estimate
        </Button>
      </form>

      <div className="px-6 pb-6">
        <AnimatePresence mode="wait">
          {estimateQuery.isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="h-24 rounded-3xl shimmer" />
              <div className="h-10 w-full rounded-2xl shimmer" />
            </motion.div>
          )}
          {estimateQuery.isError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-error/20 bg-error/5 p-4 text-center text-sm text-muted-foreground space-y-2">
              <p>{isApiError(estimateQuery.error) ? estimateQuery.error.message : "Couldn't generate an estimate right now."}</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (submitted) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.search.estimatePrice(submitted as Record<string, unknown>) });
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </motion.div>
          )}
          {estimateQuery.data && (
            <div>
              <ResultCard estimate={estimateQuery.data} />
              {onBookNow && (
                <Button onClick={onBookNow} className="btn-glow mt-4 w-full gap-2 rounded-xl">
                  Book at this estimate <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
