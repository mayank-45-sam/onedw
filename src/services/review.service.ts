import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { CreateReviewPayload, Paginated, Review } from '@/types';

export interface ReviewQuery {
  page?: number;
  limit?: number;
}

export const reviewService = {
  list(params?: ReviewQuery) {
    return api.get<Paginated<Review>>(API_ENDPOINTS.reviews.listAll, { params }).then((r) => r.data);
  },
  listByWorker(workerId: string, params?: ReviewQuery) {
    return api.get<Paginated<Review>>(API_ENDPOINTS.reviews.list(workerId), { params }).then((r) => r.data);
  },
  create(payload: CreateReviewPayload) {
    return api.post<Review>(API_ENDPOINTS.reviews.create, payload).then((r) => r.data);
  },
};
