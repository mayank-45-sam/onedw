import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Paginated, Worker, Review } from '@/types';

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

export interface NearbyWorkerResult {
  id: string;
  name: string;
  profession: string;
  avatar?: string;
  rating: number;
  hourly_rate: number;
  is_online: boolean;
  distance: number;
}

export const workerService = {
  list(params?: WorkerQuery) {
    return api.get<Paginated<Worker>>(API_ENDPOINTS.workers.list, { params }).then((r) => r.data);
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
  reviews(id: string, params?: { page?: number; limit?: number }) {
    return api
      .get<Paginated<Review>>(API_ENDPOINTS.workers.reviews(id), { params })
      .then((r) => r.data);
  },
  toggleFavorite(id: string) {
    return api.post<{ favorited: boolean }>(API_ENDPOINTS.workers.favorite(id)).then((r) => r.data);
  },
};
