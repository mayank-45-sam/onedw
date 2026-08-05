import axios from 'axios';
import { API_BASE_URL } from '@/constants/api';
import { STORAGE_KEYS } from '@/constants/storage';

export interface UploadResult {
  url: string;
  publicId?: string;
  mimeType: string;
  size: number;
}

export type UploadFolder =
  | 'profile'
  | 'problem'
  | 'portfolio'
  | 'certificate'
  | 'service'
  | 'category'
  | 'general';

function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}

export const uploadService = {
  upload(
    file: File,
    folder: UploadFolder = 'profile',
    onProgress?: (percent: number) => void,
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const token = localStorage.getItem(STORAGE_KEYS.token);

    return axios
      .post<{ success: boolean; message: string; data: UploadResult }>(
        `${API_BASE_URL}/api/v1/uploads`,
        formData,
        {
          timeout: 60000,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          onUploadProgress: (event) => {
            if (onProgress && event.total) {
              onProgress(Math.round((event.loaded * 100) / event.total));
            }
          },
        },
      )
      .then((r) => {
        const data = r.data.data;
        return { ...data, url: toAbsoluteUrl(data.url) };
      });
  },
  uploadMany(files: File[], folder: UploadFolder, onProgress?: (percent: number) => void) {
    return Promise.all(files.map((f) => uploadService.upload(f, folder, onProgress)));
  },
};
