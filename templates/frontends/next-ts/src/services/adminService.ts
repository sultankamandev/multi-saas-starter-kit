/**
 * Admin API service — centralizes admin/analytics endpoints
 */
import { api } from '@/lib/api';
import type {
  UserAnalyticsData,
  SummaryData,
  ActiveUserStats,
  RetentionResponse,
  DateRangeParams,
} from '@/types/analytics';

const ADMIN = {
  analytics: {
    users: '/api/admin/analytics/user-registrations',
    summary: '/api/admin/summary',
    activeUsers: '/api/admin/analytics/active-users',
    retention: '/api/admin/analytics/retention',
  },
} as const;

export async function getAnalyticsUsers(params: DateRangeParams): Promise<UserAnalyticsData[]> {
  const response = await api.get<UserAnalyticsData[]>(ADMIN.analytics.users, { params });
  return response.data;
}

export async function getAnalyticsSummary(): Promise<SummaryData> {
  const response = await api.get<SummaryData>(ADMIN.analytics.summary);
  return response.data;
}

export async function getAnalyticsActiveUsers(params: DateRangeParams): Promise<ActiveUserStats> {
  const response = await api.get<ActiveUserStats>(ADMIN.analytics.activeUsers, { params });
  return response.data;
}

export async function getAnalyticsRetention(params: DateRangeParams): Promise<RetentionResponse> {
  const response = await api.get<RetentionResponse>(ADMIN.analytics.retention, { params });
  return response.data;
}
