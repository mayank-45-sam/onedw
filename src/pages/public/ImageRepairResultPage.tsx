import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Camera, AlertTriangle, Clock, Wrench, Shield,
  ArrowLeft, ChevronRight, Gauge, Zap, CheckCircle2,
} from 'lucide-react';
import { imageAnalysisService } from '@/services/imageAnalysis.service';
import { ImageRepairLoading } from '@/components/ai/ImageRepairLoading';
import { RecommendedWorkerCard } from '@/components/ai/RecommendedWorkerCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { ImageAnalysisResult } from '@/types/imageAnalysis';

const SEVERITY_CONFIG = {
  low: { color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  medium: { color: 'bg-warning/10 text-warning border-warning/20', icon: AlertTriangle },
  high: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
  urgent: { color: 'bg-red-600/10 text-red-600 border-red-600/20', icon: Zap },
} as const;

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: 'text-success' },
  medium: { label: 'Medium', color: 'text-warning' },
  hard: { label: 'Hard', color: 'text-destructive' },
} as const;

function ConfidenceGauge({ value }: { value: number }) {
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
        <motion.circle
          cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-3xl font-extrabold font-display"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, type: 'spring' }}
          style={{ color }}
        >
          {Math.round(value)}%
        </motion.span>
        <span className="text-xs text-muted-foreground mt-0.5">Confidence</span>
      </div>
    </div>
  );
}

export default function ImageRepairResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const file = (location.state as { file?: File })?.file;

  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      navigate('/');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    imageAnalysisService.analyze(file)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    return () => URL.revokeObjectURL(url);
  }, [file, navigate]);

  if (loading) {
    return (
      <div className="container py-10">
        <ImageRepairLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">Analysis Failed</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')} className="mt-6 rounded-xl">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (result.error) {
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">Analysis Failed</h2>
          <p className="mt-2 text-muted-foreground">{result.error}</p>
          <Button onClick={() => navigate('/')} className="mt-6 rounded-xl">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const SeverityIcon = SEVERITY_CONFIG[result.severity]?.icon || AlertTriangle;
  const diffConfig = DIFFICULTY_CONFIG[result.repair_difficulty] || DIFFICULTY_CONFIG.medium;

  return (
    <div className="container py-8 md:py-12">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6 gap-2 rounded-xl"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Button>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: Image + AI Result */}
        <div className="lg:col-span-3 space-y-6">
          {/* Image Preview */}
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="overflow-hidden rounded-3xl border"
            >
              <img src={previewUrl} alt="Damage" className="h-80 w-full object-cover md:h-96" />
            </motion.div>
          )}

          {/* Detection Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Detected Object</p>
                <h2 className="text-2xl font-bold font-display">{result.detected_object ?? 'Unknown'}</h2>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold">Problem Detected</h3>
              <p className="mt-1 text-muted-foreground">{result.problem ?? 'No description available'}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Badge className={cn('gap-1.5 rounded-xl px-3 py-1.5 text-sm', SEVERITY_CONFIG[result.severity]?.color)}>
                <SeverityIcon className="h-4 w-4" />
                {(result.severity ?? 'unknown').charAt(0).toUpperCase() + (result.severity ?? 'unknown').slice(1)} Severity
              </Badge>
              <Badge variant="outline" className={cn('gap-1.5 rounded-xl px-3 py-1.5 text-sm', diffConfig.color)}>
                <Wrench className="h-4 w-4" />
                {diffConfig.label} Repair
              </Badge>
              <Badge variant="secondary" className="gap-1.5 rounded-xl px-3 py-1.5 text-sm">
                <Shield className="h-4 w-4" />
                {result.required_profession || 'General Technician'}
              </Badge>
            </div>
          </motion.div>

          {/* AI Suggestions */}
          {result.ai_suggestions?.length ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl border bg-gradient-to-br from-primary/5 to-accent/5 p-6"
            >
              <h3 className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> AI Suggestions
              </h3>
              <ul className="mt-3 space-y-2">
                {result.ai_suggestions.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {s}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : null}
        </div>

        {/* Right: Stats + Workers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Confidence Gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center rounded-3xl border bg-card p-6"
          >
            <ConfidenceGauge value={result.confidence} />
          </motion.div>

          {/* Price Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border bg-gradient-to-br from-success/5 to-primary/5 p-6"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wide text-primary">AI Estimated Price</span>
            </div>
            <p className="mt-2 text-3xl font-extrabold font-display gradient-text">
              {formatCurrency(result.estimated_price_min)} – {formatCurrency(result.estimated_price_max)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              For {(result.required_profession || 'General Technician')} service
            </p>
          </motion.div>

          {/* Time Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-3xl border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Time</p>
                <p className="text-lg font-bold">
                  {result.estimated_time_minutes < 60
                    ? `${result.estimated_time_minutes} mins`
                    : `${Math.floor(result.estimated_time_minutes / 60)} hr ${result.estimated_time_minutes % 60} min`}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Difficulty Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Gauge className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Repair Difficulty</p>
                <p className={cn('text-lg font-bold', diffConfig.color)}>{diffConfig.label}</p>
              </div>
            </div>
          </motion.div>

          {/* Recommended Workers */}
          {result.recommended_workers?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold font-display">
                <Shield className="h-5 w-5 text-primary" />
                Recommended Workers
              </h3>
              <div className="space-y-3">
                {result.recommended_workers.map((w, i) => (
                  <RecommendedWorkerCard key={w.worker_id} worker={w} index={i} />
                ))}
              </div>
              <Link to="/workers">
                <Button variant="outline" className="mt-4 w-full gap-2 rounded-xl">
                  View All Workers <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
