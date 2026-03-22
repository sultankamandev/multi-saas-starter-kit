<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
    <div class="w-full max-w-md space-y-6 text-center">
      <h1 class="text-3xl font-bold tracking-tight text-gray-900">
        {{ t("verifyEmail.title") }}
      </h1>

      <div v-if="state === 'loading'" class="space-y-4">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="text-sm text-gray-600">
          {{ t("verifyEmail.verifying") }}
        </p>
      </div>

      <div v-if="state === 'success'" class="space-y-4">
        <div class="rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 class="text-lg font-semibold text-green-800">
            {{ t("verifyEmail.successTitle") }}
          </h2>
          <p class="mt-2 text-sm text-green-700">
            {{ t("verifyEmail.successMessage") }}
          </p>
        </div>
        <router-link to="/login" class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
          {{ t("verifyEmail.goToLogin") }}
        </router-link>
      </div>

      <div v-if="state === 'error'" class="space-y-4">
        <div class="rounded-lg border border-red-200 bg-red-50 p-6">
          <p class="text-sm text-red-700">
            {{ errorMessage }}
          </p>
        </div>
        <div class="flex flex-col items-center gap-3">
          <router-link to="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            {{ t("verifyEmail.goToLogin") }}
          </router-link>
          <router-link to="/register" class="text-sm font-medium text-gray-600 hover:text-gray-500">
            {{ t("verifyEmail.registerAgain") }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, getErrorMessage } from "@/lib/api";

const { t } = useI18n();
const route = useRoute();
const token = (route.query.token as string) ?? "";
const state = ref<"loading" | "success" | "error">("loading");
const errorMessage = ref("");

onMounted(async () => {
  if (!token) {
    state.value = "error";
    errorMessage.value = t("verifyEmail.invalidToken");
    return;
  }
  try {
    await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    state.value = "success";
  } catch (error) {
    state.value = "error";
    errorMessage.value = getErrorMessage(error) || t("verifyEmail.failed");
  }
});
</script>
