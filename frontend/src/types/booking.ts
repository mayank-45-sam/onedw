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

export type BookingType = 'scheduled' | 'instant' | 'emergency';
export type BookingQueryStatus = BookingStatus;

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
  worker?: { _id: string; userId: string; name: string; avatar?: string; profession: string };
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
  bookingType: BookingType;
  isEmergency: boolean;
  feedbackId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  serviceId: string;
  workerId?: string;
  problemDescription: string;
  problemImages: string[];
  scheduledDate: string;
  scheduledTime: string;
  address: Address;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  bookingType?: BookingType;
  isEmergency?: boolean;
}

export interface InstantBookingPayload {
  serviceId: string;
  problemDescription: string;
  scheduledDate: string;
  scheduledTime: string;
  address: Address;
  customerLat?: number;
  customerLng?: number;
  isEmergency?: boolean;
  couponCode?: string;
  problemImages?: string[];
}

export interface NearbyWorkerResult {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  profession: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  isOnline: boolean;
  trustScore: number;
  verificationBadge?: 'gold' | 'pro' | 'beginner' | 'rejected' | null;
  responseTimeMinutes: number;
  etaMinutes: number;
  distanceKm: number;
}

export interface InstantBookingResult extends Partial<Booking> {
  assignedWorker: NearbyWorkerResult | null;
  fallback: boolean;
  message?: string;
  surgeApplied?: boolean;
  surgeMultiplier?: number;
}

export type BookingQuery = {
  status?: BookingStatus;
  role?: 'customer' | 'worker';
  page?: number;
  limit?: number;
};
