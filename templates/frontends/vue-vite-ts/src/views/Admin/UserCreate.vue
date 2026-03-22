<template>
  <div>
    <div class="mb-6 flex items-center gap-4">
      <v-btn icon variant="text" @click="$router.push({ name: 'UserList' })">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <h2 class="text-lg font-semibold text-gray-900">{{ t("common.create") }} {{ t("admin.user") }}</h2>
    </div>

    <form @submit.prevent="onSubmit" class="max-w-xl space-y-4">
      <v-text-field v-model="form.first_name" :label="t('admin.firstName')" variant="outlined" hide-details />
      <v-text-field v-model="form.last_name" :label="t('admin.lastName')" variant="outlined" hide-details />
      <v-text-field v-model="form.email" :label="t('admin.email')" type="email" variant="outlined" hide-details />
      <v-text-field
        v-model="form.password"
        :label="t('admin.password')"
        type="password"
        variant="outlined"
        hide-details
      />
      <v-select
        v-model="form.role"
        :label="t('admin.role')"
        :items="roleItems"
        item-title="name"
        item-value="id"
        variant="outlined"
        hide-details
      />
      <v-text-field v-model="form.language" :label="t('profile.language')" variant="outlined" hide-details />
      <div class="flex gap-4">
        <v-btn type="submit" color="primary" :loading="saving">{{ t("common.save") }}</v-btn>
        <v-btn variant="text" @click="$router.push({ name: 'UserList' })">{{ t("common.cancel") }}</v-btn>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { createUser } from "@/services/adminService";

const { t } = useI18n();
const router = useRouter();
const saving = ref(false);

const form = reactive({
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "user",
  language: "",
});

const roleItems = [
  { id: "user", name: t("admin.user") },
  { id: "admin", name: t("admin.admin") },
];

async function onSubmit() {
  saving.value = true;
  try {
    await createUser(form);
    router.push({ name: "UserList" });
  } finally {
    saving.value = false;
  }
}
</script>
