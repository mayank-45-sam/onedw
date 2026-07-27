import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Paginated, Wallet, WalletTransaction, WithdrawPayload } from '@/types';

export const walletService = {
  detail() {
    return api.get<Wallet>(API_ENDPOINTS.wallet.detail).then((r) => r.data);
  },
  transactions(params?: { page?: number; limit?: number; type?: 'credit' | 'debit' }) {
    return api
      .get<Paginated<WalletTransaction>>(API_ENDPOINTS.wallet.transactions, { params })
      .then((r) => r.data);
  },
  withdraw(payload: WithdrawPayload) {
    return api.post<{ message: string }>(API_ENDPOINTS.wallet.withdraw, payload).then((r) => r.data);
  },
  addFunds(amount: number) {
    return api.post<{ message: string; wallet: Wallet }>(API_ENDPOINTS.wallet.addFunds, { amount }).then((r) => r.data);
  },
};
