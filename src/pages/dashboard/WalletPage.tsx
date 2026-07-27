import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Wallet, ArrowDownToLine, ArrowUpRight, TrendingUp, Loader2 } from 'lucide-react';
import { walletService } from '@/services/wallet.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils/format';
import type { WalletTransaction } from '@/types';

export default function WalletPage() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bank' | 'upi' | 'paypal'>('upi');

  const wallet = useQuery({ queryKey: queryKeys.wallet.detail(), queryFn: () => walletService.detail() });
  const transactions = useQuery({
    queryKey: queryKeys.wallet.transactions({ limit: 20 }),
    queryFn: () => walletService.transactions({ limit: 20 }),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => walletService.withdraw({ amount: Number(amount), method, accountDetails: { method } }),
    onSuccess: () => {
      toast.success('Withdrawal requested');
      qc.invalidateQueries({ queryKey: queryKeys.wallet.detail() });
      setAmount('');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Withdrawal failed'),
  });

  const cards = [
    { label: 'Available', value: wallet.data ? formatCurrency(wallet.data.balance) : '—', icon: Wallet, color: 'text-primary' },
    { label: 'Pending', value: wallet.data ? formatCurrency(wallet.data.pendingBalance) : '—', icon: Loader2, color: 'text-warning' },
    { label: 'Total earnings', value: wallet.data?.totalEarnings ? formatCurrency(wallet.data.totalEarnings) : '—', icon: TrendingUp, color: 'text-success' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Wallet</h1>
          <p className="text-muted-foreground">Manage your balance and transactions.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="btn-glow gap-2 rounded-full"><ArrowDownToLine className="h-4 w-4" /> Withdraw</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Withdraw funds</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" className="rounded-full">Cancel</Button></DialogClose>
              <Button onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending || !amount} className="gap-2 rounded-full">
                {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />} Withdraw
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${c.color}`}><Icon className="h-5 w-5" /></div>
                <p className="mt-3 text-2xl font-bold font-display">{c.value}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="p-6">
        <SectionHeader title="Transactions" className="mb-4" />
        {transactions.isLoading ? (
          <LoadingState />
        ) : transactions.isError ? (
          <ErrorState title="Couldn't load transactions" icon={<Wallet className="h-8 w-8" />} />
        ) : !transactions.data?.data?.length ? (
          <EmptyState title="No transactions yet" description="Your transaction history will appear here." icon={<Wallet className="h-8 w-8" />} />
        ) : (
          <div className="space-y-2">
            {transactions.data.data.map((t: WalletTransaction, i) => (
              <motion.div key={t._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between rounded-2xl border p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.type === 'credit' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    {t.type === 'credit' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownToLine className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${t.type === 'credit' ? 'text-success' : 'text-foreground'}`}>
                    {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <Badge variant="outline" className="text-xs capitalize">{t.status}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
