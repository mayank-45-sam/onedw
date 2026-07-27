export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface Wallet {
  _id: string;
  userId: string;
  balance: number;
  currency: string;
  pendingBalance: number;
  totalEarnings?: number;
  totalSpent?: number;
  updatedAt: string;
}

export interface WalletTransaction {
  _id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  bookingId?: string;
  reference?: string;
  createdAt: string;
}

export interface WithdrawPayload {
  amount: number;
  method: 'bank' | 'upi' | 'paypal';
  accountDetails: Record<string, string>;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>[];
  code?: string;
}
