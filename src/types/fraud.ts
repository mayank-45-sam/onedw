export interface FraudScoreBreakdown {
  fake_reviews_score: number;
  cancellation_score: number;
  price_change_score: number;
  complaint_score: number;
  suspicious_login_score: number;
  duplicate_phone_score: number;
  duplicate_device_score: number;
  fake_profile_score: number;
}

export interface SuspiciousActivity {
  id: string;
  worker_id: string;
  activity_type: string;
  description?: string;
  severity: string;
  metadata_json?: Record<string, unknown>;
  detected_at: string;
  created_at?: string;
}

export interface FraudReportData {
  id: string;
  worker_id: string;
  fraud_score: number;
  risk_level: string;
  reason?: string;
  confidence?: number;
  recommendation?: string;
  analysis_details?: Record<string, unknown>;
  triggered_by?: string;
  analyzed_at: string;
  created_at?: string;
}

export interface FraudAnalysisResult {
  worker_id: string;
  worker_name: string;
  fraud_score: number;
  risk_level: string;
  reason?: string;
  confidence?: number;
  recommendation?: string;
  score_breakdown?: FraudScoreBreakdown;
  suspicious_activities: SuspiciousActivity[];
  report?: FraudReportData;
  is_disabled: boolean;
}

export interface WorkerFraudSummary {
  worker_id: string;
  worker_name: string;
  worker_avatar?: string;
  worker_profession?: string;
  fraud_score: number;
  risk_level: string;
  is_disabled: boolean;
  complaint_count: number;
  suspicious_activity_count: number;
  last_analysis?: string;
  recommendation?: string;
}

export interface HighRiskWorkerResponse {
  workers: WorkerFraudSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicFraudStatus {
  worker_id: string;
  fraud_score: number;
  risk_level: string;
  is_disabled: boolean;
  recommendation?: string;
}
