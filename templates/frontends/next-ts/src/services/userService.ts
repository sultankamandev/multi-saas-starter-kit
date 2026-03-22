/**
 * User/profile API service — centralizes user endpoints and response mapping
 */
import { api } from '@/lib/api';
import type { ProfileResponse, ProfileUpdatePayload, ProfileUserData } from '@/types/auth';

const USER = {
  profile: '/api/user/profile',
} as const;

/**
 * Map API profile user (snake_case, optional legacy fields) to form-friendly shape
 */
export function mapProfileToFormData(userData: ProfileUserData): Omit<ProfileUpdatePayload, 'two_fa_enabled'> & { two_fa_enabled: boolean } {
  return {
    username: userData.username ?? '',
    first_name: userData.first_name ?? '',
    last_name: userData.last_name ?? '',
    language: userData.language ?? 'en',
    country: userData.country ?? '',
    address: userData.address ?? '',
    phone: userData.phone ?? '',
    two_fa_enabled: userData.two_fa_enabled ?? false,
  };
}

/**
 * Fetch current user profile
 */
export async function getProfile(): Promise<ProfileUserData> {
  const response = await api.get<ProfileResponse>(USER.profile);
  return response.data.user;
}

/**
 * Update user profile
 */
export async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUserData> {
  await api.put(USER.profile, payload);
  return getProfile();
}
