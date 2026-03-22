<template>
  <div>
    <h2 class="mb-6 text-lg font-semibold text-gray-900">{{ t("admin.blockedIPs") }}</h2>

    <v-data-table
      :headers="headers"
      :items="blockedIPs"
      :loading="loading"
    >
      <template #item.actions="{ item }">
        <v-btn
          size="small"
          color="error"
          variant="text"
          :loading="unblocking === (item.id ?? item.ip)"
          @click="handleUnblock(item.id ?? item.ip)"
        >
          {{ t("admin.unblock") }}
        </v-btn>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { getBlockedIPs, unblockIP } from "@/services/adminService";

const { t } = useI18n();
const blockedIPs = ref<unknown[]>([]);
const loading = ref(false);
const unblocking = ref<string | null>(null);

const headers = [
  { title: "IP", key: "id" },
  { title: "Blocked At", key: "blocked_at" },
  { title: "", key: "actions", sortable: false },
];

async function load() {
  loading.value = true;
  try {
    blockedIPs.value = await getBlockedIPs();
  } finally {
    loading.value = false;
  }
}

async function handleUnblock(ip: string) {
  unblocking.value = ip;
  try {
    await unblockIP(ip);
    await load();
  } finally {
    unblocking.value = null;
  }
}

onMounted(load);
</script>
