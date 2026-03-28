import { api } from "@/lib/api";
import type { LoginResponse, User, LoginFormData } from "@/types/auth";

export interface LoginResult {
  token: string;
  refreshToken?: string;
  user?: User;
  requires2FA: boolean;
  userId?: string;
  twoFAType?: "email" | "totp";
  message?: string;
}

function toUser(raw: LoginResponse["user"]): User | undefined {
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

export async function login(credentials: LoginFormData): Promise<LoginResult> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email_or_username: credentials.email_or_username,
    password: credentials.password,
    remember_me: credentials.remember_me ?? false,
  });
  const token = data.token ?? data.access_token;
  const pending2FA =
    data.user_id != null &&
    (data.requires_2fa === true || data.two_fa_type === "email" || data.two_fa_type === "totp");
  return {
    token: token ?? "",
    refreshToken: data.refresh_token,
    user: toUser(data.user),
    requires2FA: pending2FA,
    userId: data.user_id != null ? String(data.user_id) : undefined,
    twoFAType: data.two_fa_type,
    message: data.message,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refresh_token: refreshToken });
}
