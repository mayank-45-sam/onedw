import type { BookingStatus } from '@/types/booking';
import { bookingService } from '@/services/booking.service';

export interface BookingProgressAction {
  nextStatus: BookingStatus;
  label: string;
  description?: string;
}

export const NEXT_BOOKING_ACTIONS: Partial<Record<BookingStatus, BookingProgressAction>> = {
  accepted: {
    nextStatus: 'worker-assigned',
    label: 'Mark assigned',
    description: 'Confirm you are assigned to this job',
  },
  'worker-assigned': {
    nextStatus: 'worker-on-the-way',
    label: 'On the way',
    description: 'Start heading to the customer',
  },
  'worker-on-the-way': {
    nextStatus: 'arrived',
    label: 'Arrived',
    description: 'Reached the customer location',
  },
  arrived: {
    nextStatus: 'started-work',
    label: 'Start work',
    description: 'Begin working on the job',
  },
  'started-work': {
    nextStatus: 'completed',
    label: 'Complete job',
    description: 'Finish the job',
  },
};

export function getNextBookingAction(status: BookingStatus): BookingProgressAction | null {
  return NEXT_BOOKING_ACTIONS[status] ?? null;
}

export function advanceBooking(id: string, status: BookingStatus, note?: string) {
  return bookingService.updateStatus(id, status, note);
}
