import { useRef, useState } from 'react';
import { Send, Paperclip, Mic, Smile, Image as ImageIcon, X, Loader2, FileText } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { uploadService, type UploadResult } from '@/services/upload.service';
import { EmojiPicker } from './EmojiPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { SendMessagePayload } from '@/services/chat.service';

interface PendingAttachment {
  file: File;
  previewUrl?: string;
  isImage: boolean;
  upload?: UploadResult;
}

interface ChatInputProps {
  onSend: (payload: SendMessagePayload) => void;
  onTyping: () => void;
  disabled?: boolean;
}

const MAX_ATTACHMENT = 10 * 1024 * 1024; // 10MB

export function ChatInput({ onSend, onTyping, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadService.upload(file, 'problem'),
    onSuccess: (res, file) => {
      setPending((prev) =>
        prev.map((p) => (p.file === file ? { ...p, upload: res } : p))
      );
    },
    onError: (_e, file) => {
      toast.error('Upload failed');
      setPending((prev) => prev.filter((p) => p.file !== file));
    },
  });

  const addFiles = (files: FileList | null, isImage: boolean) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > MAX_ATTACHMENT) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      setPending((prev) => [...prev, { file, previewUrl, isImage }]);
      uploadMutation.mutate(file);
    });
  };

  const removePending = (idx: number) => {
    setPending((prev) => {
      const item = prev[idx];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const allUploaded = pending.every((p) => p.upload);
  const isUploading = uploadMutation.isPending;

  const handleSend = () => {
    if (disabled) return;
    if (!text.trim() && pending.length === 0) return;
    if (!allUploaded) {
      toast('Waiting for uploads to finish…');
      return;
    }
    const images = pending.filter((p) => p.isImage).map((p) => p.upload!.url);
    const attachments = pending
      .filter((p) => !p.isImage)
      .map((p) => ({
        url: p.upload!.url,
        name: p.file.name,
        size: p.file.size,
        mimeType: p.file.type,
      }));

    const payload: SendMessagePayload = {
      text: text.trim() || undefined,
      image: images[0],
      attachments: attachments.length ? attachments : undefined,
    };
    onSend(payload);
    setText('');
    pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    setPending([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    onTyping();
  };

  const hasContent = text.trim() || pending.length > 0;

  return (
    <div className="relative border-t bg-card">
      {/* pending attachments preview */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-x-auto border-b p-3"
          >
            {pending.map((p, idx) => (
              <div key={idx} className="group relative shrink-0">
                {p.isImage ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
                    <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-40 items-center gap-2 rounded-lg border bg-muted px-2">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs">{p.file.name}</span>
                  </div>
                )}
                {!p.upload && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
                <button
                  onClick={() => removePending(idx)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <EmojiPicker open={showEmoji} onClose={() => setShowEmoji(false)} onSelect={(e) => { setText((p) => p + e); }} />

      <VoiceRecorder
        open={showVoice}
        onClose={() => setShowVoice(false)}
        onSend={(blob, duration) => onSend({ voiceNote: { url: URL.createObjectURL(blob), duration } })}
      />

      <div className="flex items-center gap-1.5 p-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Attach image"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setShowEmoji((p) => !p); setShowVoice(false); }}
          className="rounded-full"
          aria-label="Emoji"
          disabled={disabled}
        >
          <Smile className={cn('h-5 w-5', showEmoji && 'text-primary')} />
        </Button>

        <input
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message…"
          disabled={disabled}
          className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
        />

        {hasContent ? (
          <Button
            onClick={handleSend}
            size="icon"
            className="btn-glow rounded-full"
            disabled={disabled || isUploading || !allUploaded}
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setShowVoice((p) => !p); setShowEmoji(false); }}
            className="rounded-full"
            aria-label="Voice message"
            disabled={disabled}
          >
            <Mic className={cn('h-5 w-5', showVoice && 'text-primary')} />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files, false); e.target.value = ''; }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files, true); e.target.value = ''; }}
      />
    </div>
  );
}
