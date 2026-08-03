import { API_BASE_URL, API_PREFIX, API_ENDPOINTS } from '@/constants/api';
import { STORAGE_KEYS } from '@/constants/storage';

export interface AISession {
  id: string;
  title: string;
  language: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  created_at: string;
}

export interface ChatStreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (sessionId: string) => void;
  onError: (error: string) => void;
}

export async function streamChat(
  message: string,
  sessionId: string | null,
  language: string,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const url = `${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.ai.chat}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, session_id: sessionId, language }),
    });

    if (!response.ok) {
      callbacks.onError(`Request failed with status ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('Failed to read response stream');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'chunk') {
            callbacks.onChunk(data.content);
          } else if (data.type === 'done') {
            callbacks.onDone(data.session_id);
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'Network error');
  }
}

export async function getAIHistory(page = 1, limit = 20): Promise<{
  data: AISession[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const res = await fetch(
    `${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.ai.history}?page=${page}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to load history');
  const body = await res.json();
  return body;
}

export async function getAISessionMessages(sessionId: string): Promise<{
  session: AISession;
  messages: AIMessage[];
}> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const res = await fetch(
    `${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.ai.sessionMessages(sessionId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to load messages');
  const body = await res.json();
  return body.data;
}

export interface ServiceAssistantAction {
  type: string;
  label: string;
  route: string;
  payload: Record<string, string> | {};
}

export interface ServiceAssistantResult {
  message: string;
  service_category: string | null;
  estimated_price: string | null;
  problem_summary: string | null;
  actions: ServiceAssistantAction[];
}

export async function serviceAssistant(
  problem: string,
  language: string = "en",
): Promise<ServiceAssistantResult> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const res = await fetch(
    `${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.ai.serviceAssistant}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ problem, language }),
    }
  );
  if (!res.ok) {
    throw new Error(`Service assistant request failed with status ${res.status}`);
  }
  const body = await res.json();
  return body.data;
}

export async function deleteAISession(sessionId: string): Promise<void> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const res = await fetch(
    `${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.ai.deleteSession(sessionId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to delete session");
}

export async function transcribeChatAudio(blob: Blob): Promise<string> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const form = new FormData();
  form.append("file", blob, "voice.webm");
  const res = await fetch(
    `${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.ai.transcribe}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }
  );
  if (!res.ok) throw new Error(`Transcription failed with status ${res.status}`);
  const body = await res.json();
  return body?.data?.text ?? "";
}
