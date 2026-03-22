<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          {{ t("verify2FA.title") }}
        </h1>
        <p class="mt-2 text-sm text-gray-600">
          {{ twoFAType === "totp" ? t("verify2FA.totpDescription") : t("verify2FA.emailDescription") }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="flex justify-center gap-2" @paste="handlePaste">
          <input
            v-for="(_, i) in CODE_LENGTH"
            :key="i"
            :ref="(el) => setInputRef(el as HTMLInputElement, i)"
            :value="digits[i]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="h-14 w-12 rounded-lg border border-gray-300 text-center text-2xl font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            @input="(e) => setDigit(i, (e.target as HTMLInputElement).value)"
            @keydown="(e) => handleKeyDown(i, e)"
          />
        </div>

        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :disabled="loading || code.length !== 6"
          :loading="loading"
        >
          {{ t("verify2FA.submit") }}
        </v-btn>
      </form>

      <div class="flex flex-col items-center gap-3 text-sm">
        <v-btn
          v-if="twoFAType === 'email'"
          variant="text"
          color="primary"
          :disabled="resending"
          @click="handleResend"
        >
          {{ resending ? t("verify2FA.resending") : t("verify2FA.resendCode") }}
        </v-btn>
        <router-link
          :to="`/recovery-login?user_id=${userId}&remember_me=${rememberMe}`"
          class="font-medium text-indigo-600 hover:text-indigo-500"
        >
          {{ t("verify2FA.useRecoveryCode") }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { Verify2FAResponse } from "@/types/auth";

const CODE_LENGTH = 6;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const userId = computed(() => (route.query.user_id as string) ?? "");
const rememberMe = computed(() => route.query.remember_me === "true");
const twoFAType = computed(() => (route.query.two_fa_type as string) ?? "email") as "email" | "totp";

const digits = ref<string[]>(Array(CODE_LENGTH).fill(""));
const inputRefs = ref<(HTMLInputElement | null)[]>(Array(CODE_LENGTH).fill(null));

function setInputRef(el: HTMLInputElement | null, i: number) {
  if (el) inputRefs.value[i] = el;
}
const loading = ref(false);
const resending = ref(false);

const code = computed(() => digits.value.join(""));

function setDigit(index: number, value: string) {
  if (!/^\d?$/.test(value)) return;
  const next = [...digits.value];
  next[index] = value;
  digits.value = next;
  if (value && index < CODE_LENGTH - 1) {
    nextTick(() => inputRefs.value[index + 1]?.focus());
  }
}

function handleKeyDown(index: number, e: KeyboardEvent) {
  if (e.key === "Backspace" && !digits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus();
  }
}

function handlePaste(e: ClipboardEvent) {
  e.preventDefault();
  const pasted = (e.clipboardData?.getData("text") ?? "").replace(/\D/g, "").slice(0, CODE_LENGTH);
  if (!pasted) return;
  const next = [...digits.value];
  pasted.split("").forEach((ch, i) => { next[i] = ch; });
  digits.value = next;
  nextTick(() => inputRefs.value[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus());
}

async function handleSubmit() {
  if (code.value.length !== CODE_LENGTH) return;
  loading.value = true;
  try {
    const endpoint = twoFAType.value === "totp" ? "/auth/verify-totp-login" : "/auth/verify-2fa";
    const body =
      twoFAType.value === "totp"
        ? { user_id: userId.value, code: code.value, remember_me: rememberMe.value }
        : { user_id: userId.value, code: code.value };

    const { data } = await api.post<Verify2FAResponse>(endpoint, body);
    const token = data.token ?? data.access_token ?? "";
    auth.completeLogin(token, data.user, data.refresh_token, rememberMe.value);
    router.push("/dashboard");
  } catch {
    // show error
  } finally {
    loading.value = false;
  }
}

async function handleResend() {
  resending.value = true;
  try {
    await api.post("/auth/resend-2fa", { user_id: userId.value });
  } finally {
    resending.value = false;
  }
}
</script>
