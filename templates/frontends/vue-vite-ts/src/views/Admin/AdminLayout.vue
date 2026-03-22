<template>
  <div class="flex min-h-screen">
    <v-navigation-drawer permanent class="border-r border-gray-200">
      <v-list nav density="compact">
        <v-list-item :to="{ name: 'AdminDashboard' }" prepend-icon="mdi-chart-line" :title="t('admin.analytics.title')" />
        <v-list-item :to="{ name: 'UserList' }" prepend-icon="mdi-account-multiple" :title="t('admin.users')" />
        <v-list-item :to="{ name: 'ActionList' }" prepend-icon="mdi-history" :title="t('admin.auditLog')" />
        <v-list-item :to="{ name: 'BlockedIPList' }" prepend-icon="mdi-ip-off" :title="t('admin.blockedIPs')" />
        <v-list-item :to="{ name: 'SettingsList' }" prepend-icon="mdi-cog" :title="t('admin.settings')" />
      </v-list>
      <template #append>
        <v-list-item to="/dashboard" prepend-icon="mdi-arrow-left" :title="t('nav.dashboard')" />
      </template>
    </v-navigation-drawer>

    <div class="flex-1 overflow-auto">
      <header class="border-b border-gray-200 bg-white px-6 py-4">
        <h1 class="text-xl font-semibold text-gray-900">
          {{ adminTitle }}
        </h1>
      </header>
      <main class="p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const route = useRoute();

const adminTitle = computed(() => {
  const name = route.name as string;
  const titles: Record<string, string> = {
    AdminDashboard: t("admin.analytics.title"),
    UserList: t("admin.users"),
    UserEdit: t("common.edit"),
    UserCreate: t("common.create"),
    ActionList: t("admin.auditLog"),
    BlockedIPList: t("admin.blockedIPs"),
    SettingsList: t("admin.settings"),
  };
  return titles[name] ?? t("admin.analytics.title");
});
</script>
