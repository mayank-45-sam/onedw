import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { registerSchema, type RegisterFormData } from '@/utils/validation';
import { ApiError } from '@/lib/apiError';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'customer', acceptTerms: false,
    },
  });
  const role = form.watch('role');

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const { confirmPassword, acceptTerms, ...payload } = data;
      void confirmPassword; void acceptTerms;
      const user = await registerUser(payload);
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
      if (user.role === 'worker') {
        localStorage.removeItem(STORAGE_KEYS.workerVerified);
        navigate(ROUTES.workerVerification);
      } else {
        navigate(ROUTES.customerDashboard);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      toast.error(msg);
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display">Create your account</h1>
        <p className="mt-2 text-muted-foreground">Join OneDW as a customer or start earning as a pro.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {(['customer', 'worker'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => form.setValue('role', r)}
            className={cn(
              'rounded-2xl border-2 p-4 text-left transition',
              role === r ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize font-display">{r}</span>
              {role === r && <CheckCircle2 className="h-5 w-5 text-primary" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {r === 'customer' ? 'Book trusted services' : 'Offer your skills'}
            </p>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="name" label="Full name" icon={<User className="h-4 w-4" />} placeholder="Jane Doe" form={form} />
        <Field id="email" label="Email" type="email" icon={<Mail className="h-4 w-4" />} placeholder="you@example.com" form={form} />
        <Field id="phone" label="Phone" icon={<Phone className="h-4 w-4" />} placeholder="+1 555 000 0000" form={form} />

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10" {...form.register('confirmPassword')} />
          </div>
          {form.formState.errors.confirmPassword && <p className="text-sm text-error">{form.formState.errors.confirmPassword.message}</p>}
        </div>

        <div className="flex items-start gap-2">
          <Checkbox id="terms" onCheckedChange={(v) => form.setValue('acceptTerms', v === true)} />
          <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
            I agree to the Terms of Service and Privacy Policy
          </Label>
        </div>
        {form.formState.errors.acceptTerms && <p className="text-sm text-error">{form.formState.errors.acceptTerms.message}</p>}

        <Button type="submit" className="btn-glow w-full gap-2 rounded-xl" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating account…' : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={ROUTES.login} className="font-medium text-primary hover:underline">Sign in</Link>
      </motion.p>
    </div>
  );
}

function Field({
  id, label, icon, placeholder, type = 'text', form,
}: {
  id: keyof RegisterFormData;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  type?: string;
  form: ReturnType<typeof useForm<RegisterFormData>>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <Input id={id} type={type} placeholder={placeholder} className="pl-10" {...form.register(id as 'name')} />
      </div>
      {form.formState.errors[id] && <p className="text-sm text-error">{form.formState.errors[id]?.message}</p>}
    </div>
  );
}
