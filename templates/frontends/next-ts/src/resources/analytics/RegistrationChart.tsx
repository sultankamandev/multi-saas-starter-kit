'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, TextField, Button } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { UserAnalyticsData } from '@/types/analytics';
import type { useTranslations } from 'next-intl';

type T = ReturnType<typeof useTranslations<'admin'>>;

interface RegistrationChartProps {
  data: UserAnalyticsData[];
  loading: boolean;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRefresh: () => void;
  t: T;
}

function verificationRate(data: UserAnalyticsData[]): string {
  const total = data.reduce((sum, item) => sum + item.registrations, 0);
  const verified = data.reduce((sum, item) => sum + item.verified, 0);
  return total > 0 ? `${((verified / total) * 100).toFixed(1)}%` : '0%';
}

export const RegistrationChart: React.FC<RegistrationChartProps> = ({
  data,
  loading,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  t,
}) => {
  const totalRegistrations = useMemo(() => data.reduce((sum, item) => sum + item.registrations, 0), [data]);
  const totalVerified = useMemo(() => data.reduce((sum, item) => sum + item.verified, 0), [data]);
  const rate = useMemo(() => verificationRate(data), [data]);

  return (
    <Card sx={{ boxShadow: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label={t('analytics.startDate', { defaultValue: 'Start Date' })}
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label={t('analytics.endDate', { defaultValue: 'End Date' })}
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />
          <Button variant="contained" onClick={onRefresh} disabled={loading} sx={{ minWidth: 120 }}>
            {loading ? t('analytics.loading', { defaultValue: 'Loading...' }) : t('analytics.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>{t('analytics.loading', { defaultValue: 'Loading...' })}</Typography>
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography color="text.secondary">{t('analytics.noData', { defaultValue: 'No data available for the selected date range.' })}</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} labelStyle={{ fontWeight: 'bold' }} />
              <Legend />
              <Line type="monotone" dataKey="registrations" stroke="#8884d8" name={t('analytics.registrations', { defaultValue: 'Registrations' })} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="verified" stroke="#82ca9d" name={t('analytics.verified', { defaultValue: 'Verified' })} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {data.length > 0 && (
          <Box sx={{ mt: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Card variant="outlined" sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="h6" color="text.secondary">{t('analytics.totalRegistrations', { defaultValue: 'Total Registrations' })}</Typography>
              <Typography variant="h4" color="primary">{totalRegistrations}</Typography>
            </Card>
            <Card variant="outlined" sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="h6" color="text.secondary">{t('analytics.totalVerified', { defaultValue: 'Total Verified' })}</Typography>
              <Typography variant="h4" color="success.main">{totalVerified}</Typography>
            </Card>
            <Card variant="outlined" sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="h6" color="text.secondary">{t('analytics.verificationRate', { defaultValue: 'Verification Rate' })}</Typography>
              <Typography variant="h4" color="info.main">{rate}</Typography>
            </Card>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
