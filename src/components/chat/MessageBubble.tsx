import { motion } from 'framer-motion';
import { CheckCheck, Check, Clock, Play, Pause, FileText, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/types';
import { timeAgo, formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  showAvatar?: boolean;
  senderName?: string;
  senderAvatar?: string;
}

function VoicePlayer({ url, duration }: { url: string; duration: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const m = Math.floor(duration / 60);
  const s = Math.floor(duration % 60);

  return (
    <div className="flex items-center gap-2 py-1">
      <audio ref={audioRef} src={url} preload="none" />
      <button onClick={toggle} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/15">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-black/15">
        <div className="absolute inset-y-0 left-0 rounded-full bg-current" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="text-[10px] opacity-70">{m}:{s.toString().padStart(2, '0')}</span>
    </div>
  );
}

export function MessageBubble({ message, mine }: MessageBubbleProps) {
  const hasContent = Boolean(message.text || message.image || message.voiceNote || message.attachments?.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
          mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-card border'
        )}
      >
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}

        {message.image && (
          <a href={message.image} target="_blank" rel="noreferrer" className="mt-1 block">
            <img src={message.image} alt="" className="max-h-60 max-w-full rounded-xl object-cover" loading="lazy" />
          </a>
        )}

        {message.voiceNote && (
          <VoicePlayer url={message.voiceNote.url} duration={message.voiceNote.duration} />
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.attachments.map((att) => (
              <a
                key={att.url}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition',
                  mine ? 'bg-black/15 hover:bg-black/25' : 'bg-muted hover:bg-muted/70'
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{att.name}</span>
                <span className="text-[10px] opacity-60">{(att.size / 1024).toFixed(0)} KB</span>
                <Download className="h-3.5 w-3.5 shrink-0" />
              </a>
            ))}
          </div>
        )}

        {hasContent && (
          <div className={cn('mt-1 flex items-center gap-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {timeAgo(message.createdAt)}
            {mine && (
              message.status === 'seen' ? <CheckCheck className="h-3 w-3" /> :
              message.status === 'delivered' ? <CheckCheck className="h-3 w-3 opacity-60" /> :
              message.status === 'sent' ? <Check className="h-3 w-3 opacity-60" /> :
              <Clock className="h-3 w-3 opacity-60" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// keep formatCurrency import used to satisfy linter in case of future price bubbles
void formatCurrency;
