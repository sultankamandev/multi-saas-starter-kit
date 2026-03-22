/**
 * Authentication related types
 */

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  language?: string;
}

export interface UserResponseData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  language?: string;
}

export type UserResponse = UserResponseData | { user: UserResponseData };

export interface LoginResponse {
  token?: string;
  refresh_token?: string;
  access_token?: string;
  user_id?: string;
  requires_2fa?: boolean;
  two_fa_type?: 'email' | 'totp';
  message?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    language?: string;
  };
}

export interface RegisterResponse {
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userData?: User, refreshToken?: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export interface LoginFormData {
  email_or_username: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterFormData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  country?: string;
}

export interface Verify2FAResponse {
  token?: string;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    language?: string;
  };
}

export interface Verify2FAFormData {
  code: string;
}

export interface Verify2FASetupResponse {
  recovery_codes?: string[];
  message?: string;
}

export interface RecoveryLoginResponse {
  token: string;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    language?: string;
  };
}

export interface RecoveryLoginFormData {
  code: string;
}

export interface GoogleLoginResponse {
  token?: string;
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
  requires_2fa?: boolean;
  two_fa_type?: 'email' | 'totp';
  message?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    language?: string;
  };
}

export interface GoogleLoginRequest {
  token: string;
  remember_me?: boolean;
}

export interface ProfileResponse {
  user: ProfileUserData;
}

export interface ProfileUserData {
  username?: string;
  first_name?: string;
  last_name?: string;
  language?: string;
  country?: string;
  address?: string;
  phone?: string;
  two_fa_enabled?: boolean;
}

export interface ProfileUpdatePayload {
  username: string;
  first_name: string;
  last_name: string;
  language: string;
  country: string;
  address: string;
  phone: string;
  two_fa_enabled: boolean;
}
