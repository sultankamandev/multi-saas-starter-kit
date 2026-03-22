<template>
  <div class="mx-auto max-w-2xl px-4 py-10">
    <div v-if="loading" class="flex min-h-[60vh] items-center justify-center">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <template v-else>
      <h1 class="text-3xl font-bold tracking-tight text-gray-900">
        {{ t("profile.title") }}
      </h1>

      <form @submit.prevent="onSubmit" class="mt-8 space-y-6">
        <div class="grid gap-6 sm:grid-cols-2">
          <v-text-field
            v-model="form.username"
            :label="t('profile.username')"
            :error-messages="errors.username"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          />
          <v-text-field
            v-model="form.first_name"
            :label="t('profile.firstName')"
            :error-messages="errors.first_name"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          />
          <v-text-field
            v-model="form.last_name"
            :label="t('profile.lastName')"
            :error-messages="errors.last_name"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          />
          <v-select
            v-model="form.language"
            :label="t('profile.language')"
            :items="localeItems"
            item-title="name"
            item-value="code"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="form.country"
            :label="t('profile.country')"
            :items="countryItems"
            item-title="name"
            item-value="code"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
          <v-text-field
            v-model="form.phone"
            :label="t('profile.phone')"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <v-textarea
          v-model="form.address"
          :label="t('profile.address')"
          variant="outlined"
          density="comfortable"
          rows="3"
          hide-details
        />

        <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <p class="text-sm font-medium text-gray-900">
              {{ t("profile.twoFactorAuth") }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t("profile.twoFactorDescription") }}
            </p>
          </div>
          <v-switch v-model="form.two_fa_enabled" color="primary" hide-details />
        </div>

        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :disabled="saving || !isDirty"
          :loading="saving"
        >
          {{ t("profile.save") }}
        </v-btn>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getProfile, updateProfile, mapProfileToFormData } from "@/services/userService";
import { getErrorMessage } from "@/lib/api";
import { COUNTRIES } from "@/constants/countries";
import { SUPPORTED_LOCALES, LOCALE_DISPLAY_CONFIG } from "@/i18n";
import type { ProfileUpdatePayload } from "@/types/auth";

const { t } = useI18n();
const loading = ref(true);
const saving = ref(false);

const form = reactive<ProfileUpdatePayload & { two_fa_enabled: boolean }>({
  username: "",
  first_name: "",
  last_name: "",
  language: "en",
  country: "",
  address: "",
  phone: "",
  two_fa_enabled: false,
});

const initialForm = ref<ProfileUpdatePayload & { two_fa_enabled: boolean } | null>(null);
const errors = reactive<Record<string, string>>({});

const isDirty = computed(() => {
  if (!initialForm.value) return false;
  return (
    form.username !== initialForm.value.username ||
    form.first_name !== initialForm.value.first_name ||
    form.last_name !== initialForm.value.last_name ||
    form.language !== initialForm.value.language ||
    form.country !== initialForm.value.country ||
    form.address !== initialForm.value.address ||
    form.phone !== initialForm.value.phone ||
    form.two_fa_enabled !== initialForm.value.two_fa_enabled
  );
});

const localeItems = SUPPORTED_LOCALES.map((loc) => ({
  code: loc,
  name: `${LOCALE_DISPLAY_CONFIG[loc].flag} ${LOCALE_DISPLAY_CONFIG[loc].name}`,
}));

const countryItems = COUNTRIES.filter((c) => c.code);

async function loadProfile() {
  try {
    const profile = await getProfile();
    const mapped = mapProfileToFormData(profile);
    Object.assign(form, mapped);
    initialForm.value = { ...mapped };
  } catch {
    // show error
  } finally {
    loading.value = false;
  }
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k as keyof typeof errors]);
  if (!form.username) errors.username = t("profile.required");
  if (!form.first_name) errors.first_name = t("profile.required");
  if (!form.last_name) errors.last_name = t("profile.required");
  return Object.keys(errors).length === 0;
}

async function onSubmit() {
  if (!validate()) return;
  saving.value = true;
  try {
    const updated = await updateProfile({
      username: form.username,
      first_name: form.first_name,
      last_name: form.last_name,
      language: form.language,
      country: form.country,
      address: form.address,
      phone: form.phone,
      two_fa_enabled: form.two_fa_enabled,
    });
    initialForm.value = mapProfileToFormData(updated) as ProfileUpdatePayload & { two_fa_enabled: boolean };
    Object.assign(form, initialForm.value);
  } catch {
    // show error
  } finally {
    saving.value = false;
  }
}

loadProfile();
</script>
