import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Wrench, Search, Trash2, Loader2, Plus, Edit, Star } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/utils/format';
import type { Service } from '@/types';
import { ImageUpload } from '@/components/common/ImageUpload';

const LIMIT = 15;

export default function AdminServicesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    basePrice: '',
    duration: '',
    image: [] as string[],
  });

  const params = { page, limit: LIMIT, search: search || undefined };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.services(params as Record<string, unknown>),
    queryFn: () => adminService.services(params),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Service>) => adminService.createService(payload),
    onSuccess: () => {
      toast.success('Service created');
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', categoryId: '', basePrice: '', duration: '', image: [] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Service> }) =>
      adminService.updateService(id, payload),
    onSuccess: () => {
      toast.success('Service updated');
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      setIsEditDialogOpen(false);
      setSelectedService(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteService(id),
    onSuccess: () => {
      toast.success('Service deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId,
      basePrice: Number(formData.basePrice),
      duration: Number(formData.duration),
      image: formData.image[0],
    });
  };

  const handleEdit = () => {
    if (selectedService) {
      updateMutation.mutate({
        id: selectedService._id,
        payload: {
          name: formData.name,
          description: formData.description,
          categoryId: formData.categoryId,
          basePrice: Number(formData.basePrice),
          duration: Number(formData.duration),
          image: formData.image[0],
        },
      });
    }
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description,
      categoryId: service.categoryId,
      basePrice: String(service.basePrice),
      duration: String(service.duration),
      image: service.image ? [service.image] : [],
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Manage Services</h1>
          <p className="text-muted-foreground">View, create, update, and delete services.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-full">
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Service</DialogTitle>
              <DialogDescription>Add a new service to the platform.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Plumbing Repair"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the service..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category ID</Label>
                <Input
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  placeholder="Category ID"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="60"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Service Image</Label>
                <ImageUpload
                  folder="service"
                  max={1}
                  urls={formData.image}
                  onChange={(urls) => setFormData({ ...formData, image: urls })}
                  label="Upload service image"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder="Search by name…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setSearch(searchInput); setPage(1); }} variant="outline" className="rounded-full gap-2 shrink-0">
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load services" icon={<Wrench className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No services found" icon={<Wrench className="h-8 w-8" />} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['Service', 'Category', 'Price', 'Duration', 'Rating', 'Reviews', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((s, i) => (
                    <motion.tr
                      key={s._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/20 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.image && (
                            <img src={s.image} alt={s.name} className="h-10 w-10 rounded-lg object-cover" />
                          )}
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(s.basePrice)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.duration} min</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 font-medium">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {s.rating?.toFixed(1) ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.reviewCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => openEditDialog(s)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete service?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {s.name}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(s._id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Service Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Plumbing Repair"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the service..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-categoryId">Category ID</Label>
              <Input
                id="edit-categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                placeholder="Category ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-basePrice">Base Price</Label>
                <Input
                  id="edit-basePrice"
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-duration">Duration (minutes)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Service Image</Label>
              <ImageUpload
                folder="service"
                max={1}
                urls={formData.image}
                onChange={(urls) => setFormData({ ...formData, image: urls })}
                label="Upload service image"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
