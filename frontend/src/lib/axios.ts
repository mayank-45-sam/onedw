import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_PREFIX } from '@/constants/api';
import { STORAGE_KEYS } from '@/constants/storage';
import { ApiError } from '@/lib/apiError';
import { normalizeKeys } from '@/utils/transform';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

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
  async (error: AxiosError<{ message?: string; errors?: Record<string, string>[]; code?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status ?? 0;

    // Attempt token refresh on 401 if we have a refresh token
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

      if (refreshToken) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const newToken = data?.data?.access_token;
          const newRefreshToken = data?.data?.refresh_token;

          if (newToken) {
            localStorage.setItem(STORAGE_KEYS.token, newToken);
            if (newRefreshToken) {
              localStorage.setItem(STORAGE_KEYS.refreshToken, newRefreshToken);
            }
            processQueue(null, newToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
        } finally {
          isRefreshing = false;
        }
      }

      // Refresh failed — clear session and redirect
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    const payload = error.response?.data;
    const message = payload?.message ?? error.message ?? 'Something went wrong. Please try again.';

    return Promise.reject(new ApiError(message, status, payload?.code, payload?.errors));
  }
);
