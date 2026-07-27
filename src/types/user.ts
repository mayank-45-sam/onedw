export type UserRole = 'customer' | 'worker' | 'admin';

export interface BaseUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer extends BaseUser {
  role: 'customer';
  address?: Address;
  favoriteServices?: string[];
  favoriteWorkers?: string[];
}

export interface Worker extends BaseUser {
  role: 'worker';
  profession: string;
  categoryIds: string[];
  bio: string;
  experienceYears: number;
  completedJobs: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  languages: string[];
  skills: string[];
  portfolio: string[];
  certificates: { title: string; image: string; issuedAt?: string }[];
  coverImage?: string;
  isOnline: boolean;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  availability?: AvailabilitySlot[];
}

export interface Admin extends BaseUser {
  role: 'admin';
  permissions: string[];
}

export type User = Customer | Worker | Admin;

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat?: number;
  lng?: number;
  label?: 'Home' | 'Work' | 'Other';
}

export interface AvailabilitySlot {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  slots: { start: string; end: string }[];
}
