import { useRef, useState, useCallback } from 'react';
import { Upload, X, ImagePlus, Loader2, Camera, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadService, type UploadFolder } from '@/services/upload.service';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  folder: UploadFolder;
  max?: number;
  urls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  className?: string;
  shape?: 'square' | 'circle';
  maxSizeMB?: number;
  acceptedFormats?: string[];
  disabled?: boolean;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

export function ImageUpload({
  folder,
  max = 5,
  urls,
  onChange,
  label = 'Upload images',
  className,
  shape = 'square',
  maxSizeMB = MAX_SIZE_MB,
  acceptedFormats = ACCEPTED_FORMATS,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async (uploadItem: UploadItem) => {
      setUploads(prev => prev.map(u => u.id === uploadItem.id ? { ...u, status: 'uploading', progress: 0 } : u));

      const result = await uploadService.upload(uploadItem.file, folder, (percent) => {
        setUploads(prev => prev.map(u => u.id === uploadItem.id ? { ...u, progress: percent } : u));
      });

      setUploads(prev => prev.map(u => u.id === uploadItem.id ? { ...u, status: 'success', progress: 100 } : u));
      return result;
    },
    onSuccess: (res, uploadItem) => {
      onChange([...urls, res.url]);
      setUploads(prev => prev.filter(u => u.id !== uploadItem.id));
      toast.success('Image uploaded successfully');
    },
    onError: (_error, uploadItem) => {
      setUploads(prev => prev.map(u => u.id === uploadItem.id ? { ...u, status: 'error', error: 'Upload failed' } : u));
      toast.error('Upload failed. Please try again.');
    },
  });

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!acceptedFormats.includes(file.type)) {
      return { valid: false, error: 'Invalid file format' };
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { valid: false, error: `File size exceeds ${maxSizeMB}MB` };
    }
    return { valid: true };
  }, [acceptedFormats, maxSizeMB]);

  const compressImage = useCallback(async (file: File): Promise<File> => {
    if (file.size <= 500 * 1024) return file; // Skip compression for small files

    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: file.type });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          0.8
        );
      };

      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || disabled) return;

    const fileArray = Array.from(files);
    const remaining = max - urls.length - uploads.filter(u => u.status !== 'error').length;
    const toProcess = fileArray.slice(0, remaining);

    if (toProcess.length === 0) {
      toast(`You can upload up to ${max} images.`);
      return;
    }

    for (const file of toProcess) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        continue;
      }

      try {
        const compressedFile = await compressImage(file);
        const preview = URL.createObjectURL(compressedFile);
        
        const uploadItem: UploadItem = {
          id: Math.random().toString(36).substring(7),
          file: compressedFile,
          preview,
          status: 'pending',
          progress: 0,
        };

        setUploads(prev => [...prev, uploadItem]);
        uploadMutation.mutate(uploadItem);
      } catch (error) {
        toast.error('Failed to process image');
      }
    }
  }, [disabled, max, urls, uploads, validateFile, compressImage, uploadMutation]);

  const remove = (idx: number) => onChange(urls.filter((_, i) => i !== idx));

  const retryUpload = (uploadItem: UploadItem) => {
    setUploads(prev => prev.map(u => u.id === uploadItem.id ? { ...u, status: 'pending', error: undefined } : u));
    uploadMutation.mutate(uploadItem);
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const isUploading = uploads.some(u => u.status === 'uploading') || uploadMutation.isPending;

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm font-medium">{label}</p>}
      <div className="flex flex-wrap gap-3">
        <AnimatePresence>
          {urls.map((url, idx) => (
            <motion.div
              key={url + idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'group relative h-24 w-24 overflow-hidden border bg-muted',
                shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
              )}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={disabled}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}

          {uploads.map((upload) => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'relative h-24 w-24 overflow-hidden border bg-muted',
                shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
              )}
            >
              <img src={upload.preview} alt="" className="h-full w-full object-cover" />
              
              {upload.status === 'uploading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-1">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                  <span className="text-[9px] text-white font-medium">{upload.progress}%</span>
                  <div className="w-14 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {upload.status === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-success/60">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}

              {upload.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-error/60 p-2 text-center">
                  <AlertCircle className="h-4 w-4 text-white mb-1" />
                  <span className="text-[8px] text-white">Failed</span>
                  <button
                    type="button"
                    onClick={() => retryUpload(upload)}
                    className="mt-1 flex items-center gap-1 text-[8px] text-white hover:text-white/80"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => removeUpload(upload.id)}
                    className="text-[8px] text-white/70 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {urls.length + uploads.filter(u => u.status !== 'error').length < max && (
          <motion.button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading || disabled}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex h-24 w-24 flex-col items-center justify-center gap-1 border-2 border-dashed rounded-2xl text-muted-foreground transition',
              isDragging ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary hover:text-primary',
              shape === 'circle' && 'rounded-full',
              (isUploading || disabled) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isDragging ? (
                  <Camera className="h-5 w-5" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
                <span className="text-[10px]">{isDragging ? 'Drop' : 'Add'}</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        multiple={max > 1}
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {max > 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Up to {max} images. Max {maxSizeMB}MB each. {acceptedFormats.map(f => f.split('/')[1]).join(', ').toUpperCase()}
        </p>
      )}
    </div>
  );
}

export function AvatarUpload({
  folder = 'profile',
  url,
  onChange,
  size = 96,
  maxSizeMB = MAX_SIZE_MB,
  disabled = false,
}: {
  folder?: UploadFolder;
  url?: string;
  onChange: (url: string) => void;
  size?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      const result = await uploadService.upload(file, folder);
      return result;
    },
    onSuccess: (res) => {
      onChange(res.url);
      setPreview(null);
      setIsUploading(false);
      toast.success('Profile picture updated');
    },
    onError: () => {
      setIsUploading(false);
      toast.error('Upload failed. Please try again.');
    },
  });

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size exceeds ${maxSizeMB}MB`);
      return;
    }

    if (!ACCEPTED_FORMATS.includes(file.type)) {
      toast.error('Invalid file format');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    uploadMutation.mutate(file);
  };

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={isUploading || disabled}
        className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted transition hover:border-primary"
        style={{ width: size, height: size }}
      >
        {preview || url ? (
          <img src={preview || url} alt="" className="h-full w-full object-cover" />
        ) : isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
          {isUploading ? 'Uploading...' : 'Change'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FORMATS.join(',')}
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
