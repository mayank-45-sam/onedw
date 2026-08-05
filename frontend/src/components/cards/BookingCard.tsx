import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Calendar, Clock, MapPin, Camera, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/utils/format';
import type { Booking, BookingStatus, PaymentStatus } from '@/types';

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  accepted: 'bg-primary/15 text-primary border-primary/30',
  'worker-assigned': 'bg-primary/15 text-primary border-primary/30',
  'worker-on-the-way': 'bg-accent/15 text-accent border-accent/30',
  arrived: 'bg-accent/15 text-accent border-accent/30',
  'started-work': 'bg-info/15 text-info border-info/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-error/15 text-error border-error/30',
  refunded: 'bg-muted text-muted-foreground border-border',
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  paid: 'bg-success/15 text-success border-success/30',
  unpaid: 'bg-warning/15 text-warning border-warning/30',
  refunded: 'bg-info/15 text-info border-info/30',
  failed: 'bg-error/15 text-error border-error/30',
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  refunded: 'Refunded',
  failed: 'Failed',
};

export function BookingCard({ booking, index = 0 }: { booking: Booking; index?: number }) {
  const imageCount = booking.problemImages?.length ?? 0;
  const firstImage = imageCount > 0
    ? (typeof booking.problemImages[0] === 'string' ? booking.problemImages[0] : (booking.problemImages[0] as { url: string }).url)
    : null;
  const [svcImgError, setSvcImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="card-premium card-premium-hover p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {firstImage ? (
            <img
              src={firstImage}
              alt=""
              className="h-12 w-12 rounded-xl object-cover shrink-0"
            />
          ) : booking.service?.image && !svcImgError ? (
            <img
              src={booking.service.image}
              alt=""
              className="h-12 w-12 rounded-xl object-cover shrink-0"
              onError={() => setSvcImgError(true)}
            />
          ) : null}
          <div className="min-w-0">
            <h3 className="font-semibold font-display line-clamp-1">
              {booking.service?.name ?? 'Service'}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {booking.worker?.name ?? 'Worker'} · {booking.worker?.profession}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 ${STATUS_STYLES[booking.status]}`}>
          {booking.status.replace('-', ' ')}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`text-xs ${PAYMENT_STYLES[booking.paymentStatus]}`}>
          <CreditCard className="mr-1 h-3 w-3" />
          {PAYMENT_LABELS[booking.paymentStatus]}
        </Badge>
        {imageCount > 0 && (
          <Badge variant="outline" className="text-xs bg-muted/50">
            <Camera className="mr-1 h-3 w-3" />
            {imageCount} {imageCount === 1 ? 'image' : 'images'} attached
          </Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" /> {formatDate(booking.scheduledDate)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> {booking.scheduledTime}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" /> {booking.address.city}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="font-bold font-display">{formatCurrency(booking.finalPrice)}</span>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to={`/bookings/${booking._id}`}>View details</Link>
        </Button>
      </div>
    </motion.div>
  );
}
