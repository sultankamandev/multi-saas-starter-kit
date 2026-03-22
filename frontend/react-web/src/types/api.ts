export interface AxiosErrorResponseData {
  message?: string;
  error?: string;
  errors?: Record<string, string | string[]>;
  code?: string;
  error_code?: string;
}
