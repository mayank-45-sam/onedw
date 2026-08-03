import { api } from '@/lib/axios';
import { API_ENDPOINTS } from '@/constants/api';
import type { FraudAnalysisResult, HighRiskWorkerResponse } from '@/types/fraud';

export const fraudService = {
  analyze(workerId: string, triggerReason?: string) {
    return api
      .post<FraudAnalysisResult>(API_ENDPOINTS.fraud.analyze, {
        worker_id: workerId,
        trigger_reason: triggerReason,
      })
      .then((r) => r.data);
  },

  report(workerId: string) {
    return api
      .get<FraudAnalysisResult>(API_ENDPOINTS.fraud.report(workerId))
      .then((r) => r.data);
  },

  highRisk(params?: {
    min_score?: number;
    page?: number;
    limit?: number;
  }) {
    return api
      .get<HighRiskWorkerResponse>(API_ENDPOINTS.fraud.highRisk, { params })
      .then((r) => r.data);
  },
};
