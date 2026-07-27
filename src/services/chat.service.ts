import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { ChatMessage, Conversation, Paginated, User, Attachment } from '@/types';

export interface SendMessagePayload {
  text?: string;
  image?: string;
  voiceNote?: { url: string; duration: number };
  attachments?: Attachment[];
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
      .post<{ read: true }>(API_ENDPOINTS.chat.markRead(conversationId))
      .then((r) => r.data);
  },
  /** Search users to start a new conversation with. */
  searchUsers(query: string) {
    return api
      .get<Paginated<User>>(API_ENDPOINTS.workers.list, { params: { search: query, limit: 10 } })
      .then((r) => r.data);
  },
};
