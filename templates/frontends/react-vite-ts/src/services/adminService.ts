import { api } from "@/lib/api";
import type { UserAnalyticsData, SummaryData, ActiveUserStats, RetentionResponse, DateRangeParams } from "@/types/analytics";

const ADMIN = {
  registrations: "/api/admin/analytics/user-registrations",
  summary: "/api/admin/summary",
  activeUsers: "/api/admin/analytics/active-users",
  retention: "/api/admin/analytics/retention",
  cohort: "/api/admin/analytics/cohort",
} as const;

export async function getAnalyticsRegistrations(params: DateRangeParams) {
  const { data } = await api.get<{ data: UserAnalyticsData[] }>(ADMIN.registrations, { params });
  return data.data;
}

export async function getAnalyticsSummary() {
  const { data } = await api.get<SummaryData>(ADMIN.summary);
  return data;
}

export async function getAnalyticsActiveUsers(params: DateRangeParams) {
  const { data } = await api.get<ActiveUserStats>(ADMIN.activeUsers, { params });
  return data;
}

export async function getAnalyticsRetention(params: DateRangeParams) {
  const { data } = await api.get<RetentionResponse>(ADMIN.retention, { params });
  return data;
}

export async function getAnalyticsCohort(params: DateRangeParams) {
  const { data } = await api.get<{ data: any[] }>(ADMIN.cohort, { params });
  return data.data;
}
