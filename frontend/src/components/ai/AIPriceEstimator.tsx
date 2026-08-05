import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Sparkles, TrendingUp, Clock, Gauge, ArrowRight,
  MapPin, RefreshCw, Zap, ChevronDown,
} from 'lucide-react';
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

const URGENCY_OPTIONS: { value: NonNullable<PriceEstimateInput['urgency']>; label: string; color: string }[] = [
  { value: 'low',       label: 'Low — anytime this week',  color: 'text-emerald-600' },
  { value: 'normal',    label: 'Normal — within 2 days',   color: 'text-blue-600' },
  { value: 'high',      label: 'High — within 24 hours',   color: 'text-amber-600' },
  { value: 'emergency', label: 'Emergency — ASAP',          color: 'text-red-600' },
];

/* ── Confidence ring ── */
function ConfidenceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative flex h-[72px] w-[72px] items-center justify-center">
      <svg className="h-[72px] w-[72px] -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius} fill="none"
          stroke="url(#ai-ring-grad)" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="ai-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-base font-extrabold text-gray-900">{pct}%</span>
        <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">conf.</span>
      </div>
    </div>
  );
}

/* ── Mini bar chart ── */
function TrendChart({ trend }: { trend: { label: string; value: number }[] }) {
  const max = Math.max(...trend.map((t) => t.value), 1);
  return (
    <div className="mt-5">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
        <TrendingUp className="h-3.5 w-3.5" /> Price trend this month
      </p>
      <div className="flex items-end gap-1.5 rounded-2xl bg-gray-50 px-3 py-4">
        {trend.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-16 w-full items-end justify-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(point.value / max) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="w-full max-w-[14px] rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400"
              />
            </div>
            <span className="text-[10px] font-medium text-gray-400">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Result card ── */
function ResultCard({ estimate }: { estimate: PriceEstimate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50"
    >
      {/* Price hero */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">AI Estimate</span>
          </div>
          <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {formatCurrency(estimate.estimated)}
          </p>
          <p className="mt-1 text-sm text-gray-500">Estimated total for your job</p>
        </div>
        <ConfidenceRing value={estimate.confidence} />
      </div>

      {/* Min/Avg/Max */}
      <div className="grid grid-cols-3 gap-3 px-6 pb-4">
        {[
          { label: 'Min', value: estimate.minimum, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Avg', value: estimate.average, color: 'text-gray-700',    bg: 'bg-gray-50 border-gray-100' },
          { label: 'Max', value: estimate.maximum, color: 'text-red-500',     bg: 'bg-red-50 border-red-100' },
        ].map((row) => (
          <div key={row.label} className={cn('rounded-xl border p-3 text-center', row.bg)}>
            <p className={cn('text-base font-bold', row.color)}>{formatCurrency(row.value)}</p>
            <p className="mt-0.5 text-[11px] font-medium text-gray-400">{row.label}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 px-6 pb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
          <Clock className="h-3.5 w-3.5 text-blue-500" />
          {formatDuration(estimate.timeEstimateMinutes)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
          <Gauge className="h-3.5 w-3.5 text-violet-500" />
          {Math.round(estimate.confidence * 100)}% confidence
        </span>
      </div>

      {/* Trend chart */}
      {estimate.monthlyTrend.length > 0 && (
        <div className="px-6 pb-6">
          <TrendChart trend={estimate.monthlyTrend} />
        </div>
      )}
    </motion.div>
  );
}

/* ── Loading skeleton ── */
function EstimateSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-32 rounded-2xl bg-gray-100" />
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-100" />)}
      </div>
    </div>
  );
}

/* ── Main component ── */
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

  const canSubmit = Boolean(form.serviceName || form.serviceId) && (form.problemDescription?.trim().length ?? 0) > 0;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitted({ ...form });
  };
  const update = (patch: Partial<PriceEstimateInput>) => setForm((p) => ({ ...p, ...patch }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-[0_4px_32px_rgba(0,0,0,0.08)]', className)}
    >
      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-135 from-blue-600 via-blue-500 to-violet-600 px-6 py-5"
           style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #7c3aed 100%)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display tracking-tight">AI Price Estimator</h3>
              <p className="text-sm text-blue-100">Get an instant estimate before you book</p>
            </div>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-4 right-16 h-20 w-20 rounded-full bg-violet-400/20 blur-xl" />
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {/* Service */}
        <div className="space-y-1.5">
          <Label htmlFor="ai-service" className="text-sm font-semibold text-gray-700">Service</Label>
          <Input
            id="ai-service"
            value={form.serviceName ?? ''}
            onChange={(e) => update({ serviceName: e.target.value })}
            placeholder="e.g. AC repair, deep cleaning…"
            className="h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Problem description */}
        <div className="space-y-1.5">
          <Label htmlFor="ai-problem" className="text-sm font-semibold text-gray-700">Problem description</Label>
          <Textarea
            id="ai-problem"
            value={form.problemDescription ?? ''}
            onChange={(e) => update({ problemDescription: e.target.value })}
            placeholder="Describe the issue — e.g. 'Split AC not cooling, needs gas refill'"
            rows={3}
            className="rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-sm resize-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Location + Urgency */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ai-location" className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <MapPin className="h-3.5 w-3.5 text-gray-400" /> Location
            </Label>
            <Input
              id="ai-location"
              value={form.location ?? ''}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="City or area"
              className="h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Urgency</Label>
            <Select value={form.urgency ?? 'normal'} onValueChange={(v) => update({ urgency: v as PriceEstimateInput['urgency'] })}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                {URGENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="rounded-lg text-sm">
                    <span className={cn('font-medium', o.color)}>{o.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={!canSubmit || estimateQuery.isLoading}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200',
            canSubmit && !estimateQuery.isLoading
              ? 'bg-gradient-to-r from-blue-600 to-violet-600 shadow-md shadow-blue-200 hover:from-blue-700 hover:to-violet-700 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          )}
        >
          {estimateQuery.isLoading ? (
            <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Estimating…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Get Estimate</>
          )}
        </button>
      </form>

      {/* ── Results ── */}
      <div className="px-6 pb-6">
        <AnimatePresence mode="wait">
          {estimateQuery.isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EstimateSkeleton />
            </motion.div>
          )}
          {estimateQuery.isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center"
            >
              <p className="text-sm font-medium text-red-600 mb-3">
                {isApiError(estimateQuery.error) ? estimateQuery.error.message : "Couldn't generate an estimate right now."}
              </p>
              <button
                onClick={() => {
                  if (submitted) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.search.estimatePrice(submitted as Record<string, unknown>) });
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </motion.div>
          )}
          {estimateQuery.data && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultCard estimate={estimateQuery.data} />
              {onBookNow && (
                <button
                  onClick={onBookNow}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200 hover:shadow-lg hover:from-blue-700 hover:to-violet-700 hover:-translate-y-0.5 transition-all"
                >
                  Book at this estimate <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
