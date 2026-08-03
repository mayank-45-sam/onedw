import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chatService } from '@/services/chat.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { initials } from '@/utils/format';
import { cn } from '@/lib/utils';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['chat', 'new-conversation-users', query],
    queryFn: () => chatService.searchUsers(query),
    enabled: open && query.length > 0,
    staleTime: 30_000,
  });

  const newConvoMutation = useMutation({
    mutationFn: () =>
      chatService.newConversation({
        participantId: selectedId!,
        initialMessage: initialMessage.trim() || undefined,
      }),
    onSuccess: (convo) => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
      onOpenChange(false);
      setQuery('');
      setSelectedId(null);
      setInitialMessage('');
      navigate(`/chat/${convo._id}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not start conversation'),
  });

  const close = () => {
    onOpenChange(false);
    setQuery('');
    setSelectedId(null);
    setInitialMessage('');
  };

  const users = usersQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>Search for a professional to start chatting.</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!selectedId ? (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or profession…"
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto">
                {usersQuery.isLoading && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {!usersQuery.isLoading && query && users.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No professionals found.</p>
                )}
                {users.map((u) => {
                  const profession = 'profession' in u ? u.profession : undefined;
                  return (
                    <button
                      key={u._id}
                      onClick={() => setSelectedId(u._id)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-primary/10 text-sm text-primary">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        {profession && <p className="truncate text-xs text-muted-foreground">{profession}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-3 flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                <Button onClick={() => setSelectedId(null)} variant="ghost" size="icon" className="rounded-full" aria-label="Back">
                  <X className="h-4 w-4" />
                </Button>
                {(() => {
                  const u = users.find((x) => x._id === selectedId);
                  const profession = u && 'profession' in u ? u.profession : undefined;
                  return (
                    <>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(u?.name ?? 'U')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u?.name}</p>
                        {profession && <p className="text-xs text-muted-foreground">{profession}</p>}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && newConvoMutation.mutate()}
                  placeholder="Write an optional first message…"
                />
                <Button
                  onClick={() => newConvoMutation.mutate()}
                  disabled={newConvoMutation.isPending}
                  className="btn-glow shrink-0"
                  aria-label="Start conversation"
                >
                  {newConvoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

void cn;
