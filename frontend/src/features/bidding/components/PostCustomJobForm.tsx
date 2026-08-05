import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Camera,
  Clock,
  Calendar,
  Tag,
  FileText,
  IndianRupee,
  List,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { categoryService } from '@/services';
import { useBidding } from '../BiddingContext';
import type { Category, CustomJob, CreateCustomJobPayload } from '../types';
import { uploadService } from '@/services/upload.service';

interface PostCustomJobFormProps {
  open: boolean;
  onClose: () => void;
  onSubmitSuccess?: (job: CustomJob) => void;
  defaultValues?: {
    categoryId?: string;
    title?: string;
    description?: string;
    budgetMin?: number;
    budgetMax?: number;
    urgency?: string;
    images?: string[];
  };
}

interface FormErrors {
  title?: string;
  description?: string;
  budgetMin?: string;
  budgetMax?: string;
  category?: string;
}

const budgetPresets = [
  { min: 100, max: 500, label: '₹100 - ₹500' },
  { min: 500, max: 1000, label: '₹500 - ₹1,000' },
  { min: 1000, max: 3000, label: '₹1,000 - ₹3,000' },
  { min: 3000, max: 10000, label: '₹3,000+' },
];

export function PostCustomJobForm({ open, onClose, onSubmitSuccess, defaultValues }: PostCustomJobFormProps) {
  const { postCustomJob, urgencyOptions } = useBidding();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultValues?.categoryId ?? '');
  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [budgetMin, setBudgetMin] = useState(defaultValues?.budgetMin ? String(defaultValues.budgetMin) : '');
  const [budgetMax, setBudgetMax] = useState(defaultValues?.budgetMax ? String(defaultValues.budgetMax) : '');
  const [urgency, setUrgency] = useState<string>(defaultValues?.urgency ?? 'asap');
  const [preferredTime, setPreferredTime] = useState('');
  const [images, setImages] = useState<string[]>(defaultValues?.images ?? []);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormError('');
      categoryService.list().then((data: unknown) => {
        const arr = Array.isArray(data) ? data : (data as { data?: Category[] }).data ?? [];
        setCategories(arr);
      });
    }
  }, [open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
      const res = await uploadService.upload(file, 'general');
      const url = res.url;
      setImages((prev) => [...prev, url]);
      } catch {
        // silently skip upload errors
      }
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters';
    }
    if (!description.trim()) {
      errs.description = 'Description is required';
    } else if (description.trim().length < 10) {
      errs.description = 'Description must be at least 10 characters';
    }
    const min = parseFloat(budgetMin);
    const max = parseFloat(budgetMax);
    if (!budgetMin || Number.isNaN(min) || min <= 0) {
      errs.budgetMin = 'Enter a valid minimum budget';
    }
    if (!budgetMax || Number.isNaN(max) || max <= 0) {
      errs.budgetMax = 'Enter a valid maximum budget';
    } else if (!Number.isNaN(min) && min > max) {
      errs.budgetMax = 'Max budget must be greater than min budget';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setFormError('');
    try {
      const job: CustomJob = await postCustomJob({
        categoryId: selectedCategory || undefined,
        title: title.trim(),
        description: description.trim(),
        budgetMin: parseFloat(budgetMin),
        budgetMax: parseFloat(budgetMax),
        urgency,
        preferredTime: preferredTime || undefined,
        images: images.length > 0 ? images : undefined,
      });
      onSubmitSuccess?.(job);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to post job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative mx-4 w-full max-w-2xl rounded-2xl bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between rounded-t-2xl border-b px-6 py-4">
            <h3 className="font-semibold font-display text-lg">Post a Custom Job</h3>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-muted text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
            {/* Category Selection */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium">
                <List className="h-4 w-4" />
                Service Category
              </Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className={cn('mt-2', errors.category && 'border-destructive')}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      <div className="flex items-center gap-2">
                        {cat.icon && <span>{cat.icon}</span>}
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                Job Title
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fix kitchen sink leak, Install ceiling fan..."
                className={cn('mt-2', errors.title && 'border-destructive')}
                maxLength={255}
              />
              {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your job in detail — what needs to be done, any special requirements..."
                className={cn('mt-2', errors.description && 'border-destructive')}
                rows={4}
                maxLength={2000}
              />
              {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
            </div>

            {/* Budget Range */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium">
                <IndianRupee className="h-4 w-4" />
                Budget Range
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <Input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="Min (₹)"
                    className={errors.budgetMin ? 'border-destructive' : undefined}
                  />
                  {errors.budgetMin && <p className="mt-1 text-xs text-destructive">{errors.budgetMin}</p>}
                </div>
                <div>
                  <Input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="Max (₹)"
                    className={errors.budgetMax ? 'border-destructive' : undefined}
                  />
                  {errors.budgetMax && <p className="mt-1 text-xs text-destructive">{errors.budgetMax}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {budgetPresets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setBudgetMin(String(p.min));
                      setBudgetMax(String(p.max));
                    }}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Urgency
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {urgencyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUrgency(opt.value)}
                    className={cn(
                      'rounded-lg border border-border p-3 text-left transition-all',
                      urgency === opt.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'hover:border-muted-foreground/30',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{opt.label}</span>
                      {urgency === opt.value && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Time */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Preferred Time (optional)
              </Label>
              <Input
                type="datetime-local"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Upload className="h-4 w-4" />
                Photos (optional)
              </Label>
              <div className="mt-2 space-y-3">
                <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border transition-colors hover:bg-muted/50">
                  <Camera className="mb-2 h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {images.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img src={url} alt={`upload-${i}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 rounded-full bg-background/80 p-1 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t px-6 py-4">
            {formError && (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full gap-2"
            >
              {isSubmitting ? 'Posting...' : 'Post Custom Job'}
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
