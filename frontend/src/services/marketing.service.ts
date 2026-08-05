import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { Coupon, Offer, Paginated } from '@/types';

export const couponService = {
  list(params?: { page?: number; limit?: number }) {
    return api.get<Paginated<Coupon>>(API_ENDPOINTS.coupons.list, { params }).then((r) => r.data);
  },
  validate(code: string, orderAmount: number) {
    return api
      .post<{ valid: boolean; discount: number; coupon: Coupon }>(API_ENDPOINTS.coupons.validate, {
        code,
        orderAmount,
      })
      .then((r) => r.data);
  },
};

export const offerService = {
  list(params?: { page?: number; limit?: number }) {
    return api.get<Paginated<Offer>>(API_ENDPOINTS.offers.list, { params }).then((r) => r.data);
  },
};
