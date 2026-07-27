import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter } from '@/routes/AppRouter';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <AppRouter />
              <Toaster
                position="top-right"
                toastOptions={{
                  className: 'font-sans',
                  style: {
                    borderRadius: '12px',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                }}
              />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
