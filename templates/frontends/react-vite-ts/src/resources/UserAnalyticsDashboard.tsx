import { useState, useEffect } from "react";
import { Card, CardContent, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
import CohortHeatmap from "@/resources/CohortHeatmap";

interface KpiCardProps {
  title: string;
  value: string | number;
}

function KpiCard({ title, value }: KpiCardProps) {
  return (
    <Card className="flex-1 min-w-[180px]">
      <CardContent>
        <Typography variant="subtitle2" className="!text-gray-500">
          {title}
        </Typography>
        <Typography variant="h4" className="!font-bold">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function RegistrationChart({ data }: { data: UserAnalyticsData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="registrations" fill="#6366f1" name="Registrations" />
        <Bar dataKey="verified" fill="#22c55e" name="Verified" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActiveUsersChart({ data }: { data: ActiveUserStats["daily"] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="active_users" stroke="#6366f1" name="Active Users" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RetentionChart({ data }: { data: RetentionResponse }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.retention_data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="signup_date" tick={{ fontSize: 12 }} />
        <YAxis unit="%" />
        <Tooltip />
        <Bar dataKey="retention_7_rate" fill="#6366f1" name="7-day %" />
        <Bar dataKey="retention_30_rate" fill="#f59e0b" name="30-day %" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function UserAnalyticsDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [registrations, setRegistrations] = useState<UserAnalyticsData[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUserStats | null>(null);
  const [retention, setRetention] = useState<RetentionResponse | null>(null);
  const [cohort, setCohort] = useState<CohortRow[]>([]);

  useEffect(() => {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];
    const params = { start_date: start, end_date: end };

    Promise.allSettled([
      getAnalyticsSummary().then(setSummary),
      getAnalyticsRegistrations(params).then(setRegistrations),
      getAnalyticsActiveUsers(params).then(setActiveUsers),
      getAnalyticsRetention(params).then(setRetention),
      getAnalyticsCohort(params).then(setCohort),
    ]);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4">
      <Typography variant="h5" className="!font-bold">
        User Analytics
      </Typography>

      <div className="flex flex-wrap gap-4">
        <KpiCard title="Total Users" value={summary?.total_users ?? "—"} />
        <KpiCard title="Verified Users" value={summary?.verified_users ?? "—"} />
        <KpiCard title="New Users (7d)" value={summary?.new_users_7_days ?? "—"} />
        <KpiCard title="Active (24h)" value={activeUsers?.active_24h ?? "—"} />
        <KpiCard title="Active (7d)" value={activeUsers?.active_7d ?? "—"} />
      </div>

      <Card>
        <CardContent>
          <Typography variant="h6" className="!mb-4">
            Registrations (Last 30 Days)
          </Typography>
          <RegistrationChart data={registrations} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" className="!mb-4">
            Daily Active Users
          </Typography>
          {activeUsers && <ActiveUsersChart data={activeUsers.daily} />}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" className="!mb-4">
            Retention
          </Typography>
          {retention && <RetentionChart data={retention} />}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" className="!mb-4">
            Cohort Analysis
          </Typography>
          <CohortHeatmap data={cohort} />
        </CardContent>
      </Card>
    </div>
  );
}
