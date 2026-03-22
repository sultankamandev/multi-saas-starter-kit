'use client';

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ActiveUserData } from '@/types/analytics';
import type { useTranslations } from 'next-intl';

type T = ReturnType<typeof useTranslations<'admin'>>;

interface ActiveUsersChartProps {
  data: ActiveUserData[];
  loading: boolean;
  t: T;
}

export const ActiveUsersChart: React.FC<ActiveUsersChartProps> = ({ data, loading, t }) => (
  <Card sx={{ boxShadow: 3, mt: 4 }}>
    <CardContent>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        {t('analytics.activeUsers.title', { defaultValue: 'Daily Active Users 🔥' })}
      </Typography>

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
            <Line type="monotone" dataKey="active_users" stroke="#3b82f6" name={t('analytics.activeUsers.daily', { defaultValue: 'Active Users' })} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);
