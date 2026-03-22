import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenCookie, refreshTokenCookie, getCookie } from "@/lib/cookies";
import type { AxiosErrorResponseData } from "@/types/api";
import { isValidLocale } from "@/i18n/config";

const API_URL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let unauthorizedHandler: (() => void) | null = null;
export function setGlobalUnauthorizedHandler(fn: (() => void) | null) { unauthorizedHandler = fn; }
export function getGlobalUnauthorizedHandler() { return unauthorizedHandler; }

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenCookie.get();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  const locale = getCookie("i18next");
  const language = locale && isValidLocale(locale) ? locale : "en";
  if (config.headers) config.headers["Accept-Language"] = language;
  return config;
});

let refreshPromise: Promise<string> | null = null;

function isRefreshOrLogout(config: InternalAxiosRequestConfig) {
  const url = config.url ?? "";
  return url.includes("/auth/refresh-token") || url.includes("/auth/logout");
}

function triggerUnauthorized() {
  if (unauthorizedHandler) {
    unauthorizedHandler();
  } else if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/register")) {
    window.location.href = "/login";
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<AxiosErrorResponseData>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshOrLogout(original)) return Promise.reject(error);
      original._retry = true;
      const rt = refreshTokenCookie.get();
      if (!rt) { tokenCookie.remove(); triggerUnauthorized(); return Promise.reject(error); }
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const r = await axios.post<{ access_token: string; refresh_token?: string }>(
              `${API_URL}/auth/refresh-token`, { refresh_token: rt }, { headers: { "Content-Type": "application/json" } }
            );
            tokenCookie.set(r.data.access_token, 7);
            if (r.data.refresh_token) refreshTokenCookie.set(r.data.refresh_token, 7);
            return r.data.access_token;
          } catch (e) { refreshPromise = null; tokenCookie.remove(); refreshTokenCookie.remove(); triggerUnauthorized(); return Promise.reject(e); }
        })();
      }
      try {
        const t = await refreshPromise;
        refreshPromise = null;
        if (original.headers) original.headers.Authorization = `Bearer ${t}`;
        return api(original);
      } catch (e) { return Promise.reject(e); }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const d = (error as AxiosError<AxiosErrorResponseData>).response?.data;
    return d?.message || d?.error || error.message || "An unexpected error occurred";
  }
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

export function getErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const d = (error as AxiosError<AxiosErrorResponseData>).response?.data;
    return d?.error_code || d?.code || null;
  }
  return null;
}
