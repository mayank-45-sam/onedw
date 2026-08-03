import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, ImagePlus, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageRepairCardProps {
  className?: string;
  variant?: 'home' | 'sidebar';
  onAnalysisStart?: () => void;
}

export function ImageRepairCard({ className, variant = 'home', onAnalysisStart }: ImageRepairCardProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return;
    if (f.size > 10 * 1024 * 1024) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsUploading(true);
    onAnalysisStart?.();
    const formData = new FormData();
    formData.append('file', file);
    navigate('/ai/repair-estimate', { state: { file } });
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
  };

  const isCompact = variant === 'sidebar';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/5 via-card to-accent/5',
        isCompact ? 'p-4' : 'p-6 md:p-8',
        className
      )}
    >
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display">Estimate Repair Cost with AI</h3>
            <p className="text-sm text-muted-foreground">
              Upload a photo and AI will estimate the problem, cost, and best worker
            </p>
          </div>
        </div>

        <div className="mt-5">
          {!preview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all',
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              {isDragging ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <Upload className="h-10 w-10 text-primary" />
                  <p className="font-medium text-primary">Drop your image here</p>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-4">
                    <ImagePlus className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Drop an image or tap to browse</p>
                    <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, WEBP up to 10MB</p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <Button type="button" size="sm" variant="default" className="gap-2 rounded-xl">
                      <Upload className="h-4 w-4" /> Upload Image
                    </Button>
                    {navigator?.mediaDevices && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cameraInput = document.createElement('input');
                          cameraInput.type = 'file';
                          cameraInput.accept = 'image/*';
                          cameraInput.capture = 'environment';
                          cameraInput.onchange = (ev) => {
                            const f = (ev.target as HTMLInputElement).files?.[0];
                            if (f) handleFile(f);
                          };
                          cameraInput.click();
                        }}
                      >
                        <Camera className="h-4 w-4" /> Camera
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="group relative overflow-hidden rounded-2xl border">
                  <img src={preview} alt="Preview" className="h-64 w-full object-cover" />
                  <button
                    onClick={reset}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={isUploading}
                  className="btn-glow w-full gap-2 rounded-xl py-6 text-base"
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {isUploading ? 'AI is analyzing...' : 'Analyze with AI'}
                </Button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </motion.div>
  );
}
