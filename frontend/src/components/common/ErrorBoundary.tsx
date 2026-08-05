import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('OneDW error boundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-error/10 text-error">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-display">Something went wrong</h1>
            <p className="max-w-md text-muted-foreground">
              An unexpected error occurred. Try reloading the app — your recent work is safe.
            </p>
            {this.state.error && (
              <p className="max-w-md rounded-xl bg-error/5 p-3 font-mono text-xs text-error">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button onClick={this.handleReset} className="btn-glow gap-2">
            <RefreshCw className="h-4 w-4" /> Reload app
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
