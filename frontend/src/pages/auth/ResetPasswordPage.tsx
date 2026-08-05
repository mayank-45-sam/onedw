import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight, RotateCw, KeyRound } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/utils/validation';
import { ApiError } from '@/lib/apiError';
import { ROUTES } from '@/constants/routes';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resending, setResending] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: searchParams.get('email') ?? '', otp: '', password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await authService.resetPassword({ email: data.email, otp: data.otp, new_password: data.password });
      toast.success('Password reset successfully. Please sign in.');
      navigate(ROUTES.login, { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reset password. Check the OTP and try again.');
    }
  });

  const handleResend = async () => {
    const email = form.getValues('email');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter your email first');
      return;
    }
    setResending(true);
    try {
      await authService.forgotPassword({ email });
      toast.success('OTP sent');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold font-display">Set a new password</h1>
        <p className="mt-2 text-muted-foreground">Enter the 6-digit OTP we emailed you, then choose a new password.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@example.com" className="pl-10" {...form.register('email')} />
          </div>
          {form.formState.errors.email && <p className="text-sm text-error">{form.formState.errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>OTP code</Label>
          <div className="flex flex-col items-center gap-3">
            <InputOTP maxLength={6} value={form.watch('otp')} onChange={(v) => form.setValue('otp', v)}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {form.formState.errors.otp && <p className="text-sm text-error">{form.formState.errors.otp.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              className="pl-10 pr-10"
              {...form.register('password')}
            />
            <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && <p className="text-sm text-error">{form.formState.errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your new password"
              className="pl-10 pr-10"
              {...form.register('confirmPassword')}
            />
            <button type="button" onClick={() => setShowConfirm((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.confirmPassword && <p className="text-sm text-error">{form.formState.errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" className="btn-glow w-full gap-2 rounded-xl" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Resetting…' : <>Reset password <ArrowRight className="h-4 w-4" /></>}
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mx-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          <RotateCw className="h-3.5 w-3.5" /> {resending ? 'Resending…' : 'Resend OTP'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to={ROUTES.forgot} className="font-medium text-primary hover:underline">Request a new OTP</Link>
      </p>
    </div>
  );
}
