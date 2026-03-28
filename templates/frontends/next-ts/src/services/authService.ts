/**
 * Auth API service — centralizes auth endpoints and response mapping
 */
import { api } from '@/lib/api';
import type { LoginResponse, User } from '@/types/auth';
import type { LoginFormData } from '@/types/auth';

const AUTH = {
  login: '/auth/login',
  logout: '/auth/logout',
  refreshToken: '/auth/refresh-token',
  me: '/auth/me',
} as const;

export interface LoginResult {
  token: string;
  refreshToken?: string;
  user?: User;
  requires2FA: boolean;
  userId?: string;
  twoFAType?: 'email' | 'totp';
  message?: string;
}

function toUser(raw: LoginResponse['user']): User | undefined {
  if (!raw) return undefined;
  return {
    id: String(raw.id),
    first_name: raw.first_name,
    last_name: raw.last_name,
    email: raw.email,
    role: raw.role,
    language: raw.language,
  };
}

/**
 * Login with email/username and password.
 * Returns tokens + user when 2FA is not required; otherwise returns 2FA redirect info.
 */
export async function login(credentials: LoginFormData): Promise<LoginResult> {
  const response = await api.post<LoginResponse>(AUTH.login, {
    email_or_username: credentials.email_or_username,
    password: credentials.password,
    remember_me: credentials.remember_me ?? false,
  });
  const data = response.data;
  const token = data.token ?? data.access_token;
  const needs2FA = data.requires_2fa ?? !!data.two_fa_type;

  return {
    token: token ?? '',
    refreshToken: data.refresh_token,
    user: toUser(data.user),
    requires2FA: !!needs2FA,
    userId: data.user_id != null ? String(data.user_id) : undefined,
    twoFAType: data.two_fa_type,
    message: data.message,
  };
}

/**
 * Logout — revoke refresh token on the server.
 */
export async function logout(refreshToken: string): Promise<void> {
  await api.post(AUTH.logout, { refresh_token: refreshToken });
}
