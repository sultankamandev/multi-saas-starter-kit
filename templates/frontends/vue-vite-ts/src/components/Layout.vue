<template>
  <div class="min-h-screen bg-gray-50">
    <Navigation v-if="!isAuthPage" />
    <main class="container mx-auto px-4 py-6">
      <router-view v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="flex justify-center py-12">
              <v-progress-circular indeterminate color="primary" />
            </div>
          </template>
        </Suspense>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Navigation from "./Navigation.vue";

const route = useRoute();
const isAuthPage = computed(() =>
  ["Login", "Register", "ForgotPassword", "ResetPassword", "VerifyEmail", "Verify2FA", "RecoveryLogin"].includes(
    (route.name as string) || ""
  )
);
</script>
