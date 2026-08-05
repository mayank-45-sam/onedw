export interface ApiErrorShape {
  success: false;
  message: string;
  errors?: Record<string, string>[];
  code?: string;
  status?: number;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string>[];

  constructor(message: string, status: number, code?: string, fieldErrors?: Record<string, string>[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
