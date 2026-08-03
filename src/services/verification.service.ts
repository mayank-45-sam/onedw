import { api } from '@/lib/axios';
import { API_BASE_URL, API_PREFIX, API_ENDPOINTS } from '@/constants/api';
import { STORAGE_KEYS } from '@/constants/storage';
import type {
  VerificationStatusResult,
  Verification,
  DocumentsSubmitPayload,
  SkillTestGenerateResult,
  SkillTestSubmitPayload,
  SkillTestSubmitResult,
  PracticalSubmitResult,
  MediaItem,
  InterviewStartResult,
  InterviewRespondResult,
  CompleteVerificationResult,
  MyCertificateResult,
} from '@/types/verification';

export interface DocumentsSubmitResult {
  verification: Verification;
  documentsScore: number;
  experienceScore: number;
  aadhaarVerified: boolean;
}

export const verificationService = {
  status() {
    return api.get<VerificationStatusResult>(API_ENDPOINTS.verification.status).then((r) => r.data);
  },
  start(profession?: string) {
    return api.post<Verification>(API_ENDPOINTS.verification.start, { profession }).then((r) => r.data);
  },
  submitDocuments(payload: DocumentsSubmitPayload) {
    return api.post<DocumentsSubmitResult>(API_ENDPOINTS.verification.documents, payload).then((r) => r.data);
  },
  generateSkillTest() {
    return api
      .post<SkillTestGenerateResult>(API_ENDPOINTS.verification.skillTestGenerate, undefined, { timeout: 120000 })
      .then((r) => r.data);
  },
  submitSkillTest(payload: SkillTestSubmitPayload) {
    return api.post<SkillTestSubmitResult>(API_ENDPOINTS.verification.skillTestSubmit, payload).then((r) => r.data);
  },
  submitPractical(mediaUrls: MediaItem[]) {
    return api.post<PracticalSubmitResult>(API_ENDPOINTS.verification.practicalSubmit, { media_urls: mediaUrls }).then((r) => r.data);
  },
  startInterview() {
    return api.post<InterviewStartResult>(API_ENDPOINTS.verification.interviewStart).then((r) => r.data);
  },
  respondInterview(answer: string, mode = 'text') {
    return api.post<InterviewRespondResult>(API_ENDPOINTS.verification.interviewRespond, { answer, mode }).then((r) => r.data);
  },
  async transcribeInterviewAudio(blob: Blob) {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const form = new FormData();
    form.append('file', blob, 'voice.webm');
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.verification.transcribe}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error(`Transcription failed with status ${res.status}`);
    const body = (await res.json()) as { data?: { text?: string } };
    return body?.data?.text ?? '';
  },
  complete() {
    return api.post<CompleteVerificationResult>(API_ENDPOINTS.verification.complete).then((r) => r.data);
  },
  myCertificate() {
    return api.get<MyCertificateResult>(API_ENDPOINTS.verification.certificate).then((r) => r.data);
  },
  verifyPublic(certificateNo: string) {
    return api.get<{ valid: boolean } & MyCertificateResult>(API_ENDPOINTS.verification.verify(certificateNo)).then((r) => r.data);
  },
};
