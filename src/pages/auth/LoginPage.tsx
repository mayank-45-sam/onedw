import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/utils/validation';
import { ApiError } from '@/lib/apiError';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'alice@demo.com', password: 'password123' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const user = await login(data);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const from = (location.state as { from?: string })?.from;
      const dest = user.role === 'admin' ? ROUTES.adminDashboard : user.role === 'worker' ? ROUTES.workerDashboard : ROUTES.customerDashboard;
      navigate(from ?? dest, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      toast.error(msg);
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">Sign in to manage your bookings and wallet.</p>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to={ROUTES.forgot} className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-10 pr-10"
              {...form.register('password')}
            />
            <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && <p className="text-sm text-error">{form.formState.errors.password.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">Remember me</Label>
        </div>

        <Button type="submit" className="btn-glow w-full gap-2 rounded-xl" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Signing in…' : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Demo mode — credentials pre-filled
        </p>
      </form>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to={ROUTES.register} className="font-medium text-primary hover:underline">Create one</Link>
      </motion.p>
    </div>
  );
}
