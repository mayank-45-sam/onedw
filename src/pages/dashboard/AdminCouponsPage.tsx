import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Ticket, Search, Trash2, Loader2, Plus, Edit, Calendar } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { Pagination } from '@/components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Coupon } from '@/types';

const LIMIT = 15;

export default function AdminCouponsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    type: 'percent' as 'percent' | 'flat',
    value: '',
    maxDiscount: '',
    minOrder: '',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
    isActive: true,
  });

  const params = { page, limit: LIMIT };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.admin.coupons(params as Record<string, unknown>),
    queryFn: () => adminService.coupons(params),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Coupon>) => adminService.createCoupon(payload),
    onSuccess: () => {
      toast.success('Coupon created');
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setIsCreateDialogOpen(false);
      resetFormData();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Coupon> }) =>
      adminService.updateCoupon(id, payload),
    onSuccess: () => {
      toast.success('Coupon updated');
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setIsEditDialogOpen(false);
      setSelectedCoupon(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteCoupon(id),
    onSuccess: () => {
      toast.success('Coupon deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const resetFormData = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      type: 'percent',
      value: '',
      maxDiscount: '',
      minOrder: '',
      validFrom: '',
      validUntil: '',
      usageLimit: '',
      isActive: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      code: formData.code.toUpperCase(),
      title: formData.title,
      description: formData.description,
      type: formData.type,
      value: Number(formData.value),
      maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
      minOrder: formData.minOrder ? Number(formData.minOrder) : undefined,
      validFrom: formData.validFrom,
      validUntil: formData.validUntil,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
      isActive: formData.isActive,
    });
  };

  const handleEdit = () => {
    if (selectedCoupon) {
      updateMutation.mutate({
        id: selectedCoupon._id,
        payload: {
          code: formData.code.toUpperCase(),
          title: formData.title,
          description: formData.description,
          type: formData.type,
          value: Number(formData.value),
          maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
          minOrder: formData.minOrder ? Number(formData.minOrder) : undefined,
          validFrom: formData.validFrom,
          validUntil: formData.validUntil,
          usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
          isActive: formData.isActive,
        },
      });
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      type: coupon.type,
      value: String(coupon.value),
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      minOrder: coupon.minOrder ? String(coupon.minOrder) : '',
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      isActive: coupon.isActive,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Manage Coupons</h1>
          <p className="text-muted-foreground">Create, update, and manage promotional coupons.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-full">
              <Plus className="h-4 w-4" /> Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
              <DialogDescription>Add a new promotional coupon.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(v: 'percent' | 'flat') => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage</SelectItem>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Summer Sale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the coupon..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === 'percent' ? '20' : '100'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDiscount">Max Discount</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minOrder">Min Order</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    value={formData.minOrder}
                    onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                    placeholder="1000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Valid From</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usageLimit">Usage Limit</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
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

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load coupons" icon={<Ticket className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No coupons found" icon={<Ticket className="h-8 w-8" />} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {['Code', 'Title', 'Type', 'Value', 'Usage', 'Valid Until', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((c, i) => (
                    <motion.tr
                      key={c._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/20 transition"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                      <td className="px-4 py-3 font-medium">{c.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{c.type}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {c.type === 'percent' ? `${c.value}%` : formatCurrency(c.value)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.usedCount}/{c.usageLimit ?? '∞'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(c.validUntil)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.isActive ? (
                          <Badge className="bg-success/15 text-success border-success/30">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => openEditDialog(c)}
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
                                <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete coupon {c.code}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(c._id)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>Update coupon details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formData.type} onValueChange={(v: 'percent' | 'flat') => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summer Sale"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the coupon..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-value">Value</Label>
                <Input
                  id="edit-value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'percent' ? '20' : '100'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-maxDiscount">Max Discount</Label>
                <Input
                  id="edit-maxDiscount"
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minOrder">Min Order</Label>
                <Input
                  id="edit-minOrder"
                  type="number"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                  placeholder="1000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-validFrom">Valid From</Label>
                <Input
                  id="edit-validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-validUntil">Valid Until</Label>
                <Input
                  id="edit-validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-usageLimit">Usage Limit</Label>
                <Input
                  id="edit-usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
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
