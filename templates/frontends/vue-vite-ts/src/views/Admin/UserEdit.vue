<template>
  <div>
    <div class="mb-6 flex items-center gap-4">
      <v-btn icon variant="text" @click="$router.push({ name: 'UserList' })">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <h2 class="text-lg font-semibold text-gray-900">{{ t("common.edit") }} {{ t("admin.user") }}</h2>
    </div>

    <form v-if="user" @submit.prevent="onSubmit" class="max-w-xl space-y-4">
      <v-text-field v-model="form.first_name" :label="t('admin.firstName')" variant="outlined" hide-details />
      <v-text-field v-model="form.last_name" :label="t('admin.lastName')" variant="outlined" hide-details />
      <v-text-field v-model="form.email" :label="t('admin.email')" type="email" variant="outlined" hide-details />
      <v-select
        v-model="form.role"
        :label="t('admin.role')"
        :items="roleItems"
        item-title="name"
        item-value="id"
        variant="outlined"
        hide-details
      />
      <v-text-field
        v-model="form.password"
        :label="t('admin.newPassword')"
        type="password"
        variant="outlined"
        hide-details
      />
      <v-checkbox v-model="form.verified" :label="t('admin.emailVerified')" hide-details />
      <v-checkbox v-model="form.two_fa_enabled" :label="t('admin.twoFARequirement')" hide-details />
      <v-text-field v-model="form.language" :label="t('profile.language')" variant="outlined" hide-details />
      <v-text-field v-model="form.country" :label="t('profile.country')" variant="outlined" hide-details />
      <div class="flex gap-4">
        <v-btn type="submit" color="primary" :loading="saving">{{ t("common.save") }}</v-btn>
        <v-btn variant="text" @click="$router.push({ name: 'UserList' })">{{ t("common.cancel") }}</v-btn>
      </div>
    </form>

    <div v-else-if="loading" class="flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { getUser, updateUser } from "@/services/adminService";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const id = computed(() => route.params.id as string);

const user = ref<Record<string, unknown> | null>(null);
const loading = ref(true);
const saving = ref(false);

const form = reactive<Record<string, unknown>>({
  first_name: "",
  last_name: "",
  email: "",
  role: "user",
  password: "",
  verified: false,
  two_fa_enabled: false,
  language: "",
  country: "",
});

const roleItems = [
  { id: "user", name: t("admin.user") },
  { id: "admin", name: t("admin.admin") },
];

onMounted(async () => {
  try {
    const u = await getUser(id.value);
    user.value = u as Record<string, unknown>;
    Object.assign(form, {
      first_name: (u as Record<string, unknown>).first_name ?? "",
      last_name: (u as Record<string, unknown>).last_name ?? "",
      email: (u as Record<string, unknown>).email ?? "",
      role: (u as Record<string, unknown>).role ?? "user",
      verified: (u as Record<string, unknown>).verified ?? false,
      two_fa_enabled: (u as Record<string, unknown>).two_fa_enabled ?? false,
      language: (u as Record<string, unknown>).language ?? "",
      country: (u as Record<string, unknown>).country ?? "",
    });
  } finally {
    loading.value = false;
  }
});

async function onSubmit() {
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      role: form.role,
      verified: form.verified,
      two_fa_enabled: form.two_fa_enabled,
      language: form.language,
      country: form.country,
    };
    if (form.password) payload.password = form.password;
    await updateUser(id.value, payload);
    router.push({ name: "UserList" });
  } finally {
    saving.value = false;
  }
}
</script>
