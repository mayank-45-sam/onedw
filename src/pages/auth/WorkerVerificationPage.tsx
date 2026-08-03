import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Shield,
  FileText,
  ClipboardList,
  Camera,
  Mic,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Clock,
  AlertTriangle,
  Ban,
  Loader2,
  Download,
  MicOff,
  SkipForward,
  Send,
  BadgeCheck,
  GraduationCap,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ImageUpload } from '@/components/common/ImageUpload';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { LoadingState } from '@/components/common/States';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storage';
import { verificationService } from '@/services/verification.service';
import { useSpeech } from '@/hooks/useSpeech';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { ttsLanguage } from '@/lib/speech';
import type {
  Verification,
  SkillTestQuestion,
  SkillTestAnswerItem,
  AntiCheatTimeItem,
  CompleteVerificationResult,
  VerificationStatusResult,
  InterviewExchange,
  MyCertificateResult,
} from '@/types/verification';
import { cn } from '@/lib/utils';

type Stage = 'loading' | 'intro' | 'documents' | 'skill_test' | 'practical' | 'interview' | 'result';

const STEP_ORDER: Stage[] = ['documents', 'skill_test', 'practical', 'interview', 'result'];
const STEP_LABELS: Record<string, string> = {
  documents: 'Documents',
  skill_test: 'Skill test',
  practical: 'Practical',
  interview: 'Interview',
  result: 'Result',
};

const PROFESSION_SUGGESTIONS = [
  'Plumber',
  'Electrician',
  'Carpenter',
  'Painter',
  'AC Technician',
  'Cleaner',
  'Mason',
];

const PRACTICAL_INSTRUCTIONS: Record<string, string[]> = {
  Plumber: [
    'a finished plumbing installation — pipes, taps, a geyser or water-heater fitting',
    'a repaired leak you completed (close-up of the joint/fitting)',
    'your pipe-cutting / fitting tools laid out neatly',
  ],
  Electrician: [
    'a finished wiring job — a switchboard, MCB panel or distribution board',
    'a completed socket / switch / fan installation (closed-up, labelled if possible)',
    'your tools (tester, pliers, wire strippers) and your PPE together',
  ],
  Carpenter: [
    'a finished furniture piece or a wood joint you built',
    'a repaired item — a fixed door, hinge, drawer or worktop',
    'your measuring/cutting tools and a clean workspace',
  ],
  Painter: [
    'a finished painted wall or ceiling (straight edges and uniform coats)',
    'a repair you did — a patched crack, damp-treated or re-painted section',
    'your rollers, brushes, masking tape and sanding tools',
  ],
  'AC Technician': [
    'a split or window AC you serviced or installed (indoor and outdoor units)',
    'a repair — a cleaned coil, flushed drain line or replaced capacitor/contactor',
    'your gauges, gas manifold and PPE while working',
  ],
  Cleaner: [
    'a finished deep-cleaned room — bathroom, kitchen or living area',
    'a before/after comparison of a stain or mould you removed',
    'your cleaning products and equipment laid out safely',
  ],
  Mason: [
    'a wall, plastering, tiling or waterproofing job you completed',
    'a repaired crack or a freshly levelled/plumbed surface',
    'your trowel, spirit level, line and safety gear',
  ],
};

const DEFAULT_PRACTICAL_INSTRUCTIONS = [
  'a finished job you completed for a customer (clear, well-lit photo)',
  'a close-up detail shot showing the quality of the work',
  'your tools and safety equipment as you used them on the job',
];

function stepperIndex(stage: Stage) {
  const i = STEP_ORDER.indexOf(stage);
  return i === -1 ? 0 : i;
}

// Web Speech API surface (Chrome/Edge prefix) for the voice interview.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((ev: Event) => void) | null;
};

type SpeechRecognitionResultEventLike = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEventLike = Event & { error: string };

const SpeechRecognitionCtor: (new () => SpeechRecognitionLike) | undefined =
  (typeof window !== 'undefined'
    ? (window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }).SpeechRecognition ??
      (window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }).webkitSpeechRecognition
    : undefined) || undefined;

const RETRYABLE_RECOGNITION_ERRORS = new Set(['no-speech', 'network', 'aborted', 'audio-capture']);
const MAX_RECOGNITION_RETRIES = 2;
const RECOGNITION_RETRY_DELAY_MS = 900;

function recognitionErrorMessage(code?: string): string {
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

function normalizeSpeech(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Match a spoken answer to one of the MCQ options (by letter/number/text). */
function matchVoiceToOption(transcript: string, options: string[]): number | null {
  const norm = normalizeSpeech(transcript);
  if (!norm) return null;

  const letter = norm.match(/\boption\s+([a-d])\b/);
  if (letter) return letter[1].charCodeAt(0) - 97;
  const num = norm.match(/\boption\s+([1-4])\b/);
  if (num) return Number(num[1]) - 1;
  if (/^[a-d]$/.test(norm)) return norm.charCodeAt(0) - 97;
  if (/^[1-4]$/.test(norm)) return Number(norm) - 1;

  for (let i = 0; i < options.length; i++) {
    const optNorm = normalizeSpeech(options[i]);
    if (!optNorm) continue;
    if (norm.includes(optNorm) || optNorm.includes(norm)) return i;
  }
  return null;
}

async function requestMicrophonePermission(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.warn('[VoiceInterview] getUserMedia is not available in this browser');
    return null;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('[VoiceInterview] Microphone permission granted');
    return stream;
  } catch (err) {
    const e = err as DOMException;
    console.error('[VoiceInterview] Microphone permission denied:', e?.name, e?.message);
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
      toast.error('Microphone access was denied. Allow the mic for this site in your browser settings, then try again.');
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

export default function WorkerVerificationPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('loading');
  const [statusData, setStatusData] = useState<VerificationStatusResult | null>(null);

  // documents
  const [profession, setProfession] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [certImages, setCertImages] = useState<string[]>([]);
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docErrors, setDocErrors] = useState<{ profession?: string; aadhaar?: string }>({});

  // skill test
  const [questions, setQuestions] = useState<SkillTestQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const qIndexRef = useRef(0);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const shortAnswerRef = useRef('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<SkillTestAnswerItem[]>([]);
  const answersRef = useRef<SkillTestAnswerItem[]>([]);
  const [timePerQ, setTimePerQ] = useState<AntiCheatTimeItem[]>([]);
  const timePerQRef = useRef<AntiCheatTimeItem[]>([]);
  const [suspicious, setSuspicious] = useState<AntiCheatTimeItem[]>([]);
  const suspiciousRef = useRef<AntiCheatTimeItem[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const skippedCountRef = useRef(0);
  const [tabCount, setTabCount] = useState(0);
  const tabCountRef = useRef(0);
  const [warnings, setWarnings] = useState(0);
  const [skillFailed, setSkillFailed] = useState(false);
  const skillFailedRef = useRef(false);
  const [failedReason, setFailedReason] = useState<string | null>(null);
  const [skillScore, setSkillScore] = useState<number | null>(null);
  const [submittingTest, setSubmittingTest] = useState(false);
  const submittingTestRef = useRef(false);
  const startTsRef = useRef(0);
  const [skillTestListening, setSkillTestListening] = useState(false);
  const skillTestListeningRef = useRef(false);

  // practical
  const [practicalPhotos, setPracticalPhotos] = useState<string[]>([]);
  const [practicalSubmitting, setPracticalSubmitting] = useState(false);

  // interview
  const interviewSpeech = useSpeech();
  const [exchanges, setExchanges] = useState<InterviewExchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [interviewDone, setInterviewDone] = useState(false);
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [answerMode, setAnswerMode] = useState<'text' | 'voice'>('text');
  const [listening, setListening] = useState(false);
  const [interviewBusy, setInterviewBusy] = useState(false);
  const interviewStartedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const listeningModeRef = useRef<'recognition' | 'recorder' | null>(null);
  const recognitionTimeoutRef = useRef<number | null>(null);

  // result
  const [result, setResult] = useState<CompleteVerificationResult | null>(null);
  const [cert, setCert] = useState<MyCertificateResult | null>(null);
  const [navigating, setNavigating] = useState(false);

  // ── Initial load ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    verificationService
      .status()
      .then((data) => {
        if (!mounted) return;
        setStatusData(data);
        const savedProfession = data.active?.profession || data.worker?.profession;
        if (savedProfession) setProfession(savedProfession);
        if (data.latest && data.latest.status === 'completed') {
          try {
            localStorage.setItem(STORAGE_KEYS.workerVerified, 'true');
          } catch {
            /* ignore storage failures */
          }
        }
        if (data.hasActive && data.active) {
          goToStepFor(data.active.step);
        } else if (data.latest && data.latest.status === 'completed') {
          setStage('result');
        } else {
          setStage('intro');
        }
      })
      .catch(() => {
        if (mounted) setStage('intro');
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToStepFor = (step: string) => {
    if (step === 'documents') setStage('documents');
    else if (step === 'skill_test') setStage('skill_test');
    else if (step === 'practical') setStage('practical');
    else if (step === 'interview') setStage('interview');
    else setStage('result');
  };

  // ── Documents ───────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      await verificationService.start(profession || undefined);
      setStage('documents');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start verification.';
      toast.error(msg);
    }
  };

  const handleSubmitDocuments = async () => {
    const e: typeof docErrors = {};
    if (!profession.trim()) e.profession = 'Profession is required';
    const digits = aadhaarNumber.replace(/\D/g, '');
    if (digits.length !== 0 && digits.length !== 12) e.aadhaar = 'Aadhaar must be exactly 12 digits';
    setDocErrors(e);
    if (Object.keys(e).length) return;

    setDocSubmitting(true);
    try {
      await verificationService.submitDocuments({
        profession: profession.trim(),
        experience_years: experienceYears ? Number(experienceYears) : undefined,
        aadhaar_number: digits.length === 12 ? digits : undefined,
        certificate_images: certImages,
        work_photos: workPhotos,
      });
      toast.success('Documents saved! Starting your technical skill test.');
      setStage('skill_test');
    } catch (err) {
      toast.error('Failed to save documents. Please try again.');
    } finally {
      setDocSubmitting(false);
    }
  };

  // ── Skill test ──────────────────────────────────────────────────
  useEffect(() => {
    if (stage === 'skill_test' && questions.length === 0 && !generating) {
      setGenerating(true);
      verificationService
        .generateSkillTest()
        .then((res) => {
          const qs = res.questions || [];
          setQuestions(qs);
          qIndexRef.current = 0;
          setQIndex(0);
          setTimeLeft(qs[0]?.timeLimit ?? 20);
          startTsRef.current = Date.now();
          setAnswers([]);
          answersRef.current = [];
          setTimePerQ([]);
          timePerQRef.current = [];
          setSuspicious([]);
          suspiciousRef.current = [];
          setSkippedCount(0);
          skippedCountRef.current = 0;
          setTabCount(0);
          tabCountRef.current = 0;
          setWarnings(0);
          setSkillFailed(false);
          skillFailedRef.current = false;
          setFailedReason(null);
          setSkillScore(null);
          setSelected(null);
          selectedRef.current = null;
          setShortAnswer('');
          shortAnswerRef.current = '';
        })
        .catch(() => toast.error('Failed to generate the skill test. Please try again.'))
        .finally(() => setGenerating(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, questions.length, generating]);

  const submitTest = useCallback(
    async (
      allAnswers: SkillTestAnswerItem[],
      allTime: AntiCheatTimeItem[],
      allSuspicious: AntiCheatTimeItem[],
      skipped: number,
    ) => {
      if (submittingTestRef.current) return;
      submittingTestRef.current = true;
      setSubmittingTest(true);
      try {
        const res = await verificationService.submitSkillTest({
          answers: allAnswers,
          anti_cheat: {
            tab_switch_count: tabCountRef.current,
            warnings_issued: Math.min(tabCountRef.current, 2),
            skipped_count: skipped,
            time_per_question: allTime,
            suspicious_fast_answers: allSuspicious,
          },
        });
        setSkillScore(res.score);
        if (res.failed || res.analytics?.failed) {
          setSkillFailed(true);
          skillFailedRef.current = true;
          setFailedReason(res.reason || 'tab_switch_limit');
        } else {
          setStage('practical');
        }
      } catch (err) {
        toast.error('Failed to submit the skill test. Please try again.');
      } finally {
        submittingTestRef.current = false;
        setSubmittingTest(false);
      }
    },
    [],
  );

  const recordAndAdvance = useCallback(() => {
    const q = questions[qIndexRef.current];
    if (!q) return;
    const limit = q.timeLimit || 20;
    const elapsed = Math.round((Date.now() - startTsRef.current) / 1000);
    const timeTaken = Math.max(0, Math.min(limit + 10, elapsed));
    const isShort = q.type === 'short_answer';
    const text = shortAnswerRef.current;
    const sel = selectedRef.current;
    const skipped = isShort ? !text.trim() : sel == null;

    const answer: SkillTestAnswerItem = { question_id: q._id, skipped };
    if (!skipped) {
      if (isShort) answer.answer = text;
      else answer.selected_option = sel;
    }
    const timeItem: AntiCheatTimeItem = { question_id: q._id, time_taken: timeTaken };

    const nextAnswers = [...answersRef.current, answer];
    const nextTime = [...timePerQRef.current, timeItem];
    const nextSuspicious =
      !skipped && timeTaken < 2 ? [...suspiciousRef.current, timeItem] : suspiciousRef.current;
    const nextSkipped = skippedCountRef.current + (skipped ? 1 : 0);

    answersRef.current = nextAnswers;
    timePerQRef.current = nextTime;
    suspiciousRef.current = nextSuspicious;
    skippedCountRef.current = nextSkipped;
    setAnswers(nextAnswers);
    setTimePerQ(nextTime);
    setSuspicious(nextSuspicious);
    setSkippedCount(nextSkipped);

    if (qIndexRef.current + 1 >= questions.length) {
      void submitTest(nextAnswers, nextTime, nextSuspicious, nextSkipped);
      return;
    }
    qIndexRef.current += 1;
    setQIndex(qIndexRef.current);
    setSelected(null);
    selectedRef.current = null;
    setShortAnswer('');
    shortAnswerRef.current = '';
    const nextLimit = questions[qIndexRef.current]?.timeLimit ?? 20;
    setTimeLeft(nextLimit);
    startTsRef.current = Date.now();
  }, [questions, submitTest]);

  // per-question timer
  useEffect(() => {
    if (stage !== 'skill_test' || questions.length === 0 || skillFailed || generating || submittingTest) return;
    const limit = questions[qIndex]?.timeLimit ?? 20;
    setTimeLeft(limit);
    const deadline = Date.now() + limit * 1000;
    startTsRef.current = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !skillTestListeningRef.current) {
        clearInterval(id);
        recordAndAdvance();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, qIndex, questions, skillFailed, generating, submittingTest, skillTestListening, recordAndAdvance]);

  // anti-cheat: tab switch detection
  const handleTabSwitch = useCallback(() => {
    const next = tabCountRef.current + 1;
    tabCountRef.current = next;
    setTabCount(next);
    if (next === 1) {
      setWarnings(1);
      toast.error('Warning: Leaving the test window is not allowed. This is your 1st warning.');
    } else if (next === 2) {
      setWarnings(2);
      toast.error('Final warning: one more tab switch will fail the test.');
    } else {
      if (!skillFailedRef.current && !submittingTestRef.current) {
        skillFailedRef.current = true;
        setSkillFailed(true);
        setFailedReason('tab_switch_limit');
        toast.error('Test failed: tab switching limit exceeded.');
        void submitTest(answersRef.current, timePerQRef.current, suspiciousRef.current, skippedCountRef.current);
      }
    }
  }, [submitTest]);

  useEffect(() => {
    if (stage !== 'skill_test' || questions.length === 0 || skillFailed) return;
    const onVisibility = () => {
      if (document.hidden) handleTabSwitch();
    };
    const onBlur = () => {
      if (!skillTestListeningRef.current) handleTabSwitch();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [stage, questions.length, skillFailed, handleTabSwitch]);

  const selectOption = (idx: number) => {
    selectedRef.current = idx;
    setSelected(idx);
  };

  const handleSkillTestListeningChange = useCallback((v: boolean) => {
    skillTestListeningRef.current = v;
    setSkillTestListening(v);
  }, []);

  // ── Practical ───────────────────────────────────────────────────
  const handleSubmitPractical = async () => {
    if (!practicalPhotos.length) {
      toast.error('Please upload at least one work photo.');
      return;
    }
    setPracticalSubmitting(true);
    try {
      await verificationService.submitPractical(
        practicalPhotos.map((url) => ({ url, type: 'image' as const })),
      );
      toast.success('Practical assessment submitted! Starting your interview.');
      setStage('interview');
    } catch (err) {
      toast.error('Failed to submit the practical assessment. Please try again.');
    } finally {
      setPracticalSubmitting(false);
    }
  };

  // ── Interview ───────────────────────────────────────────────────
  useEffect(() => {
    if (stage === 'interview' && !interviewStartedRef.current) {
      interviewStartedRef.current = true;
      setInterviewBusy(true);
      verificationService
        .startInterview()
        .then((res) => {
          setExchanges(res.exchanges || []);
          setCurrentQuestion(res.currentQuestion);
          setInterviewDone(res.done);
        })
        .catch(() => toast.error('Could not start the interview. Please try again.'))
        .finally(() => setInterviewBusy(false));
    }
  }, [stage]);

  // Read the AI interviewer's question aloud.
  useEffect(() => {
    if (stage === 'interview' && currentQuestion) {
      interviewSpeech.speak(currentQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentQuestion]);

  const completeNow = async () => {
    setInterviewBusy(true);
    try {
      const res = await verificationService.complete();
      setResult(res);
      try {
        localStorage.setItem(STORAGE_KEYS.workerVerified, 'true');
      } catch {
        /* ignore storage failures */
      }
      setStage('result');
    } catch (err) {
      toast.error('Could not finalise your verification. Please try again.');
    } finally {
      setInterviewBusy(false);
    }
  };

  const handleRespond = async () => {
    const answer = interviewAnswer.trim();
    if (!answer) {
      toast.error('Please provide an answer before continuing.');
      return;
    }
    setInterviewBusy(true);
    try {
      const res = await verificationService.respondInterview(answer, answerMode);
      setExchanges(res.exchanges || []);
      if (res.done) {
        setInterviewDone(true);
        await completeNow();
      } else {
        setCurrentQuestion(res.currentQuestion || '');
        setInterviewAnswer('');
      }
    } catch (err) {
      toast.error('Failed to send your answer. Please try again.');
    } finally {
      setInterviewBusy(false);
    }
  };

  const goToDashboard = useCallback(() => {
    console.log('[WorkerVerification] goToDashboard: navigating to', ROUTES.workerDashboard);
    try {
      localStorage.setItem(STORAGE_KEYS.workerVerified, 'true');
    } catch (err) {
      console.warn('[WorkerVerification] could not persist verified flag before navigating', err);
    }
    setNavigating(true);
    try {
      navigate(ROUTES.workerDashboard);
      console.log('[WorkerVerification] navigate() invoked to', ROUTES.workerDashboard);
    } catch (err) {
      console.error('[WorkerVerification] dashboard navigation threw', err);
      setNavigating(false);
      toast.error('Could not open the dashboard. Please try again.');
    }
  }, [navigate]);

  const recordWithMediaRecorder = async () => {
    console.log('[VoiceInterview] Starting MediaRecorder fallback');
    if (typeof MediaRecorder === 'undefined') {
      console.warn('[VoiceInterview] MediaRecorder is not supported in this browser');
      toast.error('Voice recording is not supported in this browser. Please type your answer.');
      return;
    }
    const stream = await requestMicrophonePermission();
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
    } catch (err) {
      console.error('[VoiceInterview] MediaRecorder construction failed', err);
      stream.getTracks().forEach((t) => t.stop());
      toast.error('Voice recording could not be started. Please type your answer.');
      return;
    }

    const chunks: BlobPart[] = [];
    mediaRecorderRef.current = recorder;
    listeningModeRef.current = 'recorder';

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onerror = (ev) => {
      console.error('[VoiceInterview] MediaRecorder error', ev.error);
      setListening(false);
      listeningModeRef.current = null;
      toast.error('Recording failed. Please type your answer.');
    };
    recorder.onstop = async () => {
      console.log('[VoiceInterview] MediaRecorder stopped');
      setListening(false);
      listeningModeRef.current = null;
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mimeType });
      console.log('[VoiceInterview] Captured', blob.size, 'bytes of', mimeType);
      if (blob.size === 0) {
        toast.error('No audio was recorded. Please try again.');
        return;
      }
      setInterviewBusy(true);
      try {
        const text = await verificationService.transcribeInterviewAudio(blob);
        console.log('[VoiceInterview] Transcription result:', text);
        if (text && text.trim()) {
          setInterviewAnswer((prev) => (prev ? `${prev} ${text}` : text).trim());
          setAnswerMode('voice');
          toast.success('Voice answer transcribed');
        } else {
          toast.error('Could not transcribe your voice. Please type your answer.');
        }
      } catch (err) {
        console.error('[VoiceInterview] Transcription request failed', err);
        toast.error('Voice transcription failed. Please type your answer.');
      } finally {
        setInterviewBusy(false);
      }
    };

    try {
      recorder.start();
      setListening(true);
      console.log('[VoiceInterview] MediaRecorder started with', mimeType);
    } catch (err) {
      console.error('[VoiceInterview] MediaRecorder.start() failed', err);
      setListening(false);
      listeningModeRef.current = null;
      stream.getTracks().forEach((t) => t.stop());
      toast.error('Could not start voice recording. Please type your answer.');
    }
  };

  const toggleListening = async () => {
    console.log('[VoiceInterview] toggleListening', {
      listening,
      webSpeechApi: !!SpeechRecognitionCtor,
      mediaRecorder: typeof MediaRecorder !== 'undefined',
    });

    if (!SpeechRecognitionCtor) {
      console.warn('[VoiceInterview] Web Speech API unavailable — using MediaRecorder fallback');
      await recordWithMediaRecorder();
      return;
    }

    if (listening) {
      if (recognitionTimeoutRef.current !== null) {
        window.clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
      if (listeningModeRef.current === 'recorder') {
        console.log('[VoiceInterview] Stopping MediaRecorder');
        mediaRecorderRef.current?.stop();
      } else {
        console.log('[VoiceInterview] Stopping Web Speech recognition');
        recognitionRef.current?.stop();
      }
      setListening(false);
      return;
    }

    const stream = await requestMicrophonePermission();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    interviewSpeech.stop();

    let attempt = 0;
    const rec = new SpeechRecognitionCtor();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    listeningModeRef.current = 'recognition';
    recognitionRef.current = rec;

    rec.onstart = () => {
      console.log('[VoiceInterview] Web Speech recognition started');
      setListening(true);
      if (recognitionTimeoutRef.current !== null) window.clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = window.setTimeout(() => {
        if (listeningModeRef.current !== 'recognition') return;
        console.warn('[VoiceInterview] No result after 8s — switching to MediaRecorder fallback');
        setListening(false);
        listeningModeRef.current = null;
        try {
          rec.stop();
        } catch (err) {
          console.error('[VoiceInterview] stop() after timeout threw', err);
        }
        void recordWithMediaRecorder();
      }, 8000);
    };
    rec.onresult = (event) => {
      if (recognitionTimeoutRef.current !== null) {
        window.clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || '';
      }
      const clean = transcript.trim();
      console.log('[VoiceInterview] Recognition transcript:', clean);
      if (clean) {
        setInterviewAnswer((prev) => (prev ? `${prev} ${clean}` : clean).trim());
        setAnswerMode('voice');
      }
    };
    rec.onerror = (event) => {
      const code = event?.error;
      console.error('[VoiceInterview] Recognition error:', code);
      if (recognitionTimeoutRef.current !== null) {
        window.clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
      if (code === 'network') {
        console.warn('[VoiceInterview] Web Speech API unreachable — switching to MediaRecorder fallback');
        setListening(false);
        listeningModeRef.current = null;
        void recordWithMediaRecorder();
        return;
      }
      if (code && RETRYABLE_RECOGNITION_ERRORS.has(code) && attempt < MAX_RECOGNITION_RETRIES) {
        attempt += 1;
        console.warn(`[VoiceInterview] Retrying recognition (${attempt}/${MAX_RECOGNITION_RETRIES}) after ${code}`);
        setListening(false);
        setTimeout(() => {
          try {
            rec.start();
          } catch (err) {
            console.error('[VoiceInterview] Retry start() threw', err);
            setListening(false);
            toast.error(recognitionErrorMessage(code));
          }
        }, RECOGNITION_RETRY_DELAY_MS);
        return;
      }
      setListening(false);
      listeningModeRef.current = null;
      if (
        code === 'not-allowed' ||
        code === 'service-not-allowed' ||
        code === 'language-not-supported' ||
        code === 'bad-grammar'
      ) {
        toast.error(recognitionErrorMessage(code));
        return;
      }
      console.warn('[VoiceInterview] Recognition failed after retries — switching to MediaRecorder fallback');
      void recordWithMediaRecorder();
    };
    rec.onend = () => {
      console.log('[VoiceInterview] Web Speech recognition ended');
      if (recognitionTimeoutRef.current !== null) {
        window.clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
      if (listeningModeRef.current === 'recognition') {
        setListening(false);
        listeningModeRef.current = null;
      }
    };

    try {
      rec.start();
      console.log('[VoiceInterview] Web Speech recognition start() invoked');
    } catch (err) {
      console.error('[VoiceInterview] Web Speech start() threw', err);
      setListening(false);
      listeningModeRef.current = null;
      toast.error(recognitionErrorMessage());
    }
  };

  // ── Result / certificate ────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'result') return;
    if (result?.certificate) {
      setCert(result.certificate);
      return;
    }
    let mounted = true;
    verificationService
      .myCertificate()
      .then((c) => {
        if (mounted) setCert(c);
      })
      .catch(() => {
        if (mounted) setCert(null);
      });
    return () => {
      mounted = false;
    };
  }, [stage, result]);

  const latest = result ?? (statusData?.latest as unknown as CompleteVerificationResult | null);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        {/* header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold md:text-3xl">AI Skill Verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Documents · AI technical test · Practical · Voice interview
          </p>
        </motion.div>

        {/* stepper */}
        {stage !== 'loading' && stage !== 'intro' && stage !== 'result' && (
          <div className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2">
            {STEP_ORDER.map((s, i) => {
              const active = stepperIndex(stage) === i;
              const done = stepperIndex(stage) > i;
              return (
                <div key={s} className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition sm:px-3',
                      active
                        ? 'bg-primary text-primary-foreground shadow-glow'
                        : done
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="hidden h-1.5 w-1.5 rounded-full bg-current sm:block" />}
                    <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
                  </div>
                  {i < STEP_ORDER.length - 1 && <div className={cn('h-px w-3 sm:w-6', done ? 'bg-success/40' : 'bg-border')} />}
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="mt-8"
          >
            {stage === 'loading' && <LoadingState className="min-h-[40vh]" title="Checking verification status…" />}

            {stage === 'intro' && (
              <div className="card-premium space-y-6 p-6 md:p-8">
                <div>
                  <h2 className="font-display text-xl font-bold">Welcome to professional verification</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Complete a short AI-powered assessment to earn a verified badge and certificate. This builds
                    customer trust and unlocks more job opportunities.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: FileText, title: 'Profile & documents', desc: 'Profession, experience and identity' },
                    { icon: ClipboardList, title: 'Technical skill test', desc: 'Timed questions with anti-cheat monitoring' },
                    { icon: Camera, title: 'Practical assessment', desc: 'Upload photos of your real work' },
                    { icon: Mic, title: 'AI voice interview', desc: 'Answer a few questions with your voice' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">Tip:</span> Find a quiet place. The skill test is
                    timed — switching tabs triggers warnings and three switches will fail the test.
                  </p>
                </div>

                <Button className="btn-glow w-full gap-2 rounded-xl" onClick={handleStart}>
                  <Sparkles className="h-4 w-4" /> Start verification
                </Button>
              </div>
            )}

            {stage === 'documents' && (
              <div className="card-premium space-y-5 p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold">Profile & documents</h2>
                    <p className="text-xs text-muted-foreground">Step 1 of 4 — used to compute your documents score.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession</Label>
                    <Input
                      id="profession"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="e.g. Plumber, Electrician, AC Technician"
                      list="profession-suggestions"
                    />
                    <datalist id="profession-suggestions">
                      {PROFESSION_SUGGESTIONS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">
                      Your questions, practical check and interview are tailored to this profession.
                    </p>
                    {docErrors.profession && <p className="text-sm text-error">{docErrors.profession}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exp">Years of experience</Label>
                    <Input
                      id="exp"
                      type="number"
                      min={0}
                      max={80}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                      placeholder="e.g. 3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aadhaar">Aadhaar number (optional)</Label>
                    <Input
                      id="aadhaar"
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="12-digit Aadhaar number"
                      maxLength={12}
                      inputMode="numeric"
                    />
                    {docErrors.aadhaar && <p className="text-sm text-error">{docErrors.aadhaar}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Work photos</Label>
                    <ImageUpload folder="portfolio" max={5} urls={workPhotos} onChange={setWorkPhotos} label="" />
                  </div>

                  <div className="space-y-2">
                    <Label>Certificates (optional)</Label>
                    <ImageUpload folder="certificate" max={3} urls={certImages} onChange={setCertImages} label="" />
                  </div>
                </div>

                <div className="flex justify-between gap-3">
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={goToDashboard}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button className="btn-glow gap-2 rounded-xl" onClick={handleSubmitDocuments} disabled={docSubmitting}>
                    {docSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Continue to skill test
                  </Button>
                </div>
              </div>
            )}

            {stage === 'skill_test' && (
              <div className="card-premium overflow-hidden">
                {generating ? (
                  <LoadingState className="min-h-[40vh]" title="Generating your AI skill test…" />
                ) : questions.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">No questions available.</p>
                    <Button className="btn-glow mt-4 gap-2 rounded-xl" onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 md:p-8">
                    {/* header bar */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-primary" />
                        <span className="font-semibold">
                          Question {Math.min(qIndex + 1, questions.length)} of {questions.length}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                          {questions[qIndex]?.difficulty ?? 'medium'}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums',
                          timeLeft <= 5 ? 'bg-error/10 text-error' : 'bg-muted text-foreground'
                        )}
                      >
                        <Clock className="h-4 w-4" /> {timeLeft}s
                      </div>
                    </div>

                    {/* progress */}
                    <Progress value={((qIndex + 1) / questions.length) * 100} className="mb-6 h-2" />

                    {/* anti-cheat warnings */}
                    {(tabCount > 0 || skillFailed) && (
                      <div
                        className={cn(
                          'mb-5 flex items-center gap-2 rounded-xl border p-3 text-sm font-medium',
                          skillFailed ? 'border-error/30 bg-error/10 text-error' : 'border-warning/30 bg-warning/10 text-warning'
                        )}
                      >
                        {skillFailed ? <Ban className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                        <span>
                          {skillFailed
                            ? 'Test failed due to excessive tab switching.'
                            : `Anti-cheat warning ${warnings} of 2 — avoid switching tabs.`}
                        </span>
                      </div>
                    )}

                    {skillFailed ? (
                      <div className="space-y-5 py-4 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10">
                          <XCircle className="h-8 w-8 text-error" />
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-bold">Test failed</h3>
                          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                            {failedReason === 'tab_switch_limit'
                              ? 'You switched tabs too many times during the test. This attempt has been recorded as failed.'
                              : 'This attempt has been recorded as failed.'}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                          <Button variant="outline" className="gap-2 rounded-xl" onClick={goToDashboard}>
                            Go to dashboard
                          </Button>
                          <Button className="btn-glow gap-2 rounded-xl" onClick={() => window.location.reload()}>
                            Retry verification
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <SkillTestQuestionView
                        question={questions[qIndex]}
                        selected={selected}
                        shortAnswer={shortAnswer}
                        submitting={submittingTest}
                        onSelectOption={selectOption}
                        onListeningChange={handleSkillTestListeningChange}
                        onShortAnswer={(v) => {
                          shortAnswerRef.current = v;
                          setShortAnswer(v);
                        }}
                        onNext={(skip) => {
                          if (skip) {
                            selectedRef.current = null;
                            shortAnswerRef.current = '';
                            setSelected(null);
                            setShortAnswer('');
                          }
                          recordAndAdvance();
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {stage === 'practical' && (
              <div className="card-premium space-y-5 p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold">Practical assessment</h2>
                    <p className="text-xs text-muted-foreground">Step 3 of 4 — upload photos of your real work.</p>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <p className="mb-2">
                    Upload <span className="font-semibold text-foreground">at least one photo</span> of your real{' '}
                    <span className="font-semibold text-foreground">{profession.trim() || 'trade'}</span> work. Our AI
                    reviews the quality of the work against professional{' '}
                    <span className="font-semibold text-foreground">{profession.trim() || 'trade'}</span> standards.
                  </p>
                  <p className="mb-1 font-medium text-foreground">Good examples to upload:</p>
                  <ul className="list-inside list-disc space-y-1">
                    {(PRACTICAL_INSTRUCTIONS[profession.trim()] || DEFAULT_PRACTICAL_INSTRUCTIONS).map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>

                <ImageUpload folder="portfolio" max={6} urls={practicalPhotos} onChange={setPracticalPhotos} label="Work photos" />

                <div className="flex justify-between gap-3">
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={() => setStage('skill_test')}
                    disabled={practicalSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button className="btn-glow gap-2 rounded-xl" onClick={handleSubmitPractical} disabled={practicalSubmitting}>
                    {practicalSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit for AI review
                  </Button>
                </div>
              </div>
            )}

            {stage === 'interview' && (
              <div className="card-premium space-y-5 p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold">AI voice interview</h2>
                    <p className="text-xs text-muted-foreground">
                      Step 4 of 4 — exchange {Math.min(exchanges.length, 4)} of 4 questions.
                    </p>
                  </div>
                </div>

                {interviewBusy && !currentQuestion ? (
                  <LoadingState className="min-h-[30vh]" title="Starting your interview…" />
                ) : interviewDone && result ? (
                  <LoadingState className="min-h-[30vh]" title="Finalising your result…" />
                ) : (
                  <>
                    <div className="rounded-2xl border bg-muted/30 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Interviewer
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 rounded-xl"
                          onClick={() => interviewSpeech.speak(currentQuestion)}
                          disabled={interviewBusy || !currentQuestion}
                        >
                          <Volume2 className={cn('h-4 w-4', interviewSpeech.speaking && 'animate-pulse')} />
                          {interviewSpeech.speaking ? 'Reading…' : 'Speak again'}
                        </Button>
                      </div>
                      <p className="mt-2 font-medium leading-relaxed">{currentQuestion}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interview-answer">Your answer</Label>
                      <Textarea
                        id="interview-answer"
                        rows={4}
                        value={interviewAnswer}
                        onChange={(e) => setInterviewAnswer(e.target.value)}
                        placeholder="Speak your answer or type it here…"
                        disabled={interviewBusy}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant={listening ? 'destructive' : 'outline'}
                        className="gap-2 rounded-xl"
                        onClick={toggleListening}
                        disabled={interviewBusy}
                      >
                        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {listening ? 'Stop recording' : 'Answer with voice'}
                      </Button>
                      {answerMode === 'voice' && !listening && (
                        <span className="flex items-center gap-1.5 text-xs text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Voice answer captured
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between gap-3">
                      <Button
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={() => setStage('practical')}
                        disabled={interviewBusy}
                      >
                        <ArrowLeft className="h-4 w-4" /> Back
                      </Button>
                      <Button className="btn-glow gap-2 rounded-xl" onClick={handleRespond} disabled={interviewBusy}>
                        {interviewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        {exchanges.length >= 4 ? 'Finish interview' : 'Submit answer'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {stage === 'result' && (
              <ResultStep latest={latest} cert={cert} navigating={navigating} onDashboard={goToDashboard} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────

function SkillTestQuestionView({
  question,
  selected,
  shortAnswer,
  submitting,
  onSelectOption,
  onShortAnswer,
  onNext,
  onListeningChange,
}: {
  question: SkillTestQuestion;
  selected: number | null;
  shortAnswer: string;
  submitting: boolean;
  onSelectOption: (idx: number) => void;
  onShortAnswer: (value: string) => void;
  onNext: (skip: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
}) {
  const isShort = question.type === 'short_answer';
  const answered = isShort ? shortAnswer.trim().length > 0 : selected !== null;
  const { speaking, speak, stop: stopSpeech } = useSpeech();
  const shortAnswerRef = useRef(shortAnswer);
  shortAnswerRef.current = shortAnswer;

  const speechText = useMemo(() => {
    const prefix = `Question: ${question.question}`;
    if (question.options && question.options.length > 0) {
      const opts = question.options
        .map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt}`)
        .join('. ');
      return `${prefix}. ${opts}`;
    }
    return prefix;
  }, [question.question, question.options]);

  // Automatically read the question + options aloud for every question.
  useEffect(() => {
    speak(speechText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question._id]);

  const handleTranscript = useCallback(
    (text: string) => {
      if (isShort) {
        const current = shortAnswerRef.current.trim();
        const merged = current ? `${current} ${text}`.trim() : text;
        onShortAnswer(merged);
        return;
      }
      const idx = matchVoiceToOption(text, question.options);
      if (idx !== null) {
        onSelectOption(idx);
        toast.success('Answer selected from your voice.');
      } else {
        toast(`Heard: "${text}" — please tap the closest option.`);
      }
    },
    [isShort, question.options, onSelectOption, onShortAnswer],
  );

  const voice = useVoiceCapture(handleTranscript, ttsLanguage(question.question));

  useEffect(() => {
    onListeningChange?.(voice.listening || voice.transcribing);
  }, [voice.listening, voice.transcribing, onListeningChange]);

  return (
    <div className="space-y-6">
      {question.imageUrl && (
        <div className="overflow-hidden rounded-2xl border">
          <img
            src={question.imageUrl}
            alt=""
            className="h-48 w-full object-cover"
            onError={(e) => {
              console.warn('[SkillTest] Image failed to load:', question.imageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {question.type === 'mcq' && 'Multiple choice'}
          {question.type === 'scenario' && 'Scenario'}
          {question.type === 'image' && 'Image question'}
          {question.type === 'short_answer' && 'Short answer'}
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold leading-relaxed">{question.question}</h3>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl"
          onClick={() => speak(speechText)}
          disabled={submitting}
        >
          <Volume2 className={cn('h-4 w-4', speaking && 'animate-pulse')} />
          {speaking ? 'Reading…' : 'Speak again'}
        </Button>
        <Button
          variant={voice.listening ? 'destructive' : 'outline'}
          size="sm"
          className="gap-2 rounded-xl"
          onClick={() => {
            if (voice.listening) {
              voice.stop();
            } else {
              stopSpeech();
              void voice.start();
            }
          }}
          disabled={submitting || voice.transcribing}
        >
          {voice.transcribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : voice.listening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {voice.transcribing
            ? 'Transcribing…'
            : voice.listening
              ? 'Stop recording'
              : isShort
                ? 'Answer with voice'
                : 'Say your answer'}
        </Button>
      </div>

      {isShort ? (
        <Textarea
          rows={4}
          value={shortAnswer}
          onChange={(e) => onShortAnswer(e.target.value)}
          placeholder="Type your answer in detail (8+ words recommended)…"
          disabled={submitting}
        />
      ) : (
        <div className="space-y-2.5">
          {question.options.map((opt, idx) => {
            const active = selected === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption(idx)}
                disabled={submitting}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition',
                  active
                    ? 'border-primary bg-primary/10 text-primary shadow-glow'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                  )}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" className="gap-2 rounded-xl" onClick={() => onNext(true)} disabled={submitting}>
          <SkipForward className="h-4 w-4" /> Skip
        </Button>
        <Button className="btn-glow gap-2 rounded-xl" onClick={() => onNext(false)} disabled={submitting || !answered}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Next question
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────

function ResultStep({
  latest,
  cert,
  navigating,
  onDashboard,
}: {
  latest: CompleteVerificationResult | Verification | null;
  cert: MyCertificateResult | null;
  navigating: boolean;
  onDashboard: () => void;
}) {
  const badge = latest?.badge ?? cert?.badge;
  const trust = latest?.trustScore ?? cert?.trustScore;
  const rejected = badge === 'rejected';

  const scoreRows = [
    { label: 'Technical test', value: latest?.technicalScore },
    { label: 'Practical', value: latest?.practicalScore },
    { label: 'Interview', value: latest?.interviewScore },
    { label: 'Documents', value: latest?.documentsScore },
    { label: 'Experience', value: latest?.experienceScore },
  ].filter((r) => r.value != null);

  const recommendations =
    'trainingRecommendations' in (latest ?? {})
      ? ((latest as CompleteVerificationResult).trainingRecommendations ?? [])
      : [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-premium p-6 text-center md:p-8"
      >
        {rejected ? (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10">
            <XCircle className="h-8 w-8 text-error" />
          </div>
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
            <Award className="h-8 w-8 text-success" />
          </div>
        )}

        <h2 className="mt-4 font-display text-2xl font-bold">
          {rejected ? 'Verification not passed yet' : 'You are verified!'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {rejected
            ? 'Your overall score was below the required minimum. Review the training recommendations and retry after the cooldown period.'
            : 'Your skills have been verified by our AI assessment. Show your certificate to customers to build trust.'}
        </p>

        {badge && (
          <div className="mt-5 flex justify-center">
            <VerificationBadge badge={badge} trustScore={trust} size="md" showScore />
          </div>
        )}
      </motion.div>

      {!rejected && (
        <div className="grid gap-4 sm:grid-cols-2">
          {scoreRows.map((row) => (
            <div key={row.label} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{row.label}</p>
                <p className="font-semibold tabular-nums">{row.value != null ? `${Math.round(row.value)}/100` : '—'}</p>
              </div>
              <Progress value={row.value ?? 0} className="mt-2 h-1.5" />
            </div>
          ))}
        </div>
      )}

      {cert && (
        <div className="card-premium p-6 md:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {cert.qrCodeUrl && (
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl border bg-white p-2">
                <img src={cert.qrCodeUrl} alt="Certificate QR code" className="h-full w-full object-contain" />
              </div>
            )}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="flex items-center justify-center gap-2 font-display text-lg font-bold sm:justify-start">
                <BadgeCheck className="h-5 w-5 text-primary" /> Verification certificate
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{cert.workerName}</span> · {cert.profession}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Certificate No: {cert.certificateNo}</p>
              <p className="text-xs text-muted-foreground">
                Issued: {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '—'}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Scan the QR code or share the certificate number to let customers verify your badge instantly.
              </p>
              {cert.pdfUrl && (
                <Button asChild variant="outline" className="mt-4 gap-2 rounded-xl">
                  <a href={cert.pdfUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" /> Download PDF
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="card-premium p-6 md:p-8">
          <h3 className="font-display text-lg font-bold">Suggested next steps</h3>
          <div className="mt-4 space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.title} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{rec.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button className="btn-glow w-full gap-2 rounded-xl" onClick={onDashboard} disabled={navigating}>
        {navigating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Go to my dashboard
      </Button>
    </div>
  );
}
