import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Mail, User, Shield } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  const name = user?.name ?? localStorage.getItem('name') ?? 'Guest';
  const role = user?.role ?? localStorage.getItem('role') ?? 'customer';
  const email = user?.email ?? localStorage.getItem('email') ?? 'guest@example.com';

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl">
            {role === 'worker' ? '🔧' : '👤'}
          </div>
          <h1 className="mt-4 text-2xl font-bold font-display">{name}</h1>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
            <Shield className="h-3 w-3" /> {role}
          </span>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">{email}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm capitalize">{role}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
