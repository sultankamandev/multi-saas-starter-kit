<template>
  <nav class="bg-white shadow-sm border-b">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-14">
        <router-link to="/" class="text-xl font-semibold text-gray-800">
          {{ t("nav.appName") }}
        </router-link>
        <div class="flex items-center gap-4">
          <LanguageSwitcher />
          <template v-if="auth.isAuthenticated">
            <router-link to="/dashboard" class="text-gray-600 hover:text-gray-900">
              {{ t("nav.dashboard") }}
            </router-link>
            <router-link to="/profile" class="text-gray-600 hover:text-gray-900">
              {{ t("nav.profile") }}
            </router-link>
            <router-link v-if="auth.isAdmin" to="/admin" class="text-gray-600 hover:text-gray-900">
              {{ t("dashboard.adminPanel") }}
            </router-link>
            <v-btn variant="text" size="small" @click="handleLogout">
              {{ t("nav.logout") }}
            </v-btn>
          </template>
          <template v-else>
            <router-link to="/login" class="text-gray-600 hover:text-gray-900">
              {{ t("nav.login") }}
            </router-link>
            <router-link to="/register" class="text-gray-600 hover:text-gray-900">
              {{ t("nav.register") }}
            </router-link>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import LanguageSwitcher from "./LanguageSwitcher.vue";

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

async function handleLogout() {
  await auth.logout();
  router.push("/login");
}
</script>
