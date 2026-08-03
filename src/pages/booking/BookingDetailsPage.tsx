import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronLeft, MapPin, Calendar, Clock, CreditCard, Star, MessageSquare,
  Phone, XCircle, Loader2, CheckCircle2, Circle, Camera, BadgeCheck, Hash,
} from 'lucide-react';
import { bookingService } from '@/services/booking.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { useAuth } from '@/contexts/AuthContext';
import { useSocketEvent } from '@/hooks/useSocket';
import { MapView } from '@/components/common/MapView';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate, initials } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import type { BookingStatus, PaymentStatus } from '@/types';
import type { BookingSocketEvent } from '@/types/realtime';

const STATUS_FLOW: { status: BookingStatus; label: string }[] = [
  { status: 'pending',         label: 'Pending' },
  { status: 'accepted',        label: 'Accepted' },
  { status: 'worker-assigned', label: 'Worker Assigned' },
  { status: 'worker-on-the-way', label: 'Worker On The Way' },
  { status: 'arrived',        label: 'Arrived' },
  { status: 'started-work',    label: 'Started Work' },
  { status: 'completed',      label: 'Completed' },
];

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  paid:     { label: 'Paid',     className: 'bg-success/15 text-success border-success/30' },
  unpaid:   { label: 'Unpaid',   className: 'bg-warning/15 text-warning border-warning/30' },
  refunded: { label: 'Refunded', className: 'bg-info/15 text-info border-info/30' },
  failed:   { label: 'Failed',   className: 'bg-error/15 text-error border-error/30' },
};

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [cancelReason, setCancelReason] = useState('');

  const bookingQuery = useQuery({
    queryKey: queryKeys.bookings.detail(id!),
    queryFn: () => bookingService.detail(id!),
    enabled: !!id,
  });

  const updatedEvent = useSocketEvent<BookingSocketEvent>('booking:updated');
  useEffect(() => {
    if (!updatedEvent.data || !id) return;
    if (updatedEvent.data.booking?._id !== id) return;
    qc.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
    qc.invalidateQueries({ queryKey: ['bookings'] });
    if (user?.role === 'customer' && updatedEvent.data.message) {
      toast(updatedEvent.data.message);
    }
  }, [updatedEvent.data, id, qc, user?.role]);

  const cancelMutation = useMutation({
    mutationFn: () => bookingService.cancel(id!, cancelReason),
    onSuccess: () => {
      toast.success('Booking cancelled');
      qc.invalidateQueries({ queryKey: queryKeys.bookings.detail(id!) });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not cancel'),
  });

  if (bookingQuery.isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (bookingQuery.isError) return <ErrorState className="min-h-[60vh]" title="Booking not found" icon={<Star className="h-8 w-8" />} />;
  if (!bookingQuery.data) return <EmptyState className="min-h-[60vh]" title="Booking not found" icon={<Star className="h-8 w-8" />} />;

  const b = bookingQuery.data;
  const currentStep = STATUS_FLOW.findIndex((s) => s.status === b.status);

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold font-display">Booking details</h1>
          </div>
          <Badge variant="outline" className="capitalize">{b.status.replace('-', ' ')}</Badge>
        </div>
      </div>

      <div className="container py-8">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* ── STATUS TIMELINE ── */}
          {b.status !== 'cancelled' && b.status !== 'refunded' && (
            <Card className="p-6">
              <div className="relative flex items-start justify-between">
                {/* connector track behind the dots */}
                <div className="absolute left-0 right-0 top-4 mx-[18px] h-0.5 bg-border" aria-hidden />
                {/* filled portion */}
                {currentStep > 0 && (
                  <div
                    className="absolute top-4 h-0.5 bg-primary transition-all"
                    style={{
                      left: '18px',
                      width: `calc(${(currentStep / (STATUS_FLOW.length - 1)) * 100}% - 36px)`,
                    }}
                    aria-hidden
                  />
                )}

                {STATUS_FLOW.map((s, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={s.status} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium transition',
                          done  && 'border-primary bg-primary text-primary-foreground',
                          active && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/20',
                          !done && !active && 'border-border bg-background text-muted-foreground',
                        )}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Circle className="h-4 w-4 fill-current" /> : <span>{i + 1}</span>}
                      </div>
                      <span className={cn('text-xs font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* service + worker */}
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  {b.service?.image && (
                    <img src={b.service.image} alt="" className="h-16 w-16 rounded-2xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div className="flex-1">
                    <h2 className="font-semibold font-display">{b.service?.name ?? 'Service'}</h2>
                    <p className="text-sm text-muted-foreground">{b.service?.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 border-t pt-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={b.worker?.avatar} />
                    <AvatarFallback className="bg-primary/10 text-sm text-primary">
                      {initials(b.worker?.name ?? 'W')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{b.worker?.name}</p>
                    <p className="text-sm text-muted-foreground">{b.worker?.profession}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-full" aria-label="Call">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="outline" size="icon" className="rounded-full" aria-label="Chat">
                      <Link to={ROUTES.chat}><MessageSquare className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>
              </Card>

              {/* problem description + images */}
              <Card className="p-6">
                <h3 className="font-semibold font-display">Problem description</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.problemDescription}</p>
                {b.problemImages?.length > 0 && (
                  <>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Camera className="h-3.5 w-3.5" />
                      {b.problemImages.length} {b.problemImages.length === 1 ? 'image' : 'images'} attached
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                      {b.problemImages.map((img, i) => {
                        const src = typeof img === 'string' ? img : img.url;
                        return (
                          <img
                            key={i}
                            src={src}
                            alt={`Problem image ${i + 1}`}
                            className="aspect-square w-full rounded-xl object-cover"
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>

              {/* live tracking */}
              <Card className="overflow-hidden p-0">
                <div className="p-5 pb-0">
                  <h3 className="font-semibold font-display">Live tracking</h3>
                </div>
                <div className="p-5">
                  <MapView
                    etaMinutes={b.etaMinutes}
                    distanceKm={b.distanceKm}
                    customerMarker={{ lat: b.address.lat ?? 12.97, lng: b.address.lng ?? 77.59, label: 'You' }}
                    className="h-64 w-full"
                    onUseCurrentLocation={() => toast('Locating you…')}
                  />
                </div>
              </Card>
            </div>

            {/* sidebar */}
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold font-display">Schedule</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {formatDate(b.scheduledDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {b.scheduledTime}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{b.address.line1}, {b.address.city}, {b.address.state}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="capitalize">{b.paymentMethod}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold font-display">Payment summary</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(b.price)}</span>
                  </div>
                  {b.discount ? (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>- {formatCurrency(b.discount)}</span>
                    </div>
                  ) : null}
                  <div className="border-t pt-2 font-bold">
                    <div className="flex justify-between">
                      <span>Total</span>
                      <span>{formatCurrency(b.finalPrice)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment status card */}
              <Card className="p-6">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold font-display">Payment status</h3>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className={PAYMENT_BADGE[b.paymentStatus]?.className}>
                      {PAYMENT_BADGE[b.paymentStatus]?.label ?? b.paymentStatus}
                    </Badge>
                  </div>
                  {b.paymentMethod && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="capitalize font-medium">{b.paymentMethod}</span>
                    </div>
                  )}
                  {b.transactionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Transaction</span>
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <Hash className="h-3 w-3" />
                        {b.transactionId}
                      </span>
                    </div>
                  )}
                  {b.paidAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Paid at</span>
                      <span>{new Date(b.paidAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </Card>

              <div className="space-y-2">
                {b.status === 'completed' && !b.feedbackId && (
                  <Button asChild className="btn-glow w-full gap-2 rounded-xl">
                    <Link to={`/bookings/${b._id}/feedback`}>
                      <Star className="h-4 w-4" /> Leave feedback
                    </Link>
                  </Button>
                )}
                {b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'refunded' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <XCircle className="h-4 w-4" /> Cancel booking
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel this booking?</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Reason (optional)"
                        rows={3}
                      />
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" className="rounded-full">Keep booking</Button>
                        </DialogClose>
                        <Button
                          onClick={() => cancelMutation.mutate()}
                          disabled={cancelMutation.isPending}
                          variant="destructive"
                          className="gap-2 rounded-full"
                        >
                          {cancelMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <XCircle className="h-4 w-4" />
                          }
                          Confirm cancel
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
