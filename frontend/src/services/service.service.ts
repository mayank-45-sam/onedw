import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Paginated, Service, ServiceQuery } from '@/types';

const SORT_PARAM: Record<string, string> = {
  'price-asc': 'price_asc',
  'price-desc': 'price_desc',
  rating: 'rating',
  popular: 'popular',
};

export const serviceService = {
  list(params?: ServiceQuery) {
    const query: Record<string, unknown> = { ...params };
    if (params?.sort) {
      query.sort_by = SORT_PARAM[params.sort] ?? params.sort;
      delete query.sort;
    }
    return api.get<Paginated<Service>>(API_ENDPOINTS.services.list, { params: query }).then((r) => r.data);
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
