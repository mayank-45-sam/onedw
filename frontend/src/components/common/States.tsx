import { cn } from '@/lib/utils';

interface StateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: StateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {icon && (
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold font-display">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, icon, action, className }: StateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {icon && (
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-error/10 text-error">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold font-display">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface LoadingStateProps {
  title?: string;
  className?: string;
}

export function LoadingState({ title = 'Loading…', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <p className="mt-4 text-sm text-muted-foreground">{title}</p>
    </div>
  );
}
