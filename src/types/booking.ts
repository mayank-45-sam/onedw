import type { Address } from './user';
import type { Service } from './service';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'worker-assigned'
  | 'worker-on-the-way'
  | 'arrived'
  | 'started-work'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'wallet' | 'card' | 'cash' | 'upi';

export interface BookingProblemImage {
  url: string;
  caption?: string;
}

export interface Booking {
  _id: string;
  customerId: string;
  customer?: { _id: string; name: string; avatar?: string; phone?: string };
  workerId: string;
  worker?: { _id: string; name: string; avatar?: string; profession: string };
  serviceId: string;
  service?: Service;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  problemDescription: string;
  problemImages: BookingProblemImage[];
  scheduledDate: string;
  scheduledTime: string;
  address: Address;
  price: number;
  currency: string;
  couponCode?: string;
  discount?: number;
  finalPrice: number;
  transactionId?: string;
  paidAt?: string;
  etaMinutes?: number;
  distanceKm?: number;
  feedbackId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  serviceId: string;
  workerId: string;
  problemDescription: string;
  problemImages: string[];
  scheduledDate: string;
  scheduledTime: string;
  address: Address;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

export type BookingQuery = {
  status?: BookingStatus;
  role?: 'customer' | 'worker';
  page?: number;
  limit?: number;
};
