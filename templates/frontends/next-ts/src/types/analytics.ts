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

export interface ActiveUserData {
  date: string;
  active_users: number;
}

export interface ActiveUserStats {
  daily: ActiveUserData[];
  active_24h: number;
  active_7d: number;
}

export interface RetentionData {
  signup_date: string;
  new_users: number;
  retained_7d: number;
  retained_30d: number;
  retention_7_rate: number;
  retention_30_rate: number;
}

export interface RetentionResponse {
  retention_data: RetentionData[];
  average_7d: number;
  average_30d: number;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}
