import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Booking, BookingQuery, CreateBookingPayload, Paginated } from '@/types';

export const bookingService = {
  list(params?: BookingQuery) {
    return api.get<Paginated<Booking>>(API_ENDPOINTS.bookings.list, { params }).then((r) => r.data);
  },
  detail(id: string) {
    return api.get<Booking>(API_ENDPOINTS.bookings.detail(id)).then((r) => r.data);
  },
  create(payload: CreateBookingPayload) {
    return api.post<Booking>(API_ENDPOINTS.bookings.create, payload).then((r) => r.data);
  },
  updateStatus(id: string, status: string, note?: string) {
    return api.patch<Booking>(API_ENDPOINTS.bookings.updateStatus(id), { status, note }).then((r) => r.data);
  },
  cancel(id: string, reason?: string) {
    return api.patch<{ message: string }>(API_ENDPOINTS.bookings.updateStatus(id), { status: 'cancelled', note: reason }).then((r) => r.data);
  },
  reject(id: string, note?: string) {
    return api.patch<Booking>(API_ENDPOINTS.bookings.updateStatus(id), { status: 'cancelled', note: note ?? 'Rejected by worker' }).then((r) => r.data);
  },
  upcoming() {
    return api.get<Booking[]>(API_ENDPOINTS.bookings.upcoming).then((r) => r.data);
  },
  recent() {
    return api.get<Booking[]>(API_ENDPOINTS.bookings.recent).then((r) => r.data);
  },
  accept(id: string) {
    return api.patch<Booking>(API_ENDPOINTS.bookings.updateStatus(id), { status: 'accepted' }).then((r) => r.data);
  },
  assignWorker(id: string, workerId: string) {
    return api.patch<Booking>(API_ENDPOINTS.bookings.updateStatus(id), { status: 'worker-assigned' }).then((r) => r.data);
  },
  workerOnTheWay(id: string) {
    return api.patch<Booking>(API_ENDPOINTS.bookings.updateStatus(id), { status: 'worker-on-the-way' }).then((r) => r.data);
  },
  arrived(id: string) {
    return api.patch<Booking>(API_ENDPOINTS.bookings.updateStatus(id), { status: 'arrived' }).then((r) => r.data);
  },
  startWork(id: string) {
    return api.patch<Booking>(API_ENDPOINTS.bookings.updateStatus(id), { status: 'started-work' }).then((r) => r.data);
  },
  complete(id: string) {
    return api.patch<Booking>(API_ENDPOINTS.bookings.updateStatus(id), { status: 'completed' }).then((r) => r.data);
  },
};
