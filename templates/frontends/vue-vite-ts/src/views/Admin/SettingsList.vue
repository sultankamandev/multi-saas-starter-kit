<template>
  <div>
    <h2 class="mb-6 text-lg font-semibold text-gray-900">{{ t("admin.settings") }}</h2>

    <v-data-table
      :headers="headers"
      :items="settings"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { getSettings } from "@/services/adminService";

const { t } = useI18n();
const settings = ref<unknown[]>([]);
const loading = ref(false);

const headers = [
  { title: "Key", key: "key" },
  { title: "Value", key: "value" },
];

async function load() {
  loading.value = true;
  try {
    settings.value = await getSettings();
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
