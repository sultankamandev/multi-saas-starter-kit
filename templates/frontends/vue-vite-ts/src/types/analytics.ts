export interface UserAnalyticsData {
  date: string;
  registrations: number;
  verified: number;
}

export interface SummaryData {
  total_users: number;
  verified_users: number;
  new_users_7_days: number;
  verified_percent: number;
}

export interface ActiveUserStats {
  daily: { date: string; active_users: number }[];
  active_24h: number;
  active_7d: number;
}

export interface RetentionRow {
  signup_date: string;
  new_users: number;
  retained_7d: number;
  retained_30d: number;
  retention_7_rate: number;
  retention_30_rate: number;
}

export interface RetentionResponse {
  retention_data: RetentionRow[];
  average_7d: number;
  average_30d: number;
}

export interface CohortRow {
  signup_date: string;
  new_users: number;
  day_1: number;
  day_3: number;
  day_7: number;
  day_14: number;
  day_30: number;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
  country?: string;
  language?: string;
}
