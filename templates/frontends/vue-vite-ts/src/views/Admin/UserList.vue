<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900">{{ t("admin.users") }}</h2>
      <v-btn color="primary" :to="{ name: 'UserCreate' }">
        {{ t("common.create") }}
      </v-btn>
    </div>

    <v-text-field
      v-model="search"
      :label="t('common.search')"
      variant="outlined"
      density="compact"
      hide-details
      class="mb-4 max-w-xs"
      clearable
    />

    <v-data-table-server
      v-model:page="page"
      v-model:items-per-page="limit"
      :headers="headers"
      :items="users"
      :loading="loading"
      :items-length="total"
      @update:options="onOptionsUpdate"
    >
      <template #item.actions="{ item }">
        <v-btn
          size="small"
          variant="text"
          color="primary"
          :to="{ name: 'UserEdit', params: { id: item.id } }"
        >
          {{ t("common.edit") }}
        </v-btn>
      </template>
    </v-data-table-server>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getUsers } from "@/services/adminService";

const { t } = useI18n();
const users = ref<unknown[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const limit = ref(10);
const search = ref("");
const sortField = ref("created_at");
const sortOrder = ref("desc");

const headers = [
  { title: "ID", key: "id", sortable: true },
  { title: t("admin.firstName"), key: "first_name" },
  { title: t("admin.lastName"), key: "last_name" },
  { title: t("admin.email"), key: "email" },
  { title: t("admin.role"), key: "role" },
  { title: t("profile.language"), key: "language" },
  { title: t("admin.createdAt"), key: "created_at" },
  { title: "", key: "actions", sortable: false },
];

async function load() {
  loading.value = true;
  try {
    const { data, total: totalCount } = await getUsers({
      page: page.value,
      limit: limit.value,
      sort_field: sortField.value,
      sort_order: sortOrder.value,
      search: search.value || undefined,
    });
    users.value = Array.isArray(data) ? data : [];
    total.value = totalCount ?? users.value.length;
  } finally {
    loading.value = false;
  }
}

function onOptionsUpdate(opts: { page?: number; itemsPerPage?: number; sortBy?: { key: string; order?: string }[] }) {
  if (opts.page != null) page.value = opts.page;
  if (opts.itemsPerPage != null) limit.value = opts.itemsPerPage;
  if (opts.sortBy?.length) {
    sortField.value = opts.sortBy[0].key;
    sortOrder.value = opts.sortBy[0].order ?? "asc";
  }
  load();
}

watch([search], () => {
  page.value = 1;
  load();
});

load();
</script>
