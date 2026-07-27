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
  update(id: string, payload: Partial<Booking>) {
    return api.put<Booking>(API_ENDPOINTS.bookings.update(id), payload).then((r) => r.data);
  },
  cancel(id: string, reason?: string) {
    return api.post<{ message: string }>(API_ENDPOINTS.bookings.cancel(id), { reason }).then((r) => r.data);
  },
  remove(id: string) {
    return api.delete<{ message: string }>(API_ENDPOINTS.bookings.remove(id)).then((r) => r.data);
  },
  upcoming() {
    return api.get<Booking[]>(API_ENDPOINTS.bookings.upcoming).then((r) => r.data);
  },
  recent() {
    return api.get<Booking[]>(API_ENDPOINTS.bookings.recent).then((r) => r.data);
  },
  accept(id: string) {
    return api.post<Booking>(API_ENDPOINTS.bookings.update(id), { status: 'accepted' }).then((r) => r.data);
  },
  assignWorker(id: string, workerId: string) {
    return api.post<Booking>(API_ENDPOINTS.bookings.update(id), { status: 'worker-assigned', workerId }).then((r) => r.data);
  },
  workerOnTheWay(id: string) {
    return api.post<Booking>(API_ENDPOINTS.bookings.update(id), { status: 'worker-on-the-way' }).then((r) => r.data);
  },
  arrived(id: string) {
    return api.post<Booking>(API_ENDPOINTS.bookings.update(id), { status: 'arrived' }).then((r) => r.data);
  },
  startWork(id: string) {
    return api.post<Booking>(API_ENDPOINTS.bookings.update(id), { status: 'started-work' }).then((r) => r.data);
  },
  complete(id: string) {
    return api.post<Booking>(API_ENDPOINTS.bookings.update(id), { status: 'completed' }).then((r) => r.data);
  },
};
