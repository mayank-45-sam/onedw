// Speech utilities for the OneDW worker verification flow.
// Text-to-speech (question/option reading) + speech-to-text (voice answers).

export type SpeechLang = 'en' | 'hi' | 'ta' | 'bn' | 'mr' | 'te' | 'kn' | 'ml' | 'gu' | 'pa' | 'ur';

const SCRIPT_RANGES: Array<[SpeechLang, RegExp]> = [
  ['ta', /[\u0B80-\u0BFF]/],
  ['bn', /[\u0980-\u09FF]/],
  ['te', /[\u0C00-\u0C7F]/],
  ['kn', /[\u0C80-\u0CFF]/],
  ['ml', /[\u0D00-\u0D7F]/],
  ['gu', /[\u0A80-\u0AFF]/],
  ['pa', /[\u0A00-\u0A7F]/],
  ['ur', /[\u0600-\u06FF]/],
  ['hi', /[\u0900-\u097F]/],
];

export function detectLanguage(text: string): SpeechLang {
  if (!text) return 'en';
  for (const [lang, re] of SCRIPT_RANGES) {
    if (re.test(text)) return lang;
  }
  return 'en';
}

export function toSpeechLang(lang: SpeechLang): string {
  switch (lang) {
    case 'hi': return 'hi-IN';
    case 'ta': return 'ta-IN';
    case 'bn': return 'bn-IN';
    case 'mr': return 'mr-IN';
    case 'te': return 'te-IN';
    case 'kn': return 'kn-IN';
    case 'ml': return 'ml-IN';
    case 'gu': return 'gu-IN';
    case 'pa': return 'pa-IN';
    case 'ur': return 'ur-IN';
    default: return 'en-IN';
  }
}

/** Pick the best TTS language for a piece of text, honouring local languages. */
export function ttsLanguage(text: string): string {
  const detected = detectLanguage(text);
  if (detected !== 'en') return toSpeechLang(detected);
  if (typeof navigator === 'undefined') return 'en-IN';
  const nav = navigator.language || 'en-IN';
  if (/^hi/i.test(nav)) return 'hi-IN';
  if (/^ta/i.test(nav)) return 'ta-IN';
  if (/^bn/i.test(nav)) return 'bn-IN';
  if (/^mr/i.test(nav)) return 'mr-IN';
  if (/^te/i.test(nav)) return 'te-IN';
  if (/^kn/i.test(nav)) return 'kn-IN';
  if (/^ml/i.test(nav)) return 'ml-IN';
  if (/^gu/i.test(nav)) return 'gu-IN';
  if (/^pa/i.test(nav)) return 'pa-IN';
  if (/^ur/i.test(nav)) return 'ur-IN';
  return 'en-IN';
}

export function pickSpeechVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefix = (lang || '').split('-')[0].toLowerCase();
  const byLang = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix));
  if (byLang) return byLang;
  const names: Record<string, string[]> = {
    ta: ['tamil'],
    hi: ['hindi'],
    bn: ['bengali'],
    mr: ['marathi'],
    te: ['telugu'],
    kn: ['kannada'],
    ml: ['malayalam'],
    gu: ['gujarati'],
    pa: ['punjabi'],
    ur: ['urdu'],
  };
  const keywords = names[prefix] ?? [];
  for (const kw of keywords) {
    const match = voices.find((v) => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }
  return null;
}

function cleanForSpeech(text: string): string {
  return text.replace(/[*_`#>\-\[\]{}()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

/** Speak text aloud. Returns a function that cancels the speech. */
export function speakText(text: string, opts: SpeakOptions = {}): () => void {
  const cancel = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
    opts.onEnd?.();
    return cancel;
  }
  cancel();
  const lang = opts.lang || ttsLanguage(text);
  const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
  utterance.lang = lang;
  utterance.rate = opts.rate ?? 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;

  const speak = () => {
    const voice = pickSpeechVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => opts.onStart?.();
    utterance.onend = () => {
      utterance.onend = null;
      utterance.onerror = null;
      opts.onEnd?.();
    };
    utterance.onerror = () => {
      utterance.onend = null;
      utterance.onerror = null;
      opts.onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => speak();
    setTimeout(speak, 200);
  } else {
    speak();
  }
  return cancel;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// ── Speech-to-text ────────────────────────────────────────────────

export type RecognitionResultEvent = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

export type RecognitionErrorEvent = Event & { error: string };

export type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: RecognitionResultEvent) => void) | null;
  onerror: ((ev: RecognitionErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
};

export function getSpeechRecognitionCtor(): (new () => RecognitionLike) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || undefined;
}
