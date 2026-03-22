<template>
  <v-app>
    <router-view v-slot="{ Component }">
      <Suspense>
        <component :is="Component" />
        <template #fallback>
          <div class="flex items-center justify-center min-h-screen">
            <v-progress-circular indeterminate color="primary" />
          </div>
        </template>
      </Suspense>
    </router-view>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

onMounted(() => {
  if (auth.token) auth.fetchUser();
  else auth.loading = false;
});
</script>
