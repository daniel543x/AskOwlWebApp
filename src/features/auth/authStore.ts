import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { apiFetch } from "../../shared/api/http";
import {
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  setStoredTokens,
} from "../../shared/api/tokens";
import type {
  LoginRequest,
  LogoutRequest,
  TokenData,
  UserCreate,
  UserRead,
} from "../../entities/user";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(getStoredToken());
  const user = ref<UserRead | null>(null);

  const isAuthenticated = computed(() => token.value !== null);

  let userPromise: Promise<void> | null = null;

  async function login(usernameOrEmail: string, password: string): Promise<void> {
    const body: LoginRequest = { username_or_email: usernameOrEmail, password };
    const data = await apiFetch<TokenData>("/auth/login", {
      method: "POST",
      body,
      skipUnauthorizedRedirect: true,
    });
    setStoredTokens(data.access_token, data.refresh_token);
    token.value = data.access_token;
    await fetchMe();
  }

  async function register(payload: UserCreate): Promise<void> {
    await apiFetch<UserRead>("/user/", {
      method: "POST",
      body: payload,
      skipUnauthorizedRedirect: true,
    });
    await login(payload.email, payload.password);
  }

  async function fetchMe(): Promise<void> {
    user.value = await apiFetch<UserRead>("/auth/users/me");
  }

  function ensureUser(): Promise<void> {
    if (token.value === null) {
      return Promise.resolve();
    }
    if (user.value === null && userPromise === null) {
      userPromise = fetchMe().catch((error: unknown) => {
        userPromise = null;
        throw error;
      });
    }
    return userPromise ?? Promise.resolve();
  }

  function clearSession(): void {
    token.value = null;
    user.value = null;
    userPromise = null;
    clearStoredTokens();
  }

  async function logout(): Promise<void> {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken !== null) {
      const body: LogoutRequest = { refresh_token: refreshToken };
      try {
        await apiFetch<void>("/auth/logout", {
          method: "POST",
          body,
          skipUnauthorizedRedirect: true,
        });
      } catch {
        // the route is idempotent server-side — clear locally regardless
      }
    }
    clearSession();
  }

  return { token, user, isAuthenticated, login, register, fetchMe, ensureUser, clearSession, logout };
});
