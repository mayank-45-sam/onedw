import { useCallback, useEffect, useRef, useState } from 'react';
import { speakText, stopSpeaking } from '@/lib/speech';

/** Text-to-speech hook with speaking state and automatic cleanup. */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const cancelRef = useRef<() => void>(() => {});

  const speak = useCallback((text: string, lang?: string) => {
    cancelRef.current();
    setSpeaking(true);
    cancelRef.current = speakText(text, {
      lang,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, []);

  const stop = useCallback(() => {
    cancelRef.current();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      cancelRef.current();
      stopSpeaking();
    };
  }, []);

  return { speaking, speak, stop };
}
