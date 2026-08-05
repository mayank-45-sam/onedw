import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';

export interface SupportContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const supportService = {
  contact(payload: SupportContactPayload) {
    return api.post<{ message: string; deliveredTo?: number }>(API_ENDPOINTS.support.contact, payload).then((r) => r.data);
  },
};
