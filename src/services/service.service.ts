import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Paginated, Service, ServiceQuery } from '@/types';

export const serviceService = {
  list(params?: ServiceQuery) {
    return api.get<Paginated<Service>>(API_ENDPOINTS.services.list, { params }).then((r) => r.data);
  },
  detail(id: string) {
    return api.get<Service>(API_ENDPOINTS.services.detail(id)).then((r) => r.data);
  },
  recommended(params?: { budget?: number; category?: string }) {
    return api.get<Service[]>(API_ENDPOINTS.services.recommended, { params }).then((r) => r.data);
  },
  toggleFavorite(id: string) {
    return api.post<{ favorited: boolean }>(API_ENDPOINTS.services.favorite(id)).then((r) => r.data);
  },
};
