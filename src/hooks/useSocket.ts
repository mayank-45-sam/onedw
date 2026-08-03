import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/constants/api';
import { STORAGE_KEYS } from '@/constants/storage';

let socket: Socket | null = null;
let connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return connectionState;
}

/**
 * Manages the singleton Socket.IO connection for real-time features.
 *
 * The backend exposes a Socket.IO server (JWT-authenticated, per-user rooms)
 * mounted alongside the FastAPI app. If it is unreachable the connection
 * attempt fails silently and the UI degrades gracefully to the REST API.
 */
export function useSocket(autoConnect = true) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.token) : null;
  const connect = useCallback(() => {
    if (socket?.connected) return socket;
    if (socket) return socket;
    connectionState = 'connecting';
    notify();
    socket = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: false,
      auth: { token },
    });
    socket.on('connect', () => {
      connectionState = 'connected';
      notify();
    });
    socket.on('disconnect', () => {
      connectionState = 'disconnected';
      notify();
    });
    socket.on('connect_error', () => {
      connectionState = 'disconnected';
      notify();
    });
    socket.connect();
    return socket;
  }, [token]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
      connectionState = 'disconnected';
      notify();
    }
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      // keep the singleton alive across components; only disconnect on unmount of owner
    };
  }, [autoConnect, connect]);

  const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { socket, status, connect, disconnect };
}

/**
 * Subscribe to a Socket.IO event. Re-subscribes when the socket connects.
 * Returns the latest payload received for that event.
 */
export function useSocketEvent<T = unknown>(event: string): { data: T | null; status: ReturnType<typeof useSocket>['status'] } {
  const { socket, status } = useSocket();
  const [data, setData] = useState<T | null>(null);
  const handlerRef = useRef<((payload: T) => void) | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload: T) => setData(payload);
    handlerRef.current = handler;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event]);

  return { data, status };
}

/**
 * Presence: emits a "user:online" join on connect and listens for
 * presence updates keyed by userId. Returns a map of online userIds.
 */
export function usePresence() {
  const { socket, status } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!socket || status !== 'connected') return;
    const handlePresence = (map: Record<string, boolean>) => setOnlineUsers((prev) => ({ ...prev, ...map }));
    const handleUserOnline = (userId: string) => setOnlineUsers((prev) => ({ ...prev, [userId]: true }));
    const handleUserOffline = (userId: string) => setOnlineUsers((prev) => ({ ...prev, [userId]: false }));
    socket.on('presence:update', handlePresence);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.emit('user:join');
    return () => {
      socket.off('presence:update', handlePresence);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, status]);

  return { onlineUsers, isOnline: (userId: string) => Boolean(onlineUsers[userId]) };
}

/**
 * Typing indicators for a conversation. Emits typing/stopped events and
 * exposes who is currently typing in each conversation.
 */
export function useTyping(conversationId?: string) {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTyping = useCallback(
    (convoId: string) => {
      socket?.emit('typing', { conversationId: convoId });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => socket?.emit('typing:stop', { conversationId: convoId }), 2500);
    },
    [socket]
  );

  useEffect(() => {
    if (!socket) return;
    const handleTyping = ({ conversationId: cid, userId }: { conversationId: string; userId: string }) => {
      setTypingUsers((prev) => {
        const current = prev[cid] ?? [];
        if (current.includes(userId)) return prev;
        return { ...prev, [cid]: [...current, userId] };
      });
    };
    const handleStop = ({ conversationId: cid, userId }: { conversationId: string; userId: string }) => {
      setTypingUsers((prev) => ({ ...prev, [cid]: (prev[cid] ?? []).filter((u) => u !== userId) }));
    };
    socket.on('typing', handleTyping);
    socket.on('typing:stop', handleStop);
    return () => {
      socket.off('typing', handleTyping);
      socket.off('typing:stop', handleStop);
    };
  }, [socket]);

  const isTyping = conversationId ? (typingUsers[conversationId] ?? []).length > 0 : false;
  const typingUserIds = conversationId ? typingUsers[conversationId] ?? [] : [];

  return { isTyping, typingUserIds, emitTyping };
}
