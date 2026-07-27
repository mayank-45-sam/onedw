import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, RotateCw } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/lib/apiError';
import { ROUTES } from '@/constants/routes';

export default function OtpPage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await authService.verifyOtp({ email, otp });
      toast.success('Verified successfully');
      navigate(ROUTES.login);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Enter your email first');
      return;
    }
    setResending(true);
    try {
      await authService.resendOtp(email);
      toast.success('Code resent');
    } catch {
      toast.error('Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-display">Verify your email</h1>
        <p className="mt-2 text-muted-foreground">Enter your email and the 6-digit code we sent you.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button onClick={handleVerify} className="btn-glow w-full gap-2 rounded-xl" disabled={loading}>
          {loading ? 'Verifying…' : <>Verify <ArrowRight className="h-4 w-4" /></>}
        </Button>

        <button
          onClick={handleResend}
          disabled={resending}
          className="mx-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          <RotateCw className="h-3.5 w-3.5" /> {resending ? 'Resending…' : 'Resend code'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to={ROUTES.login} className="font-medium text-primary hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
