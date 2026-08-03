export type VerificationBadge = 'gold' | 'pro' | 'beginner' | 'rejected';
export type VerificationStep = 'documents' | 'skill_test' | 'practical' | 'interview' | 'completed';
export type VerificationStatus = 'in_progress' | 'completed' | 'failed';
export type AdminStatus = 'pending' | 'approved' | 'rejected';
export type SkillTestQuestionType = 'mcq' | 'image' | 'scenario' | 'short_answer';

export interface SkillTestQuestion {
  _id: string;
  type: SkillTestQuestionType;
  question: string;
  options: string[];
  difficulty: string;
  timeLimit: number;
  imageUrl: string | null;
}

export interface DocumentMedia {
  certificateImages: string[];
  workPhotos: string[];
  workVideos: string[];
}

export interface TimePerQuestion {
  questionId: string;
  timeTaken?: number;
}

export interface SkillTestAnalytics {
  tabSwitchCount: number;
  warningsIssued: number;
  skippedCount: number;
  timePerQuestion: TimePerQuestion[];
  suspiciousFastAnswers: TimePerQuestion[];
  correctCount: number;
  totalQuestions: number;
  failed: boolean;
}

export interface SkillTestStage {
  _id: string;
  status: string | null;
  score: number | null;
  questions: Record<string, unknown>[];
  answers: Record<string, unknown>[];
  tabSwitchCount: number;
  warningsIssued: number;
  timePerQuestion: TimePerQuestion[];
  skippedCount: number;
  suspiciousFastAnswers: TimePerQuestion[];
  failed: boolean;
  submittedAt: string | null;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

export interface PracticalStage {
  _id: string;
  mediaUrls: MediaItem[];
  evaluation: Record<string, unknown>;
  score: number | null;
  submittedAt: string | null;
}

export interface InterviewExchange {
  aiQuestion: string;
  workerAnswer: string | null;
  mode: string | null;
}

export interface InterviewStage {
  _id: string;
  exchanges: InterviewExchange[];
  evaluation: Record<string, unknown>;
  score: number | null;
  status: string | null;
  submittedAt: string | null;
}

export interface VerificationCertificate {
  _id?: string;
  certificateNo: string;
  workerName: string;
  profession: string;
  trustScore: number;
  badge: VerificationBadge;
  issuedAt: string;
  qrCodeUrl: string | null;
  pdfUrl: string | null;
  isActive: boolean;
}

export interface Verification {
  _id: string;
  workerId: string;
  workerName: string | null;
  avatar: string | null;
  email: string | null;
  profession: string;
  attemptNumber: number;
  status: VerificationStatus;
  step: VerificationStep;
  technicalScore: number | null;
  practicalScore: number | null;
  interviewScore: number | null;
  documentsScore: number | null;
  experienceScore: number | null;
  trustScore: number | null;
  badge: VerificationBadge | null;
  adminStatus: AdminStatus;
  adminNotes: string | null;
  documentMedia: DocumentMedia | null;
  skillTestAntiCheat: SkillTestAnalytics | null;
  trainingRecommendations: { title: string; description: string }[] | null;
  startedAt: string | null;
  submittedAt: string | null;
  retryAvailableAt: string | null;
  createdAt: string | null;
  isDemo: boolean;
  skillTest?: SkillTestStage | null;
  practical?: PracticalStage | null;
  interview?: InterviewStage | null;
  certificate?: VerificationCertificate | null;
}

export interface VerificationStatusResult {
  worker: {
    name: string;
    profession: string;
    experienceYears: number;
    aadhaarVerified: boolean;
    certificatesCount: number;
    portfolioCount: number;
  };
  hasActive: boolean;
  active: Verification | null;
  latest: Verification | null;
  retryAvailableAt: string | null;
}

// ── Request payloads (sent snake_case to match the backend schemas) ──

export interface DocumentsSubmitPayload {
  profession?: string;
  experience_years?: number;
  aadhaar_number?: string;
  certificate_images?: string[];
  work_photos?: string[];
  work_videos?: string[];
}

export interface SkillTestAnswerItem {
  question_id: string;
  selected_option?: number | null;
  answer?: string | null;
  skipped?: boolean;
}

export interface AntiCheatTimeItem {
  question_id: string;
  time_taken?: number;
}

export interface AntiCheatPayload {
  tab_switch_count: number;
  warnings_issued: number;
  skipped_count: number;
  time_per_question: AntiCheatTimeItem[];
  suspicious_fast_answers: AntiCheatTimeItem[];
}

export interface SkillTestSubmitPayload {
  answers: SkillTestAnswerItem[];
  anti_cheat: AntiCheatPayload;
}

// ── Response shapes ──

export interface SkillTestGenerateResult {
  sessionId: string;
  profession: string;
  questions: SkillTestQuestion[];
  tabSwitchCount: number;
  status: string;
}

export interface SkillTestSubmitResult {
  score: number;
  correctCount: number;
  total: number;
  analytics: SkillTestAnalytics;
  nextStep: string;
  failed?: boolean;
  reason?: string;
}

export interface PracticalSubmitResult {
  score: number;
  evaluation: Record<string, unknown>;
  nextStep: string;
}

export interface InterviewStartResult {
  interviewId: string;
  exchanges: InterviewExchange[];
  done: boolean;
  currentQuestion: string;
}

export interface InterviewRespondResult {
  done: boolean;
  currentQuestion?: string;
  exchanges: InterviewExchange[];
  interviewScore?: number;
  evaluation?: Record<string, unknown>;
}

export interface TrainingRecommendation {
  title: string;
  description: string;
}

export interface CompleteVerificationResult {
  verificationId: string;
  status: VerificationStatus;
  badge: VerificationBadge;
  trustScore: number;
  technicalScore: number;
  practicalScore: number;
  interviewScore: number;
  documentsScore: number;
  experienceScore: number;
  trainingRecommendations: TrainingRecommendation[];
  retryAvailableAt: string | null;
  certificate: VerificationCertificate | null;
  worker: {
    verificationStatus: string;
    trustScore: number;
    verificationBadge: string;
    isVerified: boolean;
  };
}

export type MyCertificateResult = VerificationCertificate;

export interface VerificationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  inProgress: number;
  badgeCounts: Record<VerificationBadge, number>;
}

export interface WorkerVerificationBrief {
  status: VerificationStatus;
  adminStatus: AdminStatus;
  badge: VerificationBadge | null;
  trustScore: number | null;
  step: VerificationStep | null;
  submittedAt: string | null;
  isDemo: boolean;
}
