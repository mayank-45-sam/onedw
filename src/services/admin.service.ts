import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type {
  DashboardStats,
  Paginated,
  Booking,
  Worker,
  RevenuePoint,
  Category,
  Service,
  Coupon,
} from '@/types';

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  totalBookings?: number;
}

export const adminService = {
  stats(params?: { from?: string; to?: string }) {
    return api.get<DashboardStats>(API_ENDPOINTS.admin.stats, { params }).then((r) => r.data);
  },
  revenue(params?: { range?: '7d' | '30d' | '12m' }) {
    return api.get<RevenuePoint[]>(API_ENDPOINTS.admin.revenue, { params }).then((r) => r.data);
  },

  // ── Bookings ──
  bookings(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    return api.get<Paginated<Booking>>(API_ENDPOINTS.admin.bookings, { params }).then((r) => r.data);
  },
  updateBooking(id: string, payload: Partial<Booking>) {
    return api.put<Booking>(API_ENDPOINTS.admin.booking(id), payload).then((r) => r.data);
  },
  deleteBooking(id: string) {
    return api.delete<{ message: string }>(API_ENDPOINTS.admin.booking(id)).then((r) => r.data);
  },

  // ── Workers ──
  workers(params?: { page?: number; limit?: number; search?: string }) {
    return api.get<Paginated<Worker>>(API_ENDPOINTS.admin.workers, { params }).then((r) => r.data);
  },
  updateWorker(id: string, payload: Partial<Worker>) {
    return api.put<Worker>(API_ENDPOINTS.admin.worker(id), payload).then((r) => r.data);
  },
  deleteWorker(id: string) {
    return api.delete<{ message: string }>(API_ENDPOINTS.admin.worker(id)).then((r) => r.data);
  },

  // ── Customers ──
  customers(params?: { page?: number; limit?: number; search?: string }) {
    return api.get<Paginated<Customer>>(API_ENDPOINTS.admin.customers, { params }).then((r) => r.data);
  },
  deleteCustomer(id: string) {
    return api.delete<{ message: string }>(API_ENDPOINTS.admin.customer(id)).then((r) => r.data);
  },

  // ── Categories ──
  categories(params?: { page?: number; limit?: number }) {
    return api.get<Paginated<Category>>(API_ENDPOINTS.admin.categories, { params }).then((r) => r.data);
  },
  createCategory(payload: Partial<Category>) {
    return api.post<Category>(API_ENDPOINTS.admin.categories, payload).then((r) => r.data);
  },
  updateCategory(id: string, payload: Partial<Category>) {
    return api.put<Category>(API_ENDPOINTS.admin.category(id), payload).then((r) => r.data);
  },
  deleteCategory(id: string) {
    return api.delete<{ message: string }>(API_ENDPOINTS.admin.category(id)).then((r) => r.data);
  },

  // ── Services ──
  services(params?: { page?: number; limit?: number; search?: string }) {
    return api.get<Paginated<Service>>(API_ENDPOINTS.admin.services, { params }).then((r) => r.data);
  },
  createService(payload: Partial<Service>) {
    return api.post<Service>(API_ENDPOINTS.admin.services, payload).then((r) => r.data);
  },
  updateService(id: string, payload: Partial<Service>) {
    return api.put<Service>(API_ENDPOINTS.admin.service(id), payload).then((r) => r.data);
  },
  deleteService(id: string) {
    return api.delete<{ message: string }>(API_ENDPOINTS.admin.service(id)).then((r) => r.data);
  },

  // ── Coupons ──
  coupons(params?: { page?: number; limit?: number }) {
    return api.get<Paginated<Coupon>>(API_ENDPOINTS.admin.coupons, { params }).then((r) => r.data);
  },
  createCoupon(payload: Partial<Coupon>) {
    return api.post<Coupon>(API_ENDPOINTS.admin.coupons, payload).then((r) => r.data);
  },
  updateCoupon(id: string, payload: Partial<Coupon>) {
    return api.put<Coupon>(API_ENDPOINTS.admin.coupon(id), payload).then((r) => r.data);
  },
  deleteCoupon(id: string) {
    return api.delete<{ message: string }>(API_ENDPOINTS.admin.coupon(id)).then((r) => r.data);
  },

  reports(params?: { from?: string; to?: string; type?: string }) {
    return api.get<{ url: string }>(API_ENDPOINTS.admin.reports, { params }).then((r) => r.data);
  },

  // ── Worker Approvals ──
  workerApprovals(params?: { page?: number; limit?: number }) {
    return api.get<Paginated<any>>(API_ENDPOINTS.admin.workerApprovals, { params }).then((r) => r.data);
  },
  approveWorker(id: string) {
    return api.post<{ message: string }>(API_ENDPOINTS.admin.approveWorker(id)).then((r) => r.data);
  },
  rejectWorker(id: string) {
    return api.post<{ message: string }>(API_ENDPOINTS.admin.rejectWorker(id)).then((r) => r.data);
  },

  // ── Complaints ──
  complaints(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    return api.get<Paginated<any>>(API_ENDPOINTS.admin.complaints, { params }).then((r) => r.data);
  },
  updateComplaint(id: string, payload: { status: string; adminNotes?: string }) {
    return api.put<any>(API_ENDPOINTS.admin.complaint(id), payload).then((r) => r.data);
  },

  // ── Refunds ──
  refunds(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    return api.get<Paginated<any>>(API_ENDPOINTS.admin.refunds, { params }).then((r) => r.data);
  },
  updateRefund(id: string, payload: { status: string; adminNotes?: string }) {
    return api.put<any>(API_ENDPOINTS.admin.refund(id), payload).then((r) => r.data);
  },
};
