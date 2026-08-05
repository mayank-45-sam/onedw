import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: { length: number; [index: number]: SpeechRecognitionResultLike } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceSearchButtonProps {
  onResult: (transcript: string) => void;
  className?: string;
  label?: string;
}

export function VoiceSearchButton({ onResult, className, label }: VoiceSearchButtonProps) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const Ctor = getSpeechRecognition();
    setSupported(Ctor !== null);
  }, []);

  const toggle = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(interimText);
      if (finalText) {
        setInterim('');
        onResult(finalText.trim());
        setListening(false);
      }
    };
    rec.onerror = () => {
      setListening(false);
      setInterim('');
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  if (!supported) {
    return (
      <div
        className={cn('flex items-center gap-2 rounded-full border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground', className)}
        title="Voice search isn't supported in this browser."
      >
        <MicOff className="h-4 w-4" /> Voice search not supported
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant={listening ? 'default' : 'outline'}
        size="sm"
        onClick={toggle}
        className={cn('gap-2 rounded-full', listening && 'btn-glow')}
      >
        <motion.span animate={listening ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: listening ? Infinity : 0, duration: 1 }}>
          <Mic className={cn('h-4 w-4', listening && 'animate-pulse')} />
        </motion.span>
        {label ?? (listening ? 'Listening…' : 'Voice search')}
      </Button>

      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border bg-card p-4 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-3 w-1 rounded-full bg-primary"
                    animate={{ scaleY: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                  />
                ))}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Listening…</span>
            </div>
            <p className="mt-2 text-sm">{interim || 'Say a service, like "plumber" or "house cleaning"'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
