import type { Category } from '@/types';

export type { Category };
export type CustomJobStatus = 'open' | 'accepted' | 'completed' | 'cancelled';
export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'countered';

export interface CustomJob {
  id: string;
  userId: string;
  categoryId: string | null;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  urgency: string | null;
  preferredTime: string | null;
  images: string[];
  status: CustomJobStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomJobPayload {
  categoryId?: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  urgency?: string;
  preferredTime?: string;
  images?: string[];
}

export interface WorkerBid {
  id: string;
  jobId: string;
  workerId: string;
  workerName: string;
  workerProfession: string;
  workerAvatar?: string | null;
  workerRating: number;
  workerReviewCount: number;
  workerTrustScore?: number | null;
  bidAmount: number;
  message?: string | null;
  estimatedTime?: string | null;
  status: BidStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmitBidPayload {
  bidAmount: number;
  message?: string;
  estimatedTime?: string;
}

export interface NegotiationMessage {
  id: string;
  jobId: string;
  senderId: string;
  receiverId?: string | null;
  message?: string | null;
  proposedPrice?: number | null;
  createdAt?: string;
}

export interface SendMessagePayload {
  message?: string;
  proposedPrice?: number;
}

export interface AcceptBidResult {
  job: CustomJob;
  acceptedBid: WorkerBid;
  message: string;
}

export interface OpenJob extends CustomJob {
  myBid?: WorkerBid | null;
}

export interface UrgencyOption {
  value: string;
  label: string;
  description: string;
}
