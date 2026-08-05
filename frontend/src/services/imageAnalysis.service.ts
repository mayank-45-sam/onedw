import { API_BASE_URL, API_PREFIX, API_ENDPOINTS } from '@/constants/api';
import { STORAGE_KEYS } from '@/constants/storage';
import type { ImageAnalysisResult, AnalysisHistoryResponse } from '@/types/imageAnalysis';

export const imageAnalysisService = {
  async analyze(file: File): Promise<ImageAnalysisResult> {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(
      `${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.imageAnalysis.analyze}`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );

    if (!res.ok) {
      let detail = 'Analysis failed. Please try again.';
      try {
        const err = await res.json();
        if (err && typeof err.detail === 'string') detail = err.detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }

    const body = await res.json();
    return body.data;
  },

  async history(page = 1, limit = 20): Promise<AnalysisHistoryResponse> {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const res = await fetch(
      `${API_BASE_URL}${API_PREFIX}${API_ENDPOINTS.imageAnalysis.history}?page=${page}&limit=${limit}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error('Failed to load history');
    const body = await res.json();
    return body;
  },
};
