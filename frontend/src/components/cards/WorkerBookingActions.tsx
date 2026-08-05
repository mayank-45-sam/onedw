import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNextBookingAction } from '@/utils/bookingActions';
import type { Booking, BookingStatus } from '@/types/booking';

interface WorkerBookingActionsProps {
  booking: Booking;
  onAction: (nextStatus: BookingStatus, booking: Booking) => void;
  busy?: boolean;
}

export function WorkerBookingActions({ booking, onAction, busy }: WorkerBookingActionsProps) {
  const action = getNextBookingAction(booking.status);
  if (!action) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="flex-1 gap-1.5 rounded-full"
        onClick={() => onAction(action.nextStatus, booking)}
        disabled={busy}
        title={action.description}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {action.label}
      </Button>
      <Button asChild size="sm" variant="outline" className="rounded-full">
        <Link to={`/bookings/${booking._id}`}>View details</Link>
      </Button>
    </div>
  );
}
