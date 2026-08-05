import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const CATEGORIES: { name: string; emojis: string[] }[] = [
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'] },
  { name: 'Gestures', emojis: ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '👏', '🙌', '🤲', '💪', '🦾', '🦿', '🦵', '🦶', '👂'] },
  { name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '🎯', '💯', '🎉'] },
  { name: 'Objects', emojis: ['🎁', '🏆', '🥇', '🏅', '⚙️', '🔧', '🔨', '🛠️', '🧰', '🪛', '🔩', '🧲', '💡', '📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '📸', '🎥', '🎬', '📞', '☎️', '📡', '🔋', '🔌', '💰', '💳', '📦'] },
  { name: 'Symbols', emojis: ['✅', '☑️', '✔️', '❌', '❎', '➕', '➖', '➗', '✖️', '♾️', '‼️', '⁉️', '❓', '❔', '❕', '❗', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '🌐', '⭕', '🆗', '🆕', '🆒', '🆓', '🆙'] },
];

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ open, onClose, onSelect, className }: EmojiPickerProps) {
  const [active, setActive] = useState(CATEGORIES[0].name);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'absolute bottom-full left-2 z-50 mb-2 w-72 overflow-hidden rounded-2xl border bg-card shadow-2xl',
            className
          )}
        >
          <div className="flex border-b">
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                onClick={() => setActive(c.name)}
                className={cn(
                  'flex-1 px-2 py-2 text-[10px] font-medium transition',
                  active === c.name ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto p-2">
            {CATEGORIES.find((c) => c.name === active)?.emojis.map((e) => (
              <button
                key={e}
                onClick={() => onSelect(e)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:scale-110 hover:bg-muted"
              >
                {e}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
