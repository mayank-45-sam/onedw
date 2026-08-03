export interface RecommendedWorker {
  worker_id: string;
  name: string;
  avatar: string;
  profession: string;
  rating: number;
  experience_years: number;
  completed_jobs: number;
  hourly_rate: number;
  trust_score: number;
  risk_level: string;
  estimated_arrival: string;
}

export interface ImageAnalysisResult {
  id?: string;
  detected_object: string;
  problem: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  repair_difficulty: 'easy' | 'medium' | 'hard';
  estimated_time_minutes: number;
  estimated_price_min: number;
  estimated_price_max: number;
  required_profession: string;
  ai_suggestions: string[];
  recommended_workers: RecommendedWorker[];
  error?: string;
}

export interface AnalysisHistoryItem {
  id: string;
  image_url: string;
  detected_object: string;
  problem: string;
  confidence: number;
  severity: string;
  estimated_price_min: number;
  estimated_price_max: number;
  required_profession: string;
  created_at: string;
}

export interface AnalysisHistoryResponse {
  data: AnalysisHistoryItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
