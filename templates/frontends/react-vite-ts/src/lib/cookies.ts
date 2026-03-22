import Cookies from "js-cookie";

const isProduction = import.meta.env.PROD;

export function getCookie(name: string): string | undefined {
  return Cookies.get(name);
}

export function setCookie(name: string, value: string, options?: { expires?: number; sameSite?: "strict" | "lax" | "none"; secure?: boolean }) {
  Cookies.set(name, value, {
    expires: options?.expires || 7,
    path: "/",
    sameSite: options?.sameSite || "strict",
    secure: options?.secure ?? isProduction,
  });
}

export function removeCookie(name: string) {
  Cookies.remove(name, { path: "/" });
}

export const tokenCookie = {
  get: () => getCookie("token"),
  set: (token: string, expiresInDays = 7) => setCookie("token", token, { expires: expiresInDays, sameSite: "strict", secure: isProduction }),
  remove: () => removeCookie("token"),
};

export const refreshTokenCookie = {
  get: () => getCookie("refresh_token"),
  set: (token: string, expiresInDays = 7) => setCookie("refresh_token", token, { expires: expiresInDays, sameSite: "strict", secure: isProduction }),
  remove: () => removeCookie("refresh_token"),
};
