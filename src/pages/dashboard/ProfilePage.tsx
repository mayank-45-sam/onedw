import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BadgeCheck, Mail, Phone, MapPin, Loader2, Save, Briefcase, Globe, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { AvatarUpload, ImageUpload } from '@/components/common/ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/utils/format';
import type { Worker } from '@/types';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const worker = user as Worker | undefined;
  const isWorker = user?.role === 'worker';
  const [avatar, setAvatar] = useState(user?.avatar);
  const [portfolio, setPortfolio] = useState<string[]>(worker?.portfolio ?? []);
  const [certificates, setCertificates] = useState<string[]>(worker?.certificates?.map(c => c.image).filter(Boolean) ?? []);

  const form = useForm<{ name: string; phone: string; bio: string }>({
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '', bio: '' },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { name: string; phone: string; bio?: string; avatar?: string }) =>
      authService.updateProfile(payload),
    onSuccess: async () => {
      toast.success('Profile updated');
      await refreshUser();
      qc.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const onSubmit = form.handleSubmit((data) =>
    updateMutation.mutate({ ...data, avatar })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Profile</h1>
        <p className="text-muted-foreground">Update your personal information.</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <AvatarUpload url={avatar} onChange={setAvatar} size={96} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-bold font-display">{user?.name}</h2>
              {user?.isVerified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
              <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {user?.email}</span>
              {user?.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {user.phone}</span>}
            </div>
            {isWorker && worker && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:text-left">
                <Stat label="Experience" value={`${worker.experienceYears}y`} icon={<Briefcase className="h-4 w-4" />} />
                <Stat label="Jobs done" value={worker.completedJobs} icon={<Award className="h-4 w-4" />} />
                <Stat label="Rating" value={worker.rating?.toFixed(1)} icon={<BadgeCheck className="h-4 w-4" />} />
                <Stat label="Reviews" value={worker.reviewCount} icon={<Award className="h-4 w-4" />} />
              </div>
            )}
          </div>
        </div>
      </Card>

      <form onSubmit={onSubmit}>
        <Card className="p-6">
          <h3 className="font-semibold font-display">Edit details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...form.register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={3} placeholder="Tell customers about yourself…" {...form.register('bio')} />
            </div>
          </div>

          {isWorker && worker && (
            <div className="mt-6 border-t pt-6">
              <p className="mb-3 font-medium">Skills & languages</p>
              <div className="flex flex-wrap gap-2">
                {worker.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {worker.languages.map((l) => (
                  <span key={l} className="flex items-center gap-1 text-sm text-muted-foreground"><Globe className="h-3.5 w-3.5" /> {l}</span>
                ))}
              </div>
            </div>
          )}

          {isWorker && (
            <div className="mt-6 border-t pt-6">
              <p className="mb-3 font-medium">Portfolio</p>
              <ImageUpload
                folder="portfolio"
                max={10}
                urls={portfolio}
                onChange={setPortfolio}
                label="Upload portfolio images"
              />
            </div>
          )}

          {isWorker && (
            <div className="mt-6 border-t pt-6">
              <p className="mb-3 font-medium">Certificates</p>
              <ImageUpload
                folder="certificate"
                max={5}
                urls={certificates}
                onChange={setCertificates}
                label="Upload certificate images"
              />
            </div>
          )}

          <Button type="submit" className="btn-glow mt-6 gap-2 rounded-full" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save changes</>}
          </Button>
        </Card>
      </form>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center gap-1.5 text-primary">{icon}</div>
      <p className="mt-1 font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
