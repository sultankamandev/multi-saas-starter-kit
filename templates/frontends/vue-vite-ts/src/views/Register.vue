<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          {{ t("register.title") }}
        </h1>
      </div>

      <form @submit.prevent="onSubmit" class="space-y-5">
        <v-text-field
          v-model="form.username"
          label="Username"
          :placeholder="t('register.usernamePlaceholder')"
          :error-messages="errors.username"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
        />
        <div class="grid grid-cols-2 gap-4">
          <v-text-field
            v-model="form.first_name"
            :label="t('register.firstName')"
            :error-messages="errors.first_name"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          />
          <v-text-field
            v-model="form.last_name"
            :label="t('register.lastName')"
            :error-messages="errors.last_name"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          />
        </div>
        <v-text-field
          v-model="form.email"
          type="email"
          label="Email"
          :error-messages="errors.email"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
        />
        <v-text-field
          v-model="form.password"
          type="password"
          :label="t('register.password')"
          :error-messages="errors.password"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
        />
        <v-text-field
          v-model="form.confirmPassword"
          type="password"
          :label="t('register.confirmPassword')"
          :error-messages="errors.confirmPassword"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
        />
        <v-btn type="submit" color="primary" block :loading="submitting" size="large">
          {{ submitting ? t("register.submitting") : t("register.submit") }}
        </v-btn>
      </form>

      <p class="text-center text-sm text-gray-600">
        {{ t("register.hasAccount") }}
        <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
          {{ t("register.loginLink") }}
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, getErrorMessage } from "@/lib/api";
import type { RegisterFormData, RegisterResponse } from "@/types/auth";

const { t } = useI18n();
const router = useRouter();
const submitting = ref(false);

const form = reactive<RegisterFormData>({
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  confirmPassword: "",
  country: "",
});

const errors = reactive<Record<string, string>>({});

const countryItems = COUNTRIES.filter((c) => c.code);

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k as keyof typeof errors]);
  if (!form.username) errors.username = t("register.validation.usernameRequired");
  else if (form.username.length < 3) errors.username = t("register.validation.usernameMin");
  if (!form.first_name) errors.first_name = t("register.validation.firstNameRequired");
  if (!form.last_name) errors.last_name = t("register.validation.lastNameRequired");
  if (!form.email) errors.email = t("register.validation.emailRequired");
  if (!form.password) errors.password = t("register.validation.passwordRequired");
  else if (form.password.length < 8) errors.password = t("register.validation.passwordMinLength");
  if (!form.confirmPassword) errors.confirmPassword = t("register.validation.confirmPasswordRequired");
  else if (form.password !== form.confirmPassword) errors.confirmPassword = t("register.validation.passwordsNotMatch");
  return Object.keys(errors).length === 0;
}

async function onSubmit() {
  if (!validate()) return;
  submitting.value = true;
  try {
    const { data } = await api.post<RegisterResponse>("/auth/register", {
      username: form.username,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
    });
    router.push("/login");
  } catch (error) {
    errors.email = getErrorMessage(error) || t("register.failed");
  } finally {
    submitting.value = false;
  }
}
</script>
