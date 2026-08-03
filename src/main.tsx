import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter } from '@/routes/AppRouter';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { TranslationLayer } from '@/components/common/TranslationLayer';
import AIChatWidget from '@/components/ai/AIChatWidget';
import { ROUTES } from '@/constants/routes';
import '@/index.css';

function ChatbotGate() {
  const location = useLocation();
  const hidden = location.pathname.startsWith(ROUTES.workerVerification);
  return hidden ? null : <AIChatWidget />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <TranslationLayer />
              <AuthProvider>
                <AppRouter />
                <ChatbotGate />
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
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
