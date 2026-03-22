'use client';

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { RetentionData } from '@/types/analytics';
import type { useTranslations } from 'next-intl';

type T = ReturnType<typeof useTranslations<'admin'>>;

interface RetentionChartProps {
  data: RetentionData[];
  averages: { average_7d: number; average_30d: number } | null;
  loading: boolean;
  t: T;
}

export const RetentionChart: React.FC<RetentionChartProps> = ({ data, averages, loading, t }) => (
  <Card sx={{ boxShadow: 3, mt: 4 }}>
    <CardContent>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        {t('analytics.retention.title', { defaultValue: 'User Retention Analytics 🔁' })}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
        <Card sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
              {t('analytics.retention.average7d', { defaultValue: 'Average 7-Day Retention' })}
            </Typography>
            {loading ? <Typography variant="h4">...</Typography> : <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{averages?.average_7d != null ? `${averages.average_7d.toFixed(1)}%` : '0%'}</Typography>}
          </CardContent>
        </Card>
        <Card sx={{ background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)', color: 'white', boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
              {t('analytics.retention.average30d', { defaultValue: 'Average 30-Day Retention' })}
            </Typography>
            {loading ? <Typography variant="h4">...</Typography> : <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{averages?.average_30d != null ? `${averages.average_30d.toFixed(1)}%` : '0%'}</Typography>}
          </CardContent>
        </Card>
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
            <XAxis dataKey="signup_date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} labelStyle={{ fontWeight: 'bold' }} formatter={(value: number) => `${value.toFixed(1)}%`} />
            <Legend />
            <Line type="monotone" dataKey="retention_7_rate" stroke="#3b82f6" name={t('analytics.retention.rate7d', { defaultValue: '7-Day Retention %' })} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="retention_30_rate" stroke="#a855f7" name={t('analytics.retention.rate30d', { defaultValue: '30-Day Retention %' })} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);
