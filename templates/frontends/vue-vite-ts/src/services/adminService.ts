import { api } from "@/lib/api";
import type {
  UserAnalyticsData,
  SummaryData,
  ActiveUserStats,
  RetentionResponse,
  DateRangeParams,
} from "@/types/analytics";

const ADMIN = {
  registrations: "/api/admin/analytics/user-registrations",
  summary: "/api/admin/summary",
  activeUsers: "/api/admin/analytics/active-users",
  retention: "/api/admin/analytics/retention",
  cohort: "/api/admin/analytics/cohort",
  users: "/api/admin/users",
  actions: "/api/admin/actions",
  blockedIPs: "/api/admin/blocked-ips",
  settings: "/api/admin/settings",
} as const;

export async function getAnalyticsRegistrations(params: DateRangeParams): Promise<UserAnalyticsData[]> {
  const { data } = await api.get<UserAnalyticsData[] | { data: UserAnalyticsData[] }>(ADMIN.registrations, {
    params,
  });
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function getAnalyticsSummary(): Promise<SummaryData> {
  const { data } = await api.get<SummaryData>(ADMIN.summary);
  return data;
}

export async function getAnalyticsActiveUsers(params: DateRangeParams): Promise<ActiveUserStats> {
  const { data } = await api.get<ActiveUserStats>(ADMIN.activeUsers, { params });
  return data;
}

export async function getAnalyticsRetention(params: DateRangeParams): Promise<RetentionResponse> {
  const { data } = await api.get<RetentionResponse>(ADMIN.retention, { params });
  return data;
}

export async function getAnalyticsCohort(params: DateRangeParams): Promise<unknown[]> {
  const { data } = await api.get<unknown[] | { data: unknown[] }>(ADMIN.cohort, { params });
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function getUsers(params: { page?: number; limit?: number; sort_field?: string; sort_order?: string; search?: string }) {
  const { data } = await api.get<{ data: unknown[]; total: number }>(ADMIN.users, { params });
  return data;
}

export async function getUser(id: string) {
  const { data } = await api.get<{ user?: unknown } | unknown>(`${ADMIN.users}/${id}`);
  return (data as { user?: unknown }).user ?? data;
}

export async function createUser(payload: unknown) {
  const { data } = await api.post<{ user?: unknown } | unknown>(ADMIN.users, payload);
  return (data as { user?: unknown }).user ?? data;
}

export async function updateUser(id: string, payload: unknown) {
  const { data } = await api.put<{ user?: unknown } | unknown>(`${ADMIN.users}/${id}`, payload);
  return (data as { user?: unknown }).user ?? data;
}

export async function deleteUser(id: string) {
  await api.delete(`${ADMIN.users}/${id}`);
}

export async function getActions(params: { page?: number; limit?: number }) {
  const { data } = await api.get<{ data: unknown[]; total: number }>(ADMIN.actions, { params });
  return data;
}

export async function getBlockedIPs() {
  const { data } = await api.get<unknown[]>(ADMIN.blockedIPs);
  return Array.isArray(data) ? data : [];
}

export async function unblockIP(ip: string) {
  await api.delete(`${ADMIN.blockedIPs}/${encodeURIComponent(ip)}`);
}

export async function getSettings() {
  const { data } = await api.get<unknown[]>(ADMIN.settings);
  return Array.isArray(data) ? data : [];
}

export async function getSetting(key: string) {
  const { data } = await api.get(`${ADMIN.settings}/${key}`);
  return data;
}

export async function updateSetting(key: string, value: string) {
  const { data } = await api.put(`${ADMIN.settings}/${key}`, { value });
  return data;
}
