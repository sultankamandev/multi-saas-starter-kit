'use client';

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import type { SummaryData } from '@/types/analytics';
import type { useTranslations } from 'next-intl';

type T = ReturnType<typeof useTranslations<'admin'>>;

interface KPISectionProps {
  summary: SummaryData | null;
  summaryLoading: boolean;
  activeStats: { active_24h: number; active_7d: number } | null;
  activeLoading: boolean;
  retentionAverages: { average_7d: number; average_30d: number } | null;
  retentionLoading: boolean;
  t: T;
}

export const KPISection: React.FC<KPISectionProps> = ({
  summary,
  summaryLoading,
  activeStats,
  activeLoading,
  retentionAverages,
  retentionLoading,
  t,
}) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
    <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
          {t('analytics.kpi.totalUsers', { defaultValue: 'Total Users' })}
        </Typography>
        {summaryLoading ? <Typography variant="h4">...</Typography> : <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{summary?.total_users ?? 0}</Typography>}
      </CardContent>
    </Card>

    <Card sx={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
          {t('analytics.kpi.verifiedUsers', { defaultValue: 'Verified Users' })}
        </Typography>
        {summaryLoading ? (
          <Typography variant="h4">...</Typography>
        ) : (
          <>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 0.5 }}>{summary?.verified_users ?? 0}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {summary?.verified_percent != null ? `${summary.verified_percent.toFixed(1)}%` : '0%'} {t('analytics.kpi.verified', { defaultValue: 'verified' })}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>

    <Card sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
          {t('analytics.kpi.newUsers7Days', { defaultValue: 'New Users (7 Days)' })}
        </Typography>
        {summaryLoading ? <Typography variant="h4">...</Typography> : <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{summary?.new_users_7_days ?? 0}</Typography>}
      </CardContent>
    </Card>

    <Card sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
          {t('analytics.kpi.active24h', { defaultValue: 'Active (24h)' })}
        </Typography>
        {activeLoading ? (
          <Typography variant="h4">...</Typography>
        ) : (
          <>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 0.5 }}>{activeStats?.active_24h ?? 0}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {activeStats?.active_7d ?? 0} {t('analytics.kpi.activeThisWeek', { defaultValue: 'active this week' })}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  </Box>
);
