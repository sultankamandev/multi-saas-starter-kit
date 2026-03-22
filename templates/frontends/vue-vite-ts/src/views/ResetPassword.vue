<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
    <template v-if="!token">
      <div class="w-full max-w-md space-y-6 text-center">
        <div class="rounded-lg border border-red-200 bg-red-50 p-6">
          <p class="text-sm text-red-700">
            {{ t("resetPassword.invalidToken") }}
          </p>
        </div>
        <router-link to="/forgot-password" class="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
          {{ t("resetPassword.requestNewLink") }}
        </router-link>
      </div>
    </template>

    <div v-else class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          {{ t("resetPassword.title") }}
        </h1>
        <p class="mt-2 text-sm text-gray-600">
          {{ t("resetPassword.description") }}
        </p>
      </div>

      <form @submit.prevent="onSubmit" class="space-y-6">
        <v-text-field
          v-model="form.new_password"
          type="password"
          :label="t('resetPassword.newPassword')"
          :error-messages="errors.new_password"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
        />
        <v-text-field
          v-model="form.confirmPassword"
          type="password"
          :label="t('resetPassword.confirmPassword')"
          :error-messages="errors.confirmPassword"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
        />
        <v-btn type="submit" color="primary" block :loading="submitting" size="large">
          {{ submitting ? t("resetPassword.submitting") : t("resetPassword.submit") }}
        </v-btn>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, getErrorMessage } from "@/lib/api";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const token = computed(() => (route.query.token as string) ?? "");
const submitting = ref(false);

const form = reactive({ new_password: "", confirmPassword: "" });
const errors = reactive<Record<string, string>>({});

function validate(): boolean {
  errors.new_password = "";
  errors.confirmPassword = "";
  if (!form.new_password) errors.new_password = t("resetPassword.validation.passwordRequired");
  else if (form.new_password.length < 8) errors.new_password = t("resetPassword.validation.passwordMinLength");
  if (!form.confirmPassword) errors.confirmPassword = t("resetPassword.validation.confirmPasswordRequired");
  else if (form.new_password !== form.confirmPassword) errors.confirmPassword = t("resetPassword.validation.passwordsNotMatch");
  return !errors.new_password && !errors.confirmPassword;
}

async function onSubmit() {
  if (!token.value || !validate()) return;
  submitting.value = true;
  try {
    await api.post("/auth/reset-password", { token: token.value, new_password: form.new_password });
    router.push("/login");
  } catch (error) {
    errors.new_password = getErrorMessage(error) || t("resetPassword.failed");
  } finally {
    submitting.value = false;
  }
}
</script>
