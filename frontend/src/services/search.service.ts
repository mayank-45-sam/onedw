import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Paginated, Worker, Service } from '@/types';

export interface SearchSuggestion {
  _id: string;
  text: string;
  type: 'service' | 'worker' | 'category';
  image?: string;
  meta?: string;
}

export interface PopularSearch {
  term: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AISearchResult {
  services: Paginated<Service>;
  workers: Paginated<Worker>;
  suggestions: SearchSuggestion[];
  recommendedFilters: { label: string; value: string; count?: number }[];
  budgetWorker?: Worker;
  fastestWorker?: Worker;
  highestRatedWorker?: Worker;
}

export interface PriceEstimateInput {
  serviceId?: string;
  serviceName?: string;
  problemDescription?: string;
  location?: string;
  lat?: number;
  lng?: number;
  urgency?: 'low' | 'normal' | 'high' | 'emergency';
}

export interface PriceEstimate {
  estimated: number;
  average: number;
  minimum: number;
  maximum: number;
  timeEstimateMinutes: number;
  confidence: number; // 0..1
  monthlyTrend: { label: string; value: number }[];
}

export interface SimilarResult<T> {
  items: T[];
  reason?: string;
}

export const searchService = {
  search(params: { q?: string; location?: string; lat?: number; lng?: number; limit?: number }) {
    return api.get<AISearchResult>(API_ENDPOINTS.search.query, { params }).then((r) => r.data);
  },
  autoComplete(q: string) {
    return api.get<SearchSuggestion[]>(API_ENDPOINTS.search.autoComplete, { params: { q } }).then((r) => r.data);
  },
  popular() {
    return api.get<PopularSearch[]>(API_ENDPOINTS.search.popular).then((r) => r.data);
  },
  estimatePrice(input: PriceEstimateInput) {
    return api.post<PriceEstimate>(API_ENDPOINTS.search.estimatePrice, input).then((r) => r.data);
  },
  similarWorkers(workerId: string, params?: { limit?: number; kind?: 'similar' | 'budget' | 'premium' | 'nearby' }) {
    return api.get<SimilarResult<Worker>>(API_ENDPOINTS.search.similarWorkers(workerId), { params }).then((r) => r.data);
  },
  similarServices(serviceId: string, params?: { limit?: number; kind?: 'similar' | 'together' | 'alsoBooked' }) {
    return api.get<SimilarResult<Service>>(API_ENDPOINTS.search.similarServices(serviceId), { params }).then((r) => r.data);
  },
  recentlyViewed() {
    return api.get<{ workers: Worker[]; services: Service[] }>(API_ENDPOINTS.search.recentlyViewed).then((r) => r.data);
  },
};
