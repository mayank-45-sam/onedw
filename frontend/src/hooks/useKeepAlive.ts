import { useEffect, useRef } from 'react';
import { api } from '@/lib/axios';

const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000;
const RETRY_INTERVAL = 30 * 1000;

async function pingHealth(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch {
    return false;
  }
}

export function useKeepAlive() {
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    let timeoutId: number;
    let intervalId: number;

    const startKeepAlive = async () => {
      if (isDevelopment) {
        console.log('✓ Keep Alive Started');
      }

      const success = await pingHealth();

      if (success) {
        if (isDevelopment) {
          console.log('✓ Health Check Successful');
          console.log('✓ Database Awake');
        }

        intervalId = window.setInterval(() => {
          pingHealth().then((ok) => {
            if (!ok && isDevelopment) {
              console.log('✓ Retry Scheduled');
              clearInterval(intervalId);
              timeoutId = window.setTimeout(startKeepAlive, RETRY_INTERVAL);
            }
          });
        }, KEEP_ALIVE_INTERVAL);
      } else {
        if (isDevelopment) {
          console.log('✓ Retry Scheduled');
        }
        timeoutId = window.setTimeout(startKeepAlive, RETRY_INTERVAL);
      }
    };

    startKeepAlive();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [isDevelopment]);
}
