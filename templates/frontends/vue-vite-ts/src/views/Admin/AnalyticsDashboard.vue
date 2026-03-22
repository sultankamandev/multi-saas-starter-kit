<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-lg font-bold text-gray-900">
      {{ t("admin.analytics.title") }}
    </h2>

    <div class="flex flex-wrap gap-4">
      <div class="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-500">{{ t("admin.analytics.kpi.totalUsers") }}</p>
        <p class="text-2xl font-bold">{{ summary?.total_users ?? "—" }}</p>
      </div>
      <div class="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-500">{{ t("admin.analytics.kpi.verifiedUsers") }}</p>
        <p class="text-2xl font-bold">{{ summary?.verified_users ?? "—" }}</p>
      </div>
      <div class="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-500">{{ t("admin.analytics.kpi.newUsers7Days") }}</p>
        <p class="text-2xl font-bold">{{ summary?.new_users_7_days ?? "—" }}</p>
      </div>
      <div class="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-500">{{ t("admin.analytics.kpi.active24h") }}</p>
        <p class="text-2xl font-bold">{{ activeUsers?.active_24h ?? "—" }}</p>
      </div>
      <div class="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-500">{{ t("admin.analytics.kpi.activeThisWeek") }}</p>
        <p class="text-2xl font-bold">{{ activeUsers?.active_7d ?? "—" }}</p>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-base font-semibold text-gray-900">
        {{ t("admin.analytics.registrations") }} ({{ t("admin.analytics.last30Days") }})
      </h3>
      <div class="h-[300px]">
        <Bar v-if="registrations.length" :data="registrationsChartData" :options="chartOptions" />
        <p v-else class="text-sm text-gray-500">{{ t("admin.analytics.noData") }}</p>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-base font-semibold text-gray-900">
        {{ t("admin.analytics.activeUsers.title") }}
      </h3>
      <div class="h-[300px]">
        <Line v-if="activeUsers?.daily?.length" :data="activeUsersChartData" :options="chartOptions" />
        <p v-else class="text-sm text-gray-500">{{ t("admin.analytics.noData") }}</p>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-base font-semibold text-gray-900">
        {{ t("admin.analytics.retention.title") }}
      </h3>
      <div class="h-[300px]">
        <Bar v-if="retention?.retention_data?.length" :data="retentionChartData" :options="chartOptions" />
        <p v-else class="text-sm text-gray-500">{{ t("admin.analytics.noData") }}</p>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-base font-semibold text-gray-900">
        {{ t("admin.analytics.cohort.title") }}
      </h3>
      <div class="overflow-x-auto">
        <table v-if="cohort.length" class="min-w-full border-collapse text-sm">
          <thead>
            <tr class="bg-gray-100">
              <th class="px-3 py-2 text-left font-medium text-gray-700">{{ t("admin.analytics.cohort.signupDate") }}</th>
              <th class="px-3 py-2 text-right font-medium text-gray-700">{{ t("admin.analytics.cohort.newUsers") }}</th>
              <th v-for="k in retentionKeys" :key="k" class="px-3 py-2 text-right font-medium text-gray-700">
                {{ k.replace("_", " ").replace("day", "Day") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in cohort" :key="row.signup_date" class="border-b border-gray-200">
              <td class="px-3 py-2 font-medium">{{ row.signup_date }}</td>
              <td class="px-3 py-2 text-right">{{ row.new_users }}</td>
              <td
                v-for="k in retentionKeys"
                :key="k"
                class="px-3 py-2 text-right font-mono"
                :style="{ backgroundColor: retentionColor(row.new_users > 0 ? (row[k] / row.new_users) * 100 : 0) }"
              >
                {{ row.new_users > 0 ? ((row[k] / row.new_users) * 100).toFixed(1) : 0 }}%
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="text-sm text-gray-500">{{ t("admin.analytics.noData") }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Bar, Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  getAnalyticsSummary,
  getAnalyticsRegistrations,
  getAnalyticsActiveUsers,
  getAnalyticsRetention,
  getAnalyticsCohort,
} from "@/services/adminService";
import type {
  SummaryData,
  UserAnalyticsData,
  ActiveUserStats,
  RetentionResponse,
  CohortRow,
} from "@/types/analytics";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const retentionKeys = ["day_1", "day_3", "day_7", "day_14", "day_30"] as const;

const { t } = useI18n();
const summary = ref<SummaryData | null>(null);
const registrations = ref<UserAnalyticsData[]>([]);
const activeUsers = ref<ActiveUserStats | null>(null);
const retention = ref<RetentionResponse | null>(null);
const cohort = ref<CohortRow[]>([]);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
};

const registrationsChartData = computed(() => ({
  labels: registrations.value.map((r) => r.date),
  datasets: [
    { label: t("admin.analytics.registrations"), data: registrations.value.map((r) => r.registrations), backgroundColor: "#6366f1" },
    { label: t("admin.analytics.verified"), data: registrations.value.map((r) => r.verified), backgroundColor: "#22c55e" },
  ],
}));

const activeUsersChartData = computed(() => ({
  labels: activeUsers.value?.daily?.map((d) => d.date) ?? [],
  datasets: [
    { label: t("admin.analytics.activeUsers.daily"), data: activeUsers.value?.daily?.map((d) => d.active_users) ?? [], borderColor: "#6366f1", fill: false },
  ],
}));

const retentionChartData = computed(() => ({
  labels: retention.value?.retention_data?.map((r) => r.signup_date) ?? [],
  datasets: [
    { label: t("admin.analytics.retention.rate7d"), data: retention.value?.retention_data?.map((r) => r.retention_7_rate) ?? [], backgroundColor: "#6366f1" },
    { label: t("admin.analytics.retention.rate30d"), data: retention.value?.retention_data?.map((r) => r.retention_30_rate) ?? [], backgroundColor: "#f59e0b" },
  ],
}));

function retentionColor(pct: number): string {
  if (pct <= 0) return "#f3f4f6";
  const intensity = Math.round(40 + (pct / 100) * 160);
  return `rgb(${200 - intensity}, ${220 - Math.round(intensity * 0.3)}, ${200 - intensity})`;
}

onMounted(async () => {
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];
  const params = { start_date: start, end_date: end };

  const [s, r, a, ret, c] = await Promise.allSettled([
    getAnalyticsSummary(),
    getAnalyticsRegistrations(params),
    getAnalyticsActiveUsers(params),
    getAnalyticsRetention(params),
    getAnalyticsCohort(params),
  ]);

  if (s.status === "fulfilled") summary.value = s.value;
  if (r.status === "fulfilled") registrations.value = r.value;
  if (a.status === "fulfilled") activeUsers.value = a.value;
  if (ret.status === "fulfilled") retention.value = ret.value;
  if (c.status === "fulfilled") cohort.value = (c.value as CohortRow[]) ?? [];
});
</script>
