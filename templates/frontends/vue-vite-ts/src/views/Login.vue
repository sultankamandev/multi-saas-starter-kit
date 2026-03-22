<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          {{ t("login.title") }}
        </h1>
      </div>

      <form @submit.prevent="onSubmit" class="space-y-6">
        <div>
          <label for="email_or_username" class="block text-sm font-medium text-gray-700">
            {{ t("login.emailOrUsername") }}
          </label>
          <v-text-field
            id="email_or_username"
            v-model="form.email_or_username"
            type="text"
            autocomplete="username"
            :placeholder="t('login.emailOrUsernameHelper')"
            :error-messages="errors.email_or_username"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mt-1"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            {{ t("login.password") }}
          </label>
          <v-text-field
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            :error-messages="errors.password"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mt-1"
          />
        </div>

        <div class="flex items-center justify-between">
          <v-checkbox
            v-model="form.remember_me"
            :label="t('login.rememberMe')"
            hide-details
            density="compact"
          />
          <router-link to="/forgot-password" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            {{ t("login.forgotPassword") }}
          </router-link>
        </div>

        <v-btn
          type="submit"
          color="primary"
          block
          :loading="submitting"
          size="large"
        >
          {{ submitting ? t("login.submitting") : t("login.submit") }}
        </v-btn>
      </form>

      <p class="text-center text-sm text-gray-600">
        {{ t("login.noAccount") }}
        <router-link to="/register" class="font-medium text-indigo-600 hover:text-indigo-500">
          {{ t("login.registerLink") }}
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { getErrorMessage } from "@/lib/api";
import type { LoginFormData } from "@/types/auth";

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const submitting = ref(false);

const form = reactive<LoginFormData>({
  email_or_username: "",
  password: "",
  remember_me: false,
});

const errors = reactive<Record<string, string>>({});

async function onSubmit() {
  errors.email_or_username = "";
  errors.password = "";
  if (!form.email_or_username) errors.email_or_username = t("login.validation.emailRequired");
  if (!form.password) errors.password = t("login.validation.passwordRequired");
  if (errors.email_or_username || errors.password) return;

  submitting.value = true;
  try {
    const result = await auth.login(form);

    if (result.requires2FA) {
      const type = result.twoFAType || "totp";
      router.push(`/verify-2fa?user_id=${result.userId}&remember_me=${form.remember_me ?? false}&two_fa_type=${type}`);
      return;
    }

    router.push("/dashboard");
  } catch (error) {
    auth.setToken(null);
    const msg = getErrorMessage(error) || t("login.failed");
    errors.password = msg;
  } finally {
    submitting.value = false;
  }
}
</script>
