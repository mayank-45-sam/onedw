import { api } from '@/lib/axios';
import type {
  CreateCustomJobPayload,
  CustomJob,
  SubmitBidPayload,
  WorkerBid,
  SendMessagePayload,
  NegotiationMessage,
  AcceptBidResult,
  OpenJob,
} from './types';

const BASE = '/bidding';

function toCamel<T>(value: T): T {
  if (Array.isArray(value)) return value.map(toCamel) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = toCamel(val);
    }
    return out as T;
  }
  return value;
}

export { toCamel };

export const biddingService = {
  postJob(payload: CreateCustomJobPayload) {
    return api
      .post<CustomJob>(`${BASE}/jobs`, {
        category_id: payload.categoryId,
        title: payload.title,
        description: payload.description,
        budget_min: payload.budgetMin,
        budget_max: payload.budgetMax,
        urgency: payload.urgency,
        preferred_time: payload.preferredTime,
        images: payload.images,
      })
      .then((r) => toCamel(r.data));
  },

  getUserJobs(userId: string) {
    return api
      .get<CustomJob[]>(`${BASE}/jobs/user/${userId}`)
      .then((r) => toCamel(r.data));
  },

  listOpenJobs() {
    return api
      .get<OpenJob[]>(`${BASE}/jobs/open`)
      .then((r) => toCamel(r.data));
  },

  getJob(jobId: string) {
    return api
      .get<CustomJob>(`${BASE}/jobs/${jobId}`)
      .then((r) => toCamel(r.data));
  },

  getJobBids(jobId: string) {
    return api
      .get<WorkerBid[]>(`${BASE}/jobs/${jobId}/bids`)
      .then((r) => toCamel(r.data));
  },

  submitBid(jobId: string, payload: SubmitBidPayload) {
    return api
      .post<WorkerBid>(`${BASE}/jobs/${jobId}/bids`, {
        bid_amount: payload.bidAmount,
        message: payload.message,
        estimated_time: payload.estimatedTime,
      })
      .then((r) => toCamel(r.data));
  },

  acceptBid(bidId: string) {
    return api
      .post<AcceptBidResult>(`${BASE}/bids/${bidId}/accept`)
      .then((r) => toCamel(r.data));
  },

  getJobMessages(jobId: string) {
    return api
      .get<NegotiationMessage[]>(`${BASE}/jobs/${jobId}/messages`)
      .then((r) => toCamel(r.data));
  },

  sendMessage(jobId: string, payload: SendMessagePayload) {
    return api
      .post<NegotiationMessage>(`${BASE}/jobs/${jobId}/messages`, {
        message: payload.message,
        proposed_price: payload.proposedPrice,
      })
      .then((r) => toCamel(r.data));
  },
};
