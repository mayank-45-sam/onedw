import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_PREFIX } from '@/constants/api';
import { STORAGE_KEYS } from '@/constants/storage';
import { ApiError } from '@/lib/apiError';
import { normalizeKeys } from '@/utils/transform';

export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      const { data, total, page, limit, pages } = body;
      if (Array.isArray(data)) {
        response.data = total !== undefined
          ? { data: normalizeKeys(data), total, page, limit, pages }
          : normalizeKeys(data);
      } else {
        response.data = normalizeKeys(data);
      }
    }
    return response;
  },
  (error: AxiosError<{ message?: string; errors?: Record<string, string>[]; code?: string }>) => {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;
    const message = payload?.message ?? error.message ?? 'Something went wrong. Please try again.';

    if (status === 401) {
      // Token expired or invalid — clear local session and let the app redirect.
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(new ApiError(message, status, payload?.code, payload?.errors));
  }
);
