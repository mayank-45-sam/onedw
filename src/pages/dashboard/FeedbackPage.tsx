import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, ChevronLeft, Loader2, Send } from 'lucide-react';
import { reviewSchema, type ReviewFormData } from '@/utils/validation';
import { reviewService } from '@/services/review.service';
import { bookingService } from '@/services/booking.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { ImageUpload } from '@/components/common/ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/common/States';
import { cn } from '@/lib/utils';

const CRITERIA: { key: keyof Pick<ReviewFormData, 'behaviour' | 'quality' | 'price' | 'time'> ; label: string }[] = [
  { key: 'behaviour', label: 'Behaviour' },
  { key: 'quality', label: 'Quality' },
  { key: 'price', label: 'Price' },
  { key: 'time', label: 'Time' },
];

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [overall, setOverall] = useState(0);
  const [criteria, setCriteria] = useState<Record<string, number>>({ behaviour: 0, quality: 0, price: 0, time: 0 });
  const [images, setImages] = useState<string[]>([]);
  const [recommends, setRecommends] = useState(true);

  const booking = useQuery({ queryKey: queryKeys.bookings.detail(id!), queryFn: () => bookingService.detail(id!), enabled: !!id });

  const form = useForm<Pick<ReviewFormData, 'comment'>>({
    defaultValues: { comment: '' },
  });

  const mutation = useMutation({
    mutationFn: () =>
      reviewService.create({
        bookingId: id!,
        workerId: booking.data?.workerId ?? '',
        serviceId: booking.data?.serviceId ?? '',
        rating: overall,
        behaviour: criteria.behaviour,
        quality: criteria.quality,
        price: criteria.price,
        time: criteria.time,
        comment: form.getValues('comment'),
        workImages: images,
        recommends,
      }),
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      navigate('/dashboard');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not submit feedback'),
  });

  if (booking.isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (booking.isError || !booking.data) return <ErrorState className="min-h-[60vh]" title="Booking not found" icon={<Star className="h-8 w-8" />} />;

  const canSubmit = overall > 0 && Object.values(criteria).every((v) => v > 0) && form.getValues('comment').length >= 10;

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"><ChevronLeft className="h-5 w-5" /></Button>
          <h1 className="font-semibold font-display">Leave feedback</h1>
        </div>
      </div>

      <div className="container py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 text-center">
              <h2 className="text-xl font-bold font-display">How was your experience?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Rate {booking.data.worker?.name ?? 'your pro'} for {booking.data.service?.name ?? 'the service'}.</p>
              <div className="mt-6 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setOverall(s)} className={cn('transition-transform hover:scale-125', s <= overall ? 'text-warning' : 'text-muted-foreground/30')}>
                    <Star className="h-10 w-10" style={{ fill: s <= overall ? 'hsl(var(--warning))' : 'transparent' }} />
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>

          <Card className="p-6">
            <h3 className="font-semibold font-display">Rate the details</h3>
            <div className="mt-4 space-y-4">
              {CRITERIA.map((c) => (
                <div key={c.key} className="flex items-center justify-between">
                  <Label>{c.label}</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setCriteria((p) => ({ ...p, [c.key]: s }))}
                        className={cn('transition-transform hover:scale-125', s <= (criteria[c.key] ?? 0) ? 'text-warning' : 'text-muted-foreground/30')}
                      >
                        <Star className="h-5 w-5" style={{ fill: s <= (criteria[c.key] ?? 0) ? 'hsl(var(--warning))' : 'transparent' }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <Label htmlFor="comment">Write a review</Label>
              <Textarea id="comment" rows={4} placeholder="Tell others about your experience…" {...form.register('comment')} />
              {form.formState.errors.comment && <p className="text-sm text-error">{form.formState.errors.comment.message}</p>}
            </div>

            <div className="mt-6">
              <ImageUpload folder="problem" max={4} urls={images} onChange={setImages} label="Upload work images (optional)" />
            </div>

            <div className="mt-6">
              <Label>Would you recommend this worker?</Label>
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => setRecommends(true)}
                  className={cn('flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-3 font-medium transition', recommends ? 'border-success bg-success/5 text-success' : 'hover:border-success/50')}
                >
                  <ThumbsUp className="h-4 w-4" /> Yes, recommend
                </button>
                <button
                  onClick={() => setRecommends(false)}
                  className={cn('flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-3 font-medium transition', !recommends ? 'border-error bg-error/5 text-error' : 'hover:border-error/50')}
                >
                  Not really
                </button>
              </div>
            </div>
          </Card>

          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !canSubmit} className="btn-glow w-full gap-2 rounded-xl">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Submit feedback <Send className="h-4 w-4" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
