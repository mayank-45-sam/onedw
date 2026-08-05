export interface Review {
  _id: string;
  bookingId: string;
  customerId: string;
  customer?: { _id: string; name: string; avatar?: string };
  workerId: string;
  worker?: { _id: string; name: string; avatar?: string };
  serviceId: string;
  rating: number; // 1-5 overall
  behaviour: number;
  quality: number;
  price: number;
  time: number;
  comment: string;
  workImages: string[];
  recommends: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewPayload {
  bookingId: string;
  workerId: string;
  serviceId: string;
  rating: number;
  behaviour: number;
  quality: number;
  price: number;
  time: number;
  comment: string;
  workImages: string[];
  recommends: boolean;
}

export type Feedback = Review;
