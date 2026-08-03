export * from './user';
export * from './service';
export * from './booking';
export * from './review';
export * from './wallet';
export * from './misc';
export * from './verification';

import type { User } from './user';

export interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  totalWorkers: number;
  totalCustomers: number;
  activeBookings: number;
  completionRate: number;
  growthPercent: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  bookings: number;
}

export interface WorkerAnalytics {
  earnings: { label: string; value: number }[];
  jobsCompleted: { label: string; value: number }[];
  ratingBreakdown: { stars: number; count: number }[];
  performance: {
    onTimeRate: number;
    repeatCustomerRate: number;
    cancelRate: number;
    avgResponseTime: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface FAQItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
}

export interface Complaint {
  _id: string;
  bookingId: string;
  customer: { _id: string; name: string; avatar?: string };
  worker: { _id: string; name: string; avatar?: string };
  subject: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRequest {
  _id: string;
  bookingId: string;
  customer: { _id: string; name: string; avatar?: string };
  worker: { _id: string; name: string; avatar?: string };
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingWorker {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  profession: string;
  experience: string;
  skills: string[];
  documents: { name: string; url: string }[];
  createdAt: string;
}
