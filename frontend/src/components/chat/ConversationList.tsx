import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, MessageSquarePlus, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/States';
import { initials, timeAgo } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onlineUsers: Record<string, boolean>;
  onNewConversation: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onlineUsers,
  onNewConversation,
  searchQuery,
  onSearchChange,
}: ConversationListProps) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.participants[0]?.name?.toLowerCase().includes(q) ||
        c.lastMessage?.text?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold font-display">Messages</h2>
          <Button onClick={onNewConversation} size="icon" variant="ghost" className="rounded-full" aria-label="New conversation">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="h-9 w-full rounded-full border bg-background pl-9 pr-8 text-sm outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No matches' : 'No conversations'}
            description={searchQuery ? 'Try a different search.' : 'Start chatting after a booking.'}
            icon={<Send className="h-8 w-8" />}
          />
        ) : (
          filtered.map((c) => {
            const p = c.participants[0];
            const isOnline = onlineUsers[p?._id] ?? p?.isOnline;
            return (
              <Link
                key={c._id}
                to={`/chat/${c._id}`}
                className={cn('flex items-center gap-3 border-b p-3 transition hover:bg-muted', activeId === c._id && 'bg-primary/5')}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={p?.avatar} />
                    <AvatarFallback className="bg-primary/10 text-sm text-primary">{initials(p?.name ?? 'U')}</AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                      isOnline ? 'bg-success' : 'bg-muted-foreground/40'
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{p?.name}</p>
                    <span className="text-xs text-muted-foreground">{c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ''}</span>
                  </div>
                  <p className={cn('truncate text-xs', c.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    {c.lastMessage?.text ?? (c.lastMessage?.image ? '📷 Photo' : c.lastMessage?.voiceNote ? '🎤 Voice message' : 'No messages yet')}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
                  >
                    {c.unreadCount}
                  </motion.span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
