<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          {{ t("forgotPassword.title") }}
        </h1>
        <p class="mt-2 text-sm text-gray-600">
          {{ t("forgotPassword.description") }}
        </p>
      </div>

      <div
        v-if="submitted"
        class="rounded-lg border border-green-200 bg-green-50 p-6 text-center"
      >
        <p class="text-sm text-green-700">
          {{ t("forgotPassword.success") }}
        </p>
        <router-link
          to="/login"
          class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          {{ t("forgotPassword.backToLogin") }}
        </router-link>
      </div>

      <form v-else @submit.prevent="onSubmit" class="space-y-6">
        <v-text-field
          v-model="form.email"
          type="email"
          :label="t('forgotPassword.email')"
          :error-messages="errors.email"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
        />
        <v-btn type="submit" color="primary" block :loading="submitting" size="large">
          {{ submitting ? t("forgotPassword.submitting") : t("forgotPassword.submit") }}
        </v-btn>
        <div class="text-center">
          <router-link to="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            {{ t("forgotPassword.backToLogin") }}
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { api } from "@/lib/api";

const { t } = useI18n();
const submitting = ref(false);
const submitted = ref(false);

const form = reactive({ email: "" });
const errors = reactive<Record<string, string>>({});

function validate(): boolean {
  errors.email = "";
  if (!form.email) errors.email = t("forgotPassword.validation.emailRequired");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = t("forgotPassword.validation.emailInvalid");
  return !errors.email;
}

async function onSubmit() {
  if (!validate()) return;
  submitting.value = true;
  try {
    await api.post("/auth/forgot-password", { email: form.email });
  } finally {
    submitting.value = false;
    submitted.value = true;
  }
}
</script>
