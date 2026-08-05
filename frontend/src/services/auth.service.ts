import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { AuthResponse, BaseUser, User } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'customer' | 'worker';
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  new_password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export const authService = {
  login(payload: LoginPayload) {
    return api.post<AuthResponse>(API_ENDPOINTS.auth.login, payload).then((r) => r.data);
  },
  register(payload: RegisterPayload) {
    return api.post<AuthResponse>(API_ENDPOINTS.auth.register, payload).then((r) => r.data);
  },
  forgotPassword(payload: ForgotPasswordPayload) {
    return api.post<{ message: string }>(API_ENDPOINTS.auth.forgotPassword, payload).then((r) => r.data);
  },
  resetPassword(payload: ResetPasswordPayload) {
    return api.post<{ message: string }>(API_ENDPOINTS.auth.resetPassword, payload).then((r) => r.data);
  },
  verifyOtp(payload: VerifyOtpPayload) {
    return api.post<AuthResponse>(API_ENDPOINTS.auth.verifyOtp, payload).then((r) => r.data);
  },
  resendOtp(email: string) {
    return api.post<{ message: string }>(API_ENDPOINTS.auth.resendOtp, { email }).then((r) => r.data);
  },
  me() {
    return api.get<User>(API_ENDPOINTS.auth.me).then((r) => r.data);
  },
  logout(refreshToken: string) {
    return api.post<{ message: string }>(API_ENDPOINTS.auth.logout, { refresh_token: refreshToken }).then((r) => r.data);
  },
  updateProfile(payload: Partial<BaseUser>) {
    return api.put<User>(API_ENDPOINTS.profile, payload).then((r) => r.data);
  },
};
