import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { verificationService } from '@/services/verification.service';
import { getSpeechRecognitionCtor, stopSpeaking, type RecognitionLike } from '@/lib/speech';

const RETRYABLE_ERRORS = new Set(['no-speech', 'network', 'aborted', 'audio-capture']);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 900;

function errorMessage(code?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was denied. Enable the mic in your browser settings, then try again.';
    case 'audio-capture':
      return 'No audio could be captured. Check your microphone and try again.';
    case 'no-speech':
      return 'No speech was detected. Speak clearly into the microphone and try again.';
    case 'network':
      return 'The speech service is unreachable. Check your internet connection, then try again.';
    case 'aborted':
      return 'Recording was stopped before anything was captured. Tap the mic to retry.';
    case 'language-not-supported':
      return 'Voice input does not support this language. Please type your answer.';
    case 'bad-grammar':
      return 'The speech service is misconfigured. Please type your answer.';
    default:
      return 'Voice capture failed. Please type your answer.';
  }
}

async function requestMicPermission(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast.error('Voice input is not supported in this browser. Please type your answer.');
    return null;
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    const e = err as DOMException;
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
      toast.error('Microphone access was denied. Allow the mic in your browser settings, then try again.');
    } else if (e?.name === 'NotFoundError') {
      toast.error('No microphone was found on this device.');
    } else if (e?.name === 'NotReadableError') {
      toast.error('Your microphone is busy or being used by another app.');
    } else {
      toast.error('Could not access the microphone. Check your mic and browser permissions.');
    }
    return null;
  }
}

/**
 * Voice capture for answering questions. Uses the Web Speech API when
 * available and falls back to MediaRecorder + the OneDW transcription API.
 */
export function useVoiceCapture(onTranscript: (text: string) => void, lang = 'en-IN') {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const modeRef = useRef<'recognition' | 'recorder' | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const resultTimerRef = useRef<number | null>(null);

  const clearResultTimer = useCallback(() => {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearResultTimer();
    if (modeRef.current === 'recorder') {
      recorderRef.current?.stop();
    } else {
      recognitionRef.current?.stop();
    }
    setListening(false);
    modeRef.current = null;
  }, []);

  const startRecorder = useCallback(async () => {
    // MediaRecorder fallback
    if (typeof MediaRecorder === 'undefined') {
      toast.error('Voice input is not supported in this browser. Please type your answer.');
      return;
    }
    const stream = await requestMicPermission();
    if (!stream) return;

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
      toast.error('Voice recording could not be started. Please type your answer.');
      return;
    }

    const chunks: BlobPart[] = [];
    recorderRef.current = recorder;
    modeRef.current = 'recorder';
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onerror = () => {
      setListening(false);
      modeRef.current = null;
      toast.error('Recording failed. Please type your answer.');
    };
    recorder.onstop = async () => {
      setListening(false);
      modeRef.current = null;
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        toast.error('No audio was recorded. Please try again.');
        return;
      }
      setTranscribing(true);
      try {
        const text = await verificationService.transcribeInterviewAudio(blob);
        if (text && text.trim()) {
          onTranscript(text.trim());
        } else {
          toast.error('Could not transcribe your voice. Please type your answer.');
        }
      } catch {
        toast.error('Voice transcription failed. Please type your answer.');
      } finally {
        setTranscribing(false);
      }
    };

    try {
      recorder.start();
      setListening(true);
    } catch {
      setListening(false);
      modeRef.current = null;
      stream.getTracks().forEach((t) => t.stop());
      toast.error('Could not start voice recording. Please type your answer.');
    }
  }, [onTranscript]);

  const start = useCallback(async () => {
    stopSpeaking();
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      await startRecorder();
      return;
    }
    const stream = await requestMicPermission();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    let attempt = 0;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    modeRef.current = 'recognition';
    recognitionRef.current = rec;

    rec.onstart = () => {
      setListening(true);
      clearResultTimer();
      resultTimerRef.current = window.setTimeout(() => {
        if (modeRef.current !== 'recognition') return;
        setListening(false);
        modeRef.current = null;
        recognitionRef.current = null;
        try {
          rec.stop();
        } catch {
          /* noop */
        }
        void startRecorder();
      }, 8000);
    };
    rec.onresult = (event) => {
      clearResultTimer();
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || '';
      }
      const clean = transcript.trim();
      if (clean) onTranscript(clean);
    };
    rec.onerror = (event) => {
      const code = event?.error;
      clearResultTimer();
      if (code === 'network') {
        // Web Speech API sends audio to an external (Google) service which is
        // unreachable here. Switch to MediaRecorder + the backend transcription API.
        setListening(false);
        modeRef.current = null;
        recognitionRef.current = null;
        void startRecorder();
        return;
      }
      if (code && RETRYABLE_ERRORS.has(code) && attempt < MAX_RETRIES) {
        attempt += 1;
        setListening(false);
        setTimeout(() => {
          try {
            rec.start();
          } catch {
            setListening(false);
            modeRef.current = null;
            toast.error(errorMessage(code));
          }
        }, RETRY_DELAY_MS);
        return;
      }
      setListening(false);
      modeRef.current = null;
      recognitionRef.current = null;
      if (
        code === 'not-allowed' ||
        code === 'service-not-allowed' ||
        code === 'language-not-supported' ||
        code === 'bad-grammar'
      ) {
        toast.error(errorMessage(code));
        return;
      }
      void startRecorder();
    };
    rec.onend = () => {
      clearResultTimer();
      if (modeRef.current === 'recognition') {
        setListening(false);
        modeRef.current = null;
      }
    };
    try {
      rec.start();
    } catch {
      setListening(false);
      modeRef.current = null;
      toast.error(errorMessage());
    }
  }, [lang, onTranscript, startRecorder, clearResultTimer]);

  return { listening, transcribing, start, stop };
}
