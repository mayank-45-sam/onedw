import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { FAQItem } from '@/types';

export const helpService = {
  faq() {
    return api.get<FAQItem[]>(API_ENDPOINTS.faq).then((r) => r.data);
  },
  contact(payload: { name: string; email: string; subject: string; message: string }) {
    return api.post<{ message: string }>(API_ENDPOINTS.help, payload).then((r) => r.data);
  },
};
