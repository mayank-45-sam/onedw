import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Paginated, Worker, Review } from '@/types';
import type { PublicFraudStatus } from '@/types/fraud';

export interface WorkerQuery {
  category?: string;
  search?: string;
  service?: string;
  sort?: 'rating' | 'experience' | 'price' | 'completed';
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
}

const SORT_PARAM: Record<string, string> = {
  rating: 'rating',
  experience: 'experience',
  price: 'price_asc',
  completed: 'jobs',
};

export interface NearbyWorkerResult extends Worker {
  distance: number;
  distanceKm?: number;
}

export interface AadhaarSubmitPayload {
  aadhaar_number: string;
}

export interface AadhaarVerifyPayload {
  aadhaar_number: string;
  otp: string;
}

export interface AadhaarStatusResult {
  aadhaar_verified: boolean;
  aadhaar_verified_at: string | null;
}

export const workerService = {
  list(params?: WorkerQuery) {
    const query: Record<string, unknown> = { ...params };
    if (params?.sort) {
      query.sort_by = SORT_PARAM[params.sort] ?? params.sort;
      delete query.sort;
    }
    return api.get<Paginated<Worker>>(API_ENDPOINTS.workers.list, { params: query }).then((r) => r.data);
  },
  detail(id: string) {
    return api.get<Worker>(API_ENDPOINTS.workers.detail(id)).then((r) => r.data);
  },
  nearby(lat: number, lng: number, radius = 10, limit = 20) {
    return api.get<NearbyWorkerResult[]>(API_ENDPOINTS.workers.nearby, {
      params: { lat, lng, radius, limit },
    }).then((r) => r.data);
  },
  trending() {
    return api.get<Worker[]>(API_ENDPOINTS.workers.trending).then((r) => r.data);
  },
  recommended(params?: { serviceId?: string; budget?: number }) {
    return api.get<Worker[]>(API_ENDPOINTS.workers.recommended, { params }).then((r) => r.data);
  },
  fastest(params?: { lat?: number; lng?: number; limit?: number }) {
    return api.get<Worker[]>(API_ENDPOINTS.workers.fastest, { params }).then((r) => r.data);
  },
  reviews(id: string, params?: { page?: number; limit?: number }) {
    return api
      .get<Paginated<Review>>(API_ENDPOINTS.workers.reviews(id), { params })
      .then((r) => r.data);
  },
  toggleFavorite(id: string) {
    return api.post<{ favorited: boolean }>(API_ENDPOINTS.workers.favorite(id)).then((r) => r.data);
  },
  fraudStatus(id: string) {
    return api.get<PublicFraudStatus>(API_ENDPOINTS.fraud.status(id)).then((r) => r.data);
  },
  submitAadhaar(payload: AadhaarSubmitPayload) {
    return api.post<{ aadhaar_verified: boolean }>(API_ENDPOINTS.workers.aadhaarSubmit, payload).then((r) => r.data);
  },
  verifyAadhaar(payload: AadhaarVerifyPayload) {
    return api.post<{ verified: boolean; message: string }>(API_ENDPOINTS.workers.aadhaarVerify, payload).then((r) => r.data);
  },
  getAadhaarStatus() {
    return api.get<AadhaarStatusResult>(API_ENDPOINTS.workers.aadhaarStatus).then((r) => r.data);
  },
};
