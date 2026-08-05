import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/utils/validation';
import { ApiError } from '@/lib/apiError';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await authService.forgotPassword(data);
      setSent(true);
      setSentEmail(data.email);
      toast.success('OTP sent');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  });

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold font-display">Check your email</h1>
        <p className="mt-2 text-muted-foreground">
          We sent a 6-digit OTP to <span className="font-medium text-foreground">{sentEmail}</span>. It expires in 15 minutes.
        </p>
        <Link to={`${ROUTES.reset}?email=${encodeURIComponent(sentEmail)}`} className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90">
          Enter OTP <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to={ROUTES.login} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display">Forgot password?</h1>
        <p className="mt-2 text-muted-foreground">Enter your email and we'll send you a reset link.</p>
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
        <Button type="submit" className="btn-glow w-full gap-2 rounded-xl" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Sending…' : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it? <Link to={ROUTES.login} className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
