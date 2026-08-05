import { QueryClient } from '@tanstack/react-query';


export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  services: {
    all: (params?: Record<string, unknown>) => ['services', 'list', params ?? {}] as const,
    detail: (id: string) => ['services', 'detail', id] as const,
    recommended: (params?: Record<string, unknown>) => ['services', 'recommended', params ?? {}] as const,
  },
  categories: {
    all: ['categories', 'list'] as const,
    detail: (id: string) => ['categories', 'detail', id] as const,
  },
  workers: {
    all: (params?: Record<string, unknown>) => ['workers', 'list', params ?? {}] as const,
    detail: (id: string) => ['workers', 'detail', id] as const,
    nearby: (lat: number, lng: number) => ['workers', 'nearby', lat, lng] as const,
    trending: ['workers', 'trending'] as const,
    recommended: (params?: Record<string, unknown>) => ['workers', 'recommended', params ?? {}] as const,
    fastest: (params?: Record<string, unknown>) => ['workers', 'fastest', params ?? {}] as const,
    reviews: (id: string) => ['workers', 'reviews', id] as const,
  },
  bookings: {
    all: (params?: Record<string, unknown>) => ['bookings', 'list', params ?? {}] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
    upcoming: ['bookings', 'upcoming'] as const,
    recent: ['bookings', 'recent'] as const,
    workerJobs: (params?: Record<string, unknown>) => ['bookings', 'worker', params ?? {}] as const,
  },
  verification: {
    status: ['verification', 'status'] as const,
    certificate: ['verification', 'certificate'] as const,
  },
  wallet: {
    detail: (userId?: string) => ['wallet', userId ?? 'me'] as const,
    transactions: (params?: Record<string, unknown>) => ['wallet', 'transactions', params ?? {}] as const,
  },
  notifications: {
    all: (params?: Record<string, unknown>) => ['notifications', 'list', params ?? {}] as const,
    unreadCount: () => ['notifications', 'unread'] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
    search: (q: string) => ['chat', 'search', q] as const,
  },
  reviews: {
    all: (params?: Record<string, unknown>) => ['reviews', 'list', params ?? {}] as const,
  },
  search: {
    query: (params?: Record<string, unknown>) => ['search', 'query', params ?? {}] as const,
    autoComplete: (q: string) => ['search', 'autocomplete', q] as const,
    popular: ['search', 'popular'] as const,
    estimatePrice: (params?: Record<string, unknown>) => ['search', 'estimate', params ?? {}] as const,
    similarWorkers: (id: string, params?: Record<string, unknown>) => ['search', 'similar', 'workers', id, params ?? {}] as const,
    similarServices: (id: string, params?: Record<string, unknown>) => ['search', 'similar', 'services', id, params ?? {}] as const,
    recentlyViewed: ['search', 'recently-viewed'] as const,
  },
  coupons: {
    all: (params?: Record<string, unknown>) => ['coupons', 'list', params ?? {}] as const,
  },
  offers: {
    all: (params?: Record<string, unknown>) => ['offers', 'list', params ?? {}] as const,
  },
  admin: {
    overview: ['admin', 'dashboard', 'overview'] as const,
    stats: (params?: Record<string, unknown>) => ['admin', 'stats', params ?? {}] as const,
    revenue: (params?: Record<string, unknown>) => ['admin', 'revenue', params ?? {}] as const,
    bookings: (params?: Record<string, unknown>) => ['admin', 'bookings', params ?? {}] as const,
    workers: (params?: Record<string, unknown>) => ['admin', 'workers', params ?? {}] as const,
    customers: (params?: Record<string, unknown>) => ['admin', 'customers', params ?? {}] as const,
    categories: (params?: Record<string, unknown>) => ['admin', 'categories', params ?? {}] as const,
    services: (params?: Record<string, unknown>) => ['admin', 'services', params ?? {}] as const,
    coupons: (params?: Record<string, unknown>) => ['admin', 'coupons', params ?? {}] as const,
    workerApprovals: (params?: Record<string, unknown>) => ['admin', 'worker-approvals', params ?? {}] as const,
    complaints: (params?: Record<string, unknown>) => ['admin', 'complaints', params ?? {}] as const,
    refunds: (params?: Record<string, unknown>) => ['admin', 'refunds', params ?? {}] as const,
    verification: {
      stats: ['admin', 'verification', 'stats'] as const,
      list: (params?: Record<string, unknown>) => ['admin', 'verification', 'list', params ?? {}] as const,
      detail: (id: string) => ['admin', 'verification', 'detail', id] as const,
    },
    broadcasts: (params?: Record<string, unknown>) => ['admin', 'broadcasts', 'list', params ?? {}] as const,
    broadcastStats: ['admin', 'broadcasts', 'stats'] as const,
  },
};


