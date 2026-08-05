import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const SELF_REG_ERROR = 'Self-registration is only available for customers';

export function isWorkerRegistrationError(message: string): boolean {
  return message.includes(SELF_REG_ERROR);
}

export function WorkerRoleHint() {
  return (
    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-lg px-3 py-2">
      👷 Workers cannot self-register. Please contact admin.
    </p>
  );
}

export default function WorkerRegistrationInfo() {
  const navigate = useNavigate();

  return (
    <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <p className="mb-2 text-base font-semibold text-destructive">👷 Worker Registration Info</p>
      <p className="mb-3 text-sm text-destructive/90">Workers cannot self-register.</p>
      <ol className="mb-3 list-decimal pl-4 text-sm text-destructive/80 space-y-0.5">
        <li>Contact admin / support</li>
        <li>Complete verification</li>
        <li>Get worker account approved</li>
        <li>Then login using provided credentials</li>
      </ol>
      <div className="flex gap-3">
        <Button size="sm" variant="secondary" onClick={() => navigate('/contact')}>
          Contact Support
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/login')}>
          Go to Customer Login
        </Button>
      </div>
    </div>
  );
}
