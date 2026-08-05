import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number (e.g. +15551234567)').optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one digit')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    role: z.enum(['customer', 'worker']),
    acceptTerms: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.acceptTerms === true, {
    message: 'Please accept the terms to continue',
    path: ['acceptTerms'],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: z.string().email('Enter a valid email'),
    otp: z.string().length(6, 'Enter the 6-digit code'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one digit')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const otpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'Enter the 6-digit code'),
});
export type OtpFormData = z.infer<typeof otpSchema>;

export const bookingAddressSchema = z.object({
  line1: z.string().min(3, 'Address is required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  label: z.enum(['Home', 'Work', 'Other']).default('Home'),
});
export type BookingAddressFormData = z.infer<typeof bookingAddressSchema>;

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  behaviour: z.number().min(1).max(5),
  quality: z.number().min(1).max(5),
  price: z.number().min(1).max(5),
  time: z.number().min(1).max(5),
  comment: z.string().min(10, 'Tell us a bit more (min 10 characters)'),
  workImages: z.array(z.string()).default([]),
  recommends: z.boolean().default(true),
});
export type ReviewFormData = z.infer<typeof reviewSchema>;

export const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number').optional().or(z.literal('')),
  bio: z.string().max(500).optional(),
});
export type ProfileFormData = z.infer<typeof profileSchema>;

export const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.enum(['bank', 'upi', 'paypal']),
  accountDetails: z.record(z.string()).refine((d) => Object.keys(d).length > 0, {
    message: 'Provide account details',
  }),
});
export type WithdrawFormData = z.infer<typeof withdrawSchema>;
