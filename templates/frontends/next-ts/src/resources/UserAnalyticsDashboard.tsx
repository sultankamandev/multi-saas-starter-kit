'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, Typography, Box, TextField, Button } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { CohortHeatmap } from './CohortHeatmap';
import { useTranslations } from 'next-intl';

interface UserAnalyticsData {
  date: string;
  registrations: number;
  verified: number;
}

interface SummaryData {
  total_users: number;
  verified_users: number;
  new_users_7_days: number;
  verified_percent: number;
}

interface ActiveUserData {
  date: string;
  active_users: number;
}

interface ActiveUserStats {
  daily: ActiveUserData[];
  active_24h: number;
  active_7d: number;
}

interface RetentionData {
  signup_date: string;
  new_users: number;
  retained_7d: number;
  retained_30d: number;
  retention_7_rate: number;
  retention_30_rate: number;
}

interface RetentionResponse {
  retention_data: RetentionData[];
  average_7d: number;
  average_30d: number;
}

export const UserAnalyticsDashboard: React.FC = () => {
  const t = useTranslations('admin');
  const [data, setData] = useState<UserAnalyticsData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUserData[]>([]);
  const [activeStats, setActiveStats] = useState<{ active_24h: number; active_7d: number } | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [retentionAverages, setRetentionAverages] = useState<{ average_7d: number; average_30d: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [activeLoading, setActiveLoading] = useState(true);
  const [retentionLoading, setRetentionLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default: last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get<UserAnalyticsData[]>('/api/admin/analytics/user-registrations', { params });
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const response = await api.get<SummaryData>('/api/admin/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchActiveUsers = useCallback(async () => {
    setActiveLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get<ActiveUserStats>('/api/admin/analytics/active-users', { params });
      setActiveUsers(response.data.daily || []);
      setActiveStats({
        active_24h: response.data.active_24h || 0,
        active_7d: response.data.active_7d || 0,
      });
    } catch (error) {
      console.error('Failed to fetch active users:', error);
      setActiveUsers([]);
      setActiveStats(null);
    } finally {
      setActiveLoading(false);
    }
  }, [startDate, endDate]);

  const fetchRetention = useCallback(async () => {
    setRetentionLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get<RetentionResponse>('/api/admin/analytics/retention', { params });
      setRetentionData(response.data.retention_data || []);
      setRetentionAverages({
        average_7d: response.data.average_7d || 0,
        average_30d: response.data.average_30d || 0,
      });
    } catch (error) {
      console.error('Failed to fetch retention:', error);
      setRetentionData([]);
      setRetentionAverages(null);
    } finally {
      setRetentionLoading(false);
    }
  }, [startDate, endDate]);

  // Fetch summary once on mount
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Fetch chart data when date filters change
  useEffect(() => {
    fetchData();
    fetchActiveUsers();
    fetchRetention();
  }, [fetchData, fetchActiveUsers, fetchRetention]);

  const handleRefresh = () => {
    fetchData();
    fetchActiveUsers();
    fetchRetention();
    fetchSummary();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        {t('analytics.title', { defaultValue: 'User Analytics 🌙' })}
      </Typography>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        {/* Total Users Card */}
        <Card 
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: 3
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
              {t('analytics.kpi.totalUsers', { defaultValue: 'Total Users' })}
            </Typography>
            {summaryLoading ? (
              <Typography variant="h4">...</Typography>
            ) : (
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {summary?.total_users || 0}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Verified Users Card */}
        <Card 
          sx={{ 
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: 'white',
            boxShadow: 3
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
              {t('analytics.kpi.verifiedUsers', { defaultValue: 'Verified Users' })}
            </Typography>
            {summaryLoading ? (
              <Typography variant="h4">...</Typography>
            ) : (
              <>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {summary?.verified_users || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {summary?.verified_percent ? `${summary.verified_percent.toFixed(1)}%` : '0%'} {t('analytics.kpi.verified', { defaultValue: 'verified' })}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        {/* New Users (7 Days) Card */}
        <Card 
          sx={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            boxShadow: 3
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
              {t('analytics.kpi.newUsers7Days', { defaultValue: 'New Users (7 Days)' })}
            </Typography>
            {summaryLoading ? (
              <Typography variant="h4">...</Typography>
            ) : (
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {summary?.new_users_7_days || 0}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Active Users (24h) Card */}
        <Card 
          sx={{ 
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            boxShadow: 3
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
              {t('analytics.kpi.active24h', { defaultValue: 'Active (24h)' })}
            </Typography>
            {activeLoading ? (
              <Typography variant="h4">...</Typography>
            ) : (
              <>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {activeStats?.active_24h || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {activeStats?.active_7d || 0} {t('analytics.kpi.activeThisWeek', { defaultValue: 'active this week' })}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Chart Section */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label={t('analytics.startDate', { defaultValue: 'Start Date' })}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label={t('analytics.endDate', { defaultValue: 'End Date' })}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />
          <Button
            variant="contained"
            onClick={handleRefresh}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? t('analytics.loading', { defaultValue: 'Loading...' }) : t('analytics.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>{t('analytics.loading', { defaultValue: 'Loading...' })}</Typography>
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography color="text.secondary">
              {t('analytics.noData', { defaultValue: 'No data available for the selected date range.' })}
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="registrations" 
                stroke="#8884d8" 
                name={t('analytics.registrations', { defaultValue: 'Registrations' })}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="verified" 
                stroke="#82ca9d" 
                name={t('analytics.verified', { defaultValue: 'Verified' })}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {data.length > 0 && (
          <Box sx={{ mt: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Card variant="outlined" sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="h6" color="text.secondary">
                {t('analytics.totalRegistrations', { defaultValue: 'Total Registrations' })}
              </Typography>
              <Typography variant="h4" color="primary">
                {data.reduce((sum, item) => sum + item.registrations, 0)}
              </Typography>
            </Card>
            <Card variant="outlined" sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="h6" color="text.secondary">
                {t('analytics.totalVerified', { defaultValue: 'Total Verified' })}
              </Typography>
              <Typography variant="h4" color="success.main">
                {data.reduce((sum, item) => sum + item.verified, 0)}
              </Typography>
            </Card>
            <Card variant="outlined" sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="h6" color="text.secondary">
                {t('analytics.verificationRate', { defaultValue: 'Verification Rate' })}
              </Typography>
              <Typography variant="h4" color="info.main">
                {(() => {
                  const total = data.reduce((sum, item) => sum + item.registrations, 0);
                  const verified = data.reduce((sum, item) => sum + item.verified, 0);
                  return total > 0 ? `${((verified / total) * 100).toFixed(1)}%` : '0%';
                })()}
              </Typography>
            </Card>
          </Box>
        )}
        </CardContent>
      </Card>

      {/* Active Users Chart Section */}
      <Card sx={{ boxShadow: 3, mt: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
            {t('analytics.activeUsers.title', { defaultValue: 'Daily Active Users 🔥' })}
          </Typography>

          {activeLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <Typography>{t('analytics.loading', { defaultValue: 'Loading...' })}</Typography>
            </Box>
          ) : activeUsers.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <Typography color="text.secondary">
                {t('analytics.noData', { defaultValue: 'No data available for the selected date range.' })}
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={activeUsers} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="active_users" 
                  stroke="#3b82f6" 
                  name={t('analytics.activeUsers.daily', { defaultValue: 'Active Users' })}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Retention Analytics Section */}
      <Card sx={{ boxShadow: 3, mt: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
            {t('analytics.retention.title', { defaultValue: 'User Retention Analytics 🔁' })}
          </Typography>

          {/* Retention KPI Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
            {/* Average 7-Day Retention Card */}
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                boxShadow: 3
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                  {t('analytics.retention.average7d', { defaultValue: 'Average 7-Day Retention' })}
                </Typography>
                {retentionLoading ? (
                  <Typography variant="h4">...</Typography>
                ) : (
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {retentionAverages?.average_7d ? `${retentionAverages.average_7d.toFixed(1)}%` : '0%'}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Average 30-Day Retention Card */}
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                color: 'white',
                boxShadow: 3
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                  {t('analytics.retention.average30d', { defaultValue: 'Average 30-Day Retention' })}
                </Typography>
                {retentionLoading ? (
                  <Typography variant="h4">...</Typography>
                ) : (
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {retentionAverages?.average_30d ? `${retentionAverages.average_30d.toFixed(1)}%` : '0%'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Retention Chart */}
          {retentionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <Typography>{t('analytics.loading', { defaultValue: 'Loading...' })}</Typography>
            </Box>
          ) : retentionData.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <Typography color="text.secondary">
                {t('analytics.noData', { defaultValue: 'No data available for the selected date range.' })}
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={retentionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="signup_date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  labelStyle={{ fontWeight: 'bold' }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="retention_7_rate" 
                  stroke="#3b82f6" 
                  name={t('analytics.retention.rate7d', { defaultValue: '7-Day Retention %' })}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="retention_30_rate" 
                  stroke="#a855f7" 
                  name={t('analytics.retention.rate30d', { defaultValue: '30-Day Retention %' })}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Cohort Heatmap Section */}
      <CohortHeatmap />
    </Box>
  );
};

