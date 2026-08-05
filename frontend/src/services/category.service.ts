import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Category, Paginated, Service } from '@/types';

function extractCategories(raw: unknown): Category[] {
  if (Array.isArray(raw)) return raw as Category[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Category[];
    if (obj.data && typeof obj.data === 'object' && 'data' in obj.data) {
      const inner = (obj.data as Record<string, unknown>).data;
      if (Array.isArray(inner)) return inner as Category[];
    }
  }
  return [];
}

export const categoryService = {
  list(): Promise<Category[]> {
    return api.get(API_ENDPOINTS.categories.list).then((r) => extractCategories(r.data));
  },
  detail(id: string) {
    return api.get<Category>(API_ENDPOINTS.categories.detail(id)).then((r) => {
      const d = r.data;
      return (d && typeof d === 'object' && 'data' in d ? (d as any).data : d) as Category;
    });
  },
  bySlug(slug: string) {
    return api.get(`${API_ENDPOINTS.categories.list}/${slug}`).then((r) => {
      const d = r.data;
      return (d && typeof d === 'object' && 'data' in d ? (d as any).data : d) as Category;
    });
  },
  services(slug: string, params?: { page?: number; limit?: number }) {
    return api
      .get<Paginated<Service>>(`${API_ENDPOINTS.categories.list}/${slug}/services`, { params })
      .then((r) => r.data as Paginated<Service>);
  },
};
