import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role ?? localStorage.getItem('role') ?? 'customer';

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
          {role === 'worker' ? '🔧' : '👤'}
        </div>
        <h1 className="text-2xl font-bold font-display">Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
        <p className="mt-2 text-muted-foreground">You are logged in as:</p>
        <p className="mt-1 text-lg font-semibold capitalize text-primary">{role}</p>
        <p className="mt-6 text-sm text-muted-foreground">Your dashboard is ready.</p>
      </Card>
    </div>
  );
}
