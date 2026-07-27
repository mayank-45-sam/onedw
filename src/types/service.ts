export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  color?: string;
  serviceCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Service {
  _id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  category?: Category;
  image?: string;
  gallery?: string[];
  basePrice: number;
  duration: number; // minutes
  rating: number;
  reviewCount: number;
  popular?: boolean;
  trending?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ServiceQuery = {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price-asc' | 'price-desc' | 'rating' | 'popular';
  page?: number;
  limit?: number;
};
