<template>
  <div>
    <h2 class="mb-6 text-lg font-semibold text-gray-900">{{ t("admin.auditLog") }}</h2>

    <v-data-table-server
      v-model:page="page"
      v-model:items-per-page="limit"
      :headers="headers"
      :items="actions"
      :loading="loading"
      :items-length="total"
      @update:options="onOptionsUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { getActions } from "@/services/adminService";

const { t } = useI18n();
const actions = ref<unknown[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const limit = ref(10);

const headers = [
  { title: "ID", key: "id" },
  { title: t("admin.performedBy"), key: "admin_email" },
  { title: "Action", key: "action" },
  { title: t("admin.targetUser"), key: "target_email" },
  { title: "Message", key: "message" },
  { title: t("admin.createdAt"), key: "created_at" },
];

async function load() {
  loading.value = true;
  try {
    const { data, total: totalCount } = await getActions({ page: page.value, limit: limit.value });
    actions.value = Array.isArray(data) ? data : [];
    total.value = totalCount ?? actions.value.length;
  } finally {
    loading.value = false;
  }
}

function onOptionsUpdate(opts: { page?: number; itemsPerPage?: number }) {
  if (opts.page != null) page.value = opts.page;
  if (opts.itemsPerPage != null) limit.value = opts.itemsPerPage;
  load();
}

onMounted(load);
</script>
