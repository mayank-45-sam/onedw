import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BookingCard, shouldShowBookingCard, detectCategory } from '@/components/chat/BookingCard';
import { ServiceInfoCard } from '@/components/chat/ServiceInfoCard';
import { analyzeImage } from '@/utils/imageAnalysis';
import {
  streamChat,
  getAIHistory,
  getAISessionMessages,
  deleteAISession,
  transcribeChatAudio,
  type AISession,
  type AIMessage,
} from '@/services/ai.service';

const QUICK_SUGGESTIONS = [
  { icon: '🔧', label: 'Plumbing Issue', message: 'I have a plumbing issue at home' },
  { icon: '⚡', label: 'Electrical Problem', message: 'I have an electrical problem' },
  { icon: '❄️', label: 'AC / Appliance', message: 'My AC or appliance needs repair' },
  { icon: '🐜', label: 'Pest Control', message: 'I need pest control service' },
  { icon: '🧹', label: 'Cleaning', message: 'I need a cleaning service' },
  { icon: '📅', label: 'Book a Pro', message: 'How do I book a professional on OneDW?' },
];

type View = 'chat' | 'history';

const speakingRef = { current: false };
let setSpeakingRef: ((v: boolean) => void) | null = null;

function speakText(text: string, lang: string = 'en-IN') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const cleaned = text
    .replace(/[*_`#>\-\[\]]/g, '')
    .replace(/\n+/g, '. ')
    .trim();
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.lang = lang;
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Ensure voices are loaded before selecting
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Voices not loaded yet, wait for them
    window.speechSynthesis.onvoiceschanged = () => {
      selectVoiceAndSpeak(utterance, lang);
    };
  } else {
    selectVoiceAndSpeak(utterance, lang);
  }
}

function selectVoiceAndSpeak(
  utterance: SpeechSynthesisUtterance,
  lang: string
) {
  const voices = window.speechSynthesis.getVoices();
  let selectedVoice: SpeechSynthesisVoice | null = null;

  if (lang === 'ta-IN') {
    selectedVoice =
      voices.find((v) => v.lang.startsWith('ta')) ||
      voices.find((v) => v.name.toLowerCase().includes('tamil')) ||
      null;
  } else if (lang === 'hi-IN') {
    selectedVoice =
      voices.find((v) => v.lang.startsWith('hi')) ||
      voices.find((v) => v.name.toLowerCase().includes('hindi')) ||
      null;
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    console.log(
      `[Voice] Using voice: "${selectedVoice.name}" (lang: ${selectedVoice.lang}) for ${lang}`
    );
  } else {
    console.log(
      `[Voice] No dedicated voice for ${lang}, using system default. Available:`,
      voices.map((v) => `${v.name} (${v.lang})`)
    );
  }

  speakingRef.current = true;
  setSpeakingRef?.(true);
  utterance.onend = () => { speakingRef.current = false; setSpeakingRef?.(false); };
  utterance.onerror = (e) => {
    console.warn('[Voice] SpeechSynthesis error:', e);
    speakingRef.current = false;
    setSpeakingRef?.(false);
  };
  window.speechSynthesis.speak(utterance);
}

// List all available voices (call this in console for debugging)
function listVoices(): void {
  if (!('speechSynthesis' in window)) {
    console.log('[Voice] speechSynthesis not available');
    return;
  }
  const voices = window.speechSynthesis.getVoices();
  console.log(`[Voice] ${voices.length} voices available:`);
  voices.forEach((v) => {
    const isTamil = v.lang.startsWith('ta') || v.name.toLowerCase().includes('tamil');
    console.log(`  ${isTamil ? '🔊 ' : '   '}${v.name} — ${v.lang} — ${v.default ? '(default)' : ''}`);
  });
}

function detectLanguage(text: string): 'en' | 'ta' | 'hi' {
  const tamilRegex = /[\u0B80-\u0BFF]/;
  const hindiRegex = /[\u0900-\u097F]/;
  if (tamilRegex.test(text)) return 'ta';
  if (hindiRegex.test(text)) return 'hi';
  return 'en';
}

function getVoiceLang(lang: string): string {
  switch (lang) {
    case 'ta': return 'ta-IN';
    case 'hi': return 'hi-IN';
    default: return 'en-IN';
  }
}

export default function AIChatWidget() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [detectedLang, setDetectedLang] = useState<'en' | 'ta' | 'hi'>('en');
  const detectedLangRef = useRef(detectedLang);
  detectedLangRef.current = detectedLang;
  const [isSpeaking, setIsSpeaking] = useState(false);

  setSpeakingRef = setIsSpeaking;

  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadedCategory, setUploadedCategory] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisRejected, setAnalysisRejected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const restartRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<BlobPart[]>([]);
  const recordingModeRef = useRef<'recognition' | 'recorder' | null>(null);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadedPreview(url);
    setUploadedCategory(null);
    setAnalysisRejected(false);
    setAnalysisLoading(true);
    if (e.target) e.target.value = '';

    try {
      const result = await analyzeImage(file);
      if (result.category) {
        setUploadedCategory(result.category);
        setAnalysisRejected(false);
      } else {
        setUploadedCategory(null);
        setAnalysisRejected(true);
      }
    } catch {
      setUploadedCategory(null);
      setAnalysisRejected(true);
    }
    setAnalysisLoading(false);
  }, []);

  const clearUploadedImage = useCallback(() => {
    if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
    setUploadedPreview(null);
    setUploadedCategory(null);
    setAnalysisRejected(false);
    setAnalysisLoading(false);
  }, [uploadedPreview]);

  // Keep handleSendRef always pointing to the latest handleSend
  const handleSend = useCallback(
    async (text?: string) => {
      const rawText = (text || input).trim();
      if (!rawText || isStreaming || !isAuthenticated) return;

      const userMsg: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: rawText,
        tokens_used: 0,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsStreaming(true);
      setStreamingContent('');
      setShowSuggestions(false);
      setView('chat');

      let accumulated = '';

      const speakLang =
        detectedLangRef.current === 'ta'
          ? 'ta-IN'
          : detectedLangRef.current === 'hi'
            ? 'hi-IN'
            : 'en-IN';

      // Map detected language to API language code
      const apiLang =
        detectedLangRef.current === 'ta' ? 'ta' : language === 'hi' ? 'hi' : 'en';

      await streamChat(rawText, sessionId, apiLang, {
        onChunk: (chunk) => {
          accumulated += chunk;
          setStreamingContent(accumulated);
        },
        onDone: (newSessionId) => {
          const assistantMsg: AIMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: accumulated,
            tokens_used: 0,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingContent('');
          setIsStreaming(false);
          setSessionId(newSessionId);

          // Speak the response aloud in detected language
          if (accumulated && 'speechSynthesis' in window) {
            const speakLang =
              detectedLangRef.current === 'ta'
                ? 'ta-IN'
                : detectedLangRef.current === 'hi'
                  ? 'hi-IN'
                  : 'en-IN';
            speakText(accumulated, speakLang);
          }
        },
        onError: (error) => {
          const errorMsg: AIMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `**Error:** ${error}`,
            tokens_used: 0,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          setStreamingContent('');
          setIsStreaming(false);
        },
      });
    },
    [input, language, isStreaming, isAuthenticated]
  );

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Fallback: record with MediaRecorder and transcribe via the backend API.
  // Used when the Web Speech API's external service is unreachable ('network' error).
  const startMediaRecorderFallback = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser. Please type your message.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus'];
      for (const candidate of candidates) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          mimeType = candidate;
          break;
        }
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        toast.error('Voice recording could not be started. Please type your message.');
        return;
      }

      recorderChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recordingModeRef.current = 'recorder';

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recorderChunksRef.current.push(ev.data);
      };
      recorder.onerror = () => {
        setIsRecording(false);
        recordingModeRef.current = null;
        toast.error('Recording failed. Please type your message.');
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        recordingModeRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recorderChunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          toast.error('No audio was recorded. Please try again.');
          return;
        }
        const toastId = toast.loading('Transcribing your voice…');
        try {
          const text = await transcribeChatAudio(blob);
          if (text && text.trim()) {
            const detected = detectLanguage(text);
            setDetectedLang(detected);
            handleSendRef.current(text);
          } else {
            toast.error('Could not transcribe your voice. Please type your message.');
          }
        } catch {
          toast.error('Voice transcription failed. Please type your message.');
        } finally {
          toast.dismiss(toastId);
        }
      };

      recorder.start();
      setIsRecording(true);
      toast.success('Listening (voice recording). Tap the mic to stop.');
    } catch {
      toast.error('Could not access the microphone. Please type your message.');
    }
  }, []);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      console.log('[Voice] START — mic is now listening');
      recordingModeRef.current = 'recognition';
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      console.log('[Voice] HEARD:', transcript);
      const detected = detectLanguage(transcript);
      setDetectedLang(detected);
      const lang = detected === 'ta' ? 'ta-IN' : detected === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.lang = lang;
      handleSendRef.current(transcript);
    };

recognition.onerror = (event: any) => {
      console.log('[Voice] ERROR event:', JSON.stringify(event, null, 2));
      console.log('[Voice] error type:', event.error);
      setIsRecording(false);
      restartRef.current = false;

      let fallbackText = '';

      switch (event.error) {
        case 'not-allowed':
          fallbackText = 'Microphone access denied. Please enable mic permission in your browser settings, or just type your message.';
          toast.error('Microphone denied. Please type instead.');
          break;
        case 'no-speech':
          fallbackText = 'No speech detected. Please try again or type your message.';
          toast.error('No speech detected. Try again or type.');
          break;
        case 'audio-capture':
          fallbackText = 'No microphone found. Please connect a microphone, or just type your message.';
          toast.error('No microphone found. Please type instead.');
          break;
        case 'network':
          // External speech service (Google) is unreachable — fall back to
          // MediaRecorder + backend transcription instead of sending a canned reply.
          console.warn('[Voice] Web Speech API unreachable — switching to MediaRecorder fallback');
          restartRef.current = false;
          void startMediaRecorderFallback();
          return;
        case 'aborted':
          fallbackText = 'Voice input stopped. Please type your message or try again.';
          toast.error('Voice input stopped.');
          break;
        case 'service-not-allowed':
          fallbackText = 'Voice service not allowed. Please type your message instead.';
          toast.error('Voice service not allowed. Please type instead.');
          break;
        case 'language-not-supported':
          fallbackText = 'Language not supported for voice. Please type your message.';
          toast.error('Language not supported. Please type instead.');
          break;
        default:
          fallbackText = `Voice error: ${event.error || 'unknown'}. Please type your message instead.`;
          toast.error(`Voice error: ${event.error || 'unknown'}`);
          break;
      }

      // Always send fallback message so user gets a response in chat
      if (fallbackText) {
        handleSendRef.current(fallbackText);
      }
    };

    recognition.onend = () => {
      // Only manage state if we're still in Web Speech mode (the MediaRecorder
      // fallback manages its own state after a 'network' error).
      if (recordingModeRef.current === 'recognition') {
        setIsRecording(false);
      }
      // Auto-restart if user is still holding the mic button
      if (restartRef.current && recordingModeRef.current === 'recognition') {
        try {
          recognition.start();
        } catch {
          // Already started or not supported, ignore
        }
      }
    };

    recognitionRef.current = recognition;
  }, []);

  // Update language when toggle changes — also update recognition lang proactively
  useEffect(() => {
    if (recognitionRef.current && isRecording) {
      const newLang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognitionRef.current.lang = newLang;
    }
  }, [language]);

  const toggleRecording = useCallback(() => {
    // If currently speaking, stop TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
    }

    // Stop path — handles both Web Speech and MediaRecorder fallback modes
    if (isRecording) {
      restartRef.current = false;
      if (recordingModeRef.current === 'recorder') {
        mediaRecorderRef.current?.stop();
      } else {
        recognitionRef.current?.stop();
      }
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      toast.error('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      // Start recording — enable auto-restart for continuous listening
      restartRef.current = true;
      recordingModeRef.current = 'recognition';
      // Reset lang to current language setting
      const lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.lang = lang;
      recognition.start();
    } catch (err) {
      console.warn('[Voice] Failed to toggle recording:', err);
      setIsRecording(false);
      restartRef.current = false;
      toast.error('Could not start voice input. Make sure microphone permission is granted.');
    }
  }, [isRecording, language]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getAIHistory();
      setSessions(res.data);
    } catch {
      // silent
    }
    setLoadingHistory(false);
  };

  const loadSession = async (id: string) => {
    try {
      const res = await getAISessionMessages(id);
      setMessages(res.messages);
      setSessionId(id);
      setShowSuggestions(false);
      setView('chat');
    } catch {
      // silent
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteAISession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) {
        setMessages([]);
        setSessionId(null);
        setShowSuggestions(true);
      }
    } catch {
      // silent
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setShowSuggestions(true);
    setView('chat');
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (isAuthenticated && view === 'history') {
      loadHistory();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110',
          'bg-primary text-primary-foreground',
          isOpen && 'pointer-events-none scale-0 opacity-0'
        )}
        aria-label="Open AI Assistant"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200 sm:w-[400px]"
          style={{ height: 'min(600px, calc(100vh - 6rem))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">OneDW Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  {isStreaming ? 'Typing...' : 'Ready to help'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Toggle language"
              >
                {language === 'en' ? 'EN' : 'HI'}
              </button>
              {/* History */}
              <button
                onClick={() => {
                  setView((v) => {
                    const next = v === 'chat' ? 'history' : 'chat';
                    if (next === 'history') loadHistory();
                    return next;
                  });
                }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Chat history"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {/* New Chat */}
              <button
                onClick={startNewChat}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="New chat"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          {view === 'history' ? (
            <HistoryView
              sessions={sessions}
              loading={loadingHistory}
              onSelect={loadSession}
              onDelete={handleDeleteSession}
            />
          ) : (
            <>
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && showSuggestions ? (
                  <WelcomeView language={language} onSelect={(msg) => handleSend(msg)} />
                ) : (
                  <div className="space-y-4">
                    {messages.map((m, idx) => {
                      const prevUserMsg = m.role === 'assistant' && idx > 0
                        ? [...messages].slice(0, idx).reverse().find(msg => msg.role === 'user')?.content ?? ''
                        : '';
                      const msgCategory = m.role === 'assistant' ? detectCategory(m.content) : null;
                      const detectedCategory = msgCategory ?? detectCategory(prevUserMsg);
                      return (
                        <div key={m.id}>
                          <MessageBubble
                            message={{ ...m }}
                            onCopy={copyMessage}
                            copiedId={copiedId}
                            isSpeaking={isSpeaking}
                          />
                          {m.role === 'assistant' && msgCategory && (
                            <ServiceInfoCard type={msgCategory} problem={prevUserMsg} />
                          )}
                          {m.role === 'assistant' && !msgCategory && shouldShowBookingCard(m.content) && detectedCategory && (
                            <BookingCard category={detectedCategory} problem={prevUserMsg} />
                          )}
                        </div>
                      );
                    })}
                    {isStreaming && streamingContent && (
                      <MessageBubble
                        message={{ id: 'streaming', role: 'assistant', content: streamingContent, tokens_used: 0, created_at: '' }}
                        onCopy={copyMessage}
                        copiedId={copiedId}
                        isStreaming
                        isSpeaking={isSpeaking}
                      />
                    )}
                    {isStreaming && !streamingContent && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                  </div>
                )}
                {uploadedPreview && (
                  <div className="relative mt-3">
                    <button
                      onClick={clearUploadedImage}
                      className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
                    >
                      ✕
                    </button>
                    <img
                      src={uploadedPreview}
                      alt="Uploaded preview"
                      className="w-full rounded-xl object-cover"
                      style={{ maxHeight: 180 }}
                    />
                    {analysisLoading && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Analyzing image...
                      </div>
                    )}
                    {!analysisLoading && analysisRejected && (
                      <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        This image does not look like a service issue. Please upload a valid problem image.
                      </div>
                    )}
                    {!analysisLoading && uploadedCategory && (
                      <ServiceInfoCard type={uploadedCategory as 'plumbing' | 'cleaning' | 'ac_repair' | 'electrician' | 'appliance'} problem="Detected from image" />
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <button
                    onClick={toggleRecording}
                    disabled={isStreaming}
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={isRecording ? 'Stop recording' : 'Voice input'}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStreaming}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                    title="Upload image"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={language === 'hi' ? 'Apna sawaal likhein...' : 'Type your question...'}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-24"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isStreaming}
                    className="h-10 w-10 shrink-0 rounded-xl"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </Button>
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  AI can make mistakes. Verify critical information.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ─── Sub-components ─── */

function WelcomeView({ language, onSelect }: { language: string; onSelect: (msg: string) => void }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </div>
      <h3 className="font-display text-base font-semibold text-card-foreground">
        {language === 'hi' ? 'OneDW AI Sahayak' : 'OneDW AI Assistant'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {language === 'hi'
          ? 'Ghar ki samasyaon ka samadhaan paayen'
          : 'Get help with home service issues'}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {QUICK_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.message)}
            className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <span className="text-base">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCopy,
  copiedId,
  isStreaming = false,
  isSpeaking = false,
}: {
  message: AIMessage;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
  isStreaming?: boolean;
  isSpeaking?: boolean;
}) {
  const isUser = message.role === 'user';
  const displayContent = message.content;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-card-foreground rounded-bl-md'
        )}
      >
        {isUser ? (
          <div>
            <p className="whitespace-pre-wrap">{displayContent}</p>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-strong:text-card-foreground prose-code:text-xs prose-code:bg-muted-foreground/10 prose-code:px-1 prose-code:rounded">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current" />
        )}
        {!isStreaming && message.role === 'assistant' && isSpeaking && (
          <span className="ml-1 inline-flex items-center justify-center h-4 w-4">
            <svg className="h-3.5 w-3.5 text-primary animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </div>
  );
}

function HistoryView({
  sessions,
  loading,
  onSelect,
  onDelete,
}: {
  sessions: AISession[];
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-muted-foreground">No previous conversations</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="group flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onSelect(s.id)}
          >
            <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-card-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.message_count} messages · {new Date(s.updated_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
              className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Delete"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
