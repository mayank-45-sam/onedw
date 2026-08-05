import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { ChatMessage, Conversation, Paginated, Attachment } from '@/types';

export interface SendMessagePayload {
  text?: string;
  image?: string;
  voiceNote?: { url: string; duration: number };
  attachments?: Attachment[];
}

export interface ChatUserSearchResult {
  _id: string;
  name: string;
  avatar?: string;
  role: 'worker' | 'customer' | 'admin';
  profession?: string;
}

export interface SearchConversationsResult {
  conversations: Conversation[];
  messages: { conversation: Conversation; message: ChatMessage }[];
}

export interface NewConversationPayload {
  participantId: string;
  initialMessage?: string;
}

export const chatService = {
  conversations() {
    return api.get<Conversation[]>(API_ENDPOINTS.chat.conversations).then((r) => r.data);
  },
  messages(conversationId: string, params?: { page?: number; limit?: number }) {
    return api
      .get<Paginated<ChatMessage>>(API_ENDPOINTS.chat.messages(conversationId), { params })
      .then((r) => r.data);
  },
  send(conversationId: string, payload: SendMessagePayload) {
    return api
      .post<ChatMessage>(API_ENDPOINTS.chat.send(conversationId), payload)
      .then((r) => r.data);
  },
  search(query: string) {
    return api
      .get<SearchConversationsResult>(API_ENDPOINTS.chat.search, { params: { q: query } })
      .then((r) => r.data);
  },
  newConversation(payload: NewConversationPayload) {
    return api
      .post<Conversation>(API_ENDPOINTS.chat.newConversation, payload)
      .then((r) => r.data);
  },
  markRead(conversationId: string) {
    return api
      .patch<{ read: true }>(API_ENDPOINTS.chat.markRead(conversationId))
      .then((r) => r.data);
  },
  /** Search users to start a new conversation with. Returns user ids. */
  searchUsers(query: string) {
    return api
      .get<ChatUserSearchResult[]>(API_ENDPOINTS.users.search, { params: { q: query, limit: 10 } })
      .then((r) => r.data);
  },
};
