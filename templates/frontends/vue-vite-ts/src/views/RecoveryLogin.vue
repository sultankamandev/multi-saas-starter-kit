<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          {{ t("recoveryLogin.title") }}
        </h1>
        <p class="mt-2 text-sm text-gray-600">
          {{ t("recoveryLogin.description") }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <v-text-field
          v-model="code"
          :label="t('recoveryLogin.codeLabel')"
          :placeholder="t('recoveryLogin.codePlaceholder')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :disabled="loading || !code.trim()"
          :loading="loading"
        >
          {{ t("recoveryLogin.submit") }}
        </v-btn>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { RecoveryLoginResponse } from "@/types/auth";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const userId = computed(() => (route.query.user_id as string) ?? "");
const rememberMe = computed(() => route.query.remember_me === "true");

const code = ref("");
const loading = ref(false);

async function handleSubmit() {
  if (!code.value.trim()) return;
  loading.value = true;
  try {
    const { data } = await api.post<RecoveryLoginResponse>("/auth/verify-recovery-code", {
      user_id: userId.value,
      code: code.value.trim(),
      remember_me: rememberMe.value,
    });
    const token = data.token ?? data.access_token ?? "";
    auth.completeLogin(token, data.user, data.refresh_token, rememberMe.value);
    router.push("/dashboard");
  } catch {
    // show error
  } finally {
    loading.value = false;
  }
}
</script>
