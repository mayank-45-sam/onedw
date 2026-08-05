export interface AppNotification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'chat' | 'wallet' | 'system' | 'review' | 'offer' | 'support' | 'bidding' | 'broadcast';
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export type BroadcastAudience = 'all' | 'customers' | 'workers' | 'verified_workers' | 'pending_workers';
export type BroadcastCategory = 'announcement' | 'maintenance' | 'emergency' | 'promotion' | 'policy';
export type BroadcastPriority = 'low' | 'medium' | 'high';

export interface AdminBroadcast {
  _id: string;
  title: string;
  message: string;
  audience: BroadcastAudience;
  category: BroadcastCategory;
  priority: BroadcastPriority;
  status: 'scheduled' | 'sent';
  scheduledAt: string | null;
  sentAt: string | null;
  sentBy: string | null;
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

export interface BroadcastStats {
  sentToday: number;
  sentThisWeek: number;
  totalBroadcasts: number;
  successRate: number;
  totalDelivered: number;
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
