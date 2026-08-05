import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { AppNotification, Paginated } from '@/types';

export const notificationService = {
  list(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    return api
      .get<Paginated<AppNotification>>(API_ENDPOINTS.notifications.list, { params })
      .then((r) => r.data);
  },
  unreadCount() {
    return api.get<{ count: number }>(API_ENDPOINTS.notifications.unreadCount).then((r) => r.data);
  },
  markRead(id: string) {
    return api.patch<{ message: string }>(API_ENDPOINTS.notifications.markRead(id)).then((r) => r.data);
  },
  markAllRead() {
    return api.post<{ message: string }>(API_ENDPOINTS.notifications.markAllRead).then((r) => r.data);
  },
  remove(id: string) {
    return api.delete<{ message: string }>(API_ENDPOINTS.notifications.remove(id)).then((r) => r.data);
  },
};
