import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Phone, Video, Send } from 'lucide-react';
import { chatService, type SendMessagePayload } from '@/services/chat.service';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { useSocket, usePresence, useTyping, useSocketEvent } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { initials } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { Conversation, ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { user } = useAuth();

  // Socket.IO — connects when a server is available; degrades gracefully otherwise.
  const { status: socketStatus } = useSocket(true);
  const { onlineUsers } = usePresence();
  const { isTyping, typingUserIds, emitTyping } = useTyping(conversationId);
  const { data: liveMessage } = useSocketEvent<{ conversationId: string; message: ChatMessage }>('chat:message');

  const conversations = useQuery({ queryKey: queryKeys.chat.conversations, queryFn: () => chatService.conversations() });
  const messages = useQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ''),
    queryFn: () => chatService.messages(conversationId!, { limit: 50 }),
    enabled: !!conversationId,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: SendMessagePayload) => chatService.send(conversationId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId!) });
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not send message'),
  });

  const markReadMutation = useMutation({
    mutationFn: () => chatService.markRead(conversationId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chat.conversations }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.data]);

  useEffect(() => {
    if (conversationId && messages.data?.data?.length) {
      markReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.data?.data?.length]);

  // Live updates: a new message arrived over the socket (sent by us or the other side).
  useEffect(() => {
    if (!liveMessage) return;
    qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    if (liveMessage.conversationId === conversationId) {
      qc.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });
    }
  }, [liveMessage, qc, conversationId]);

  const activeConversation = conversations.data?.find((c) => c._id === conversationId);
  const otherUser = activeConversation?.participants?.[0];
  const myId = user?._id ?? 'me';
  const otherIsOnline = onlineUsers[otherUser?._id ?? ''] ?? otherUser?.isOnline;

  const handleSend = (payload: SendMessagePayload) => {
    if (!conversationId) return;
    sendMutation.mutate(payload);
  };

  const typingName = activeConversation?.participants.find((p) => typingUserIds.includes(p._id))?.name;

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-3xl border bg-card">
      {/* conversation list */}
      <aside className={cn('w-72 shrink-0 flex-col border-r md:flex', conversationId ? 'hidden lg:flex' : 'flex')}>
        <ConversationList
          conversations={conversations.data ?? []}
          activeId={conversationId}
          onlineUsers={onlineUsers}
          onNewConversation={() => setNewConvoOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </aside>

      {/* chat area */}
      <div className="flex flex-1 flex-col">
        {!conversationId ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="Select a conversation" description="Choose a chat from the left to start messaging." icon={<Send className="h-8 w-8" />} />
          </div>
        ) : (
          <>
            {/* header */}
            <div className="flex items-center gap-3 border-b p-3">
              <Button asChild variant="ghost" size="icon" className="rounded-full lg:hidden">
                <Link to={ROUTES.chat}><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherUser?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-sm text-primary">{initials(otherUser?.name ?? 'U')}</AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                    otherIsOnline ? 'bg-success' : 'bg-muted-foreground/40'
                  )}
                />
              </div>
              <div className="flex-1">
                <p className="font-medium">{otherUser?.name ?? 'Chat'}</p>
                <p className={cn('text-xs', otherIsOnline ? 'text-success' : 'text-muted-foreground')}>
                  {socketStatus === 'connected' ? (otherIsOnline ? 'online' : 'offline') : (isTyping ? 'typing…' : 'offline')}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Call"><Phone className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Video"><Video className="h-5 w-5" /></Button>
            </div>

            {/* messages */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
              {messages.isLoading ? (
                <LoadingState />
              ) : messages.isError ? (
                <ErrorState title="Couldn't load messages" icon={<Send className="h-8 w-8" />} />
              ) : !messages.data?.data?.length ? (
                <EmptyState title="No messages yet" description="Say hello to start the conversation." icon={<Send className="h-8 w-8" />} />
              ) : (
                <>
                  {messages.data.data.map((m: ChatMessage) => (
                    <MessageBubble key={m._id} message={m} mine={m.senderId === myId} />
                  ))}
                  {isTyping && <TypingIndicator name={typingName} />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* input */}
            <ChatInput
              onSend={handleSend}
              onTyping={() => conversationId && emitTyping(conversationId)}
              disabled={sendMutation.isPending}
            />
          </>
        )}
      </div>

      <NewConversationDialog open={newConvoOpen} onOpenChange={setNewConvoOpen} />
    </div>
  );
}
