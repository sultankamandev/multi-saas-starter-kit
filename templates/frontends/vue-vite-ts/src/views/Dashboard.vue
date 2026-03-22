<template>
  <div class="mx-auto max-w-4xl px-4 py-10">
    <h1 class="text-3xl font-bold tracking-tight text-gray-900">
      {{ auth.user?.first_name ? t("dashboard.welcomeBackName", { name: auth.user.first_name }) : t("dashboard.welcomeBack") }}
    </h1>

    <div class="mt-8 grid gap-6 sm:grid-cols-2">
      <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ t("dashboard.features.title") }}
        </h2>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-gray-500">{{ t("dashboard.name") }}</dt>
            <dd class="font-medium text-gray-900">{{ auth.user?.first_name }} {{ auth.user?.last_name }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500">{{ t("dashboard.email") }}</dt>
            <dd class="font-medium text-gray-900">{{ auth.user?.email }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500">{{ t("dashboard.role") }}</dt>
            <dd class="font-medium text-gray-900 capitalize">{{ auth.user?.role }}</dd>
          </div>
        </dl>
      </div>

      <div class="space-y-4">
        <router-link
          to="/profile"
          class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div>
            <h3 class="font-semibold text-gray-900">{{ t("dashboard.editProfile") }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ t("dashboard.features.description") }}</p>
          </div>
          <span class="text-gray-400">&rarr;</span>
        </router-link>

        <router-link
          to="/setup-2fa"
          class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div>
            <h3 class="font-semibold text-gray-900">{{ t("setup2FA.title") }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ t("setup2FA.description") }}</p>
          </div>
          <span class="text-gray-400">&rarr;</span>
        </router-link>

        <router-link
          v-if="auth.isAdmin"
          to="/admin"
          class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div>
            <h3 class="font-semibold text-gray-900">{{ t("dashboard.adminPanel") }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ t("dashboard.features.description") }}</p>
          </div>
          <span class="text-gray-400">&rarr;</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";

const { t } = useI18n();
const auth = useAuthStore();
</script>
