import type { Booking } from './booking';

export interface BookingSocketEvent {
  booking: Booking;
  message?: string;
  prevStatus?: string;
  changedBy?: string;
}
