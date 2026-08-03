export interface AppNotification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'chat' | 'wallet' | 'system' | 'review' | 'offer' | 'support';
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: { _id: string; name: string; avatar?: string; isOnline?: boolean }[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string;
  voiceNote?: { url: string; duration: number };
  attachments?: { url: string; name: string; size: number; mimeType: string }[];
  status: 'sent' | 'delivered' | 'seen';
  createdAt: string;
}

export interface Attachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface Coupon {
  _id: string;
  code: string;
  title: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  maxDiscount?: number;
  minOrder?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  image?: string;
}

export interface Offer {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  badge?: string;
  ctaLabel: string;
  ctaLink: string;
  validUntil: string;
  isActive: boolean;
}
