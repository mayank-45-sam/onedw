import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  open: boolean;
  onClose: () => void;
  onSend: (blob: Blob, durationSeconds: number) => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceRecorder({ open, onClose, onSend }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    stopStream();
  };

  useEffect(() => {
    if (!open) {
      cleanup();
      setRecording(false);
      setSeconds(0);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setBlob(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    cleanup();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setBlob(audioBlob);
        setPreviewUrl(URL.createObjectURL(audioBlob));
        stopStream();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      // mic permission denied — gracefully ignore
      setRecording(false);
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const discard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setSeconds(0);
  };

  const send = () => {
    if (blob) onSend(blob, seconds);
    discard();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden border-t bg-card"
        >
          <div className="flex items-center gap-3 p-4">
            {recording && (
              <span className="flex items-center gap-2 text-sm font-medium text-error">
                <motion.span
                  className="h-2.5 w-2.5 rounded-full bg-error"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
                Recording
              </span>
            )}

            {previewUrl ? (
              <audio src={previewUrl} controls className="h-9 flex-1" />
            ) : (
              <div className="flex-1">
                <span className="font-mono text-lg font-semibold">{formatDuration(seconds)}</span>
              </div>
            )}

            {!previewUrl && !recording && (
              <Button onClick={start} size="icon" className="btn-glow rounded-full" aria-label="Start recording">
                <Mic className="h-5 w-5" />
              </Button>
            )}
            {recording && (
              <Button onClick={stop} size="icon" variant="destructive" className="rounded-full" aria-label="Stop">
                <span className="h-3 w-3 rounded-sm bg-white" />
              </Button>
            )}
            {previewUrl && (
              <>
                <Button onClick={discard} size="icon" variant="ghost" className="rounded-full" aria-label="Discard">
                  <Trash2 className="h-5 w-5" />
                </Button>
                <Button onClick={send} size="icon" className="btn-glow rounded-full" aria-label="Send voice">
                  <Send className="h-5 w-5" />
                </Button>
              </>
            )}
            <Button onClick={() => { discard(); onClose(); }} size="icon" variant="ghost" className="rounded-full" aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
