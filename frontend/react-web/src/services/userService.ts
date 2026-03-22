import { api } from "@/lib/api";
import type { ProfileResponse, ProfileUpdatePayload, ProfileUserData } from "@/types/auth";

export function mapProfileToFormData(u: ProfileUserData): ProfileUpdatePayload & { two_fa_enabled: boolean } {
  return {
    username: u.username ?? "",
    first_name: u.first_name ?? "",
    last_name: u.last_name ?? "",
    language: u.language ?? "en",
    country: u.country ?? "",
    address: u.address ?? "",
    phone: u.phone ?? "",
    two_fa_enabled: u.two_fa_enabled ?? false,
  };
}

export async function getProfile(): Promise<ProfileUserData> {
  const { data } = await api.get<ProfileResponse>("/api/user/profile");
  return data.user;
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUserData> {
  await api.put("/api/user/profile", payload);
  return getProfile();
}
