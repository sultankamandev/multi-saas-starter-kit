'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface CohortData {
  signup_date: string;
  new_users: number;
  day_1: number;
  day_3: number;
  day_7: number;
  day_14: number;
  day_30: number;
}

const getColorStyle = (value: number): React.CSSProperties => {
  if (value >= 70) {
    return { backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 'bold' };
  }
  if (value >= 40) {
    return { backgroundColor: '#84cc16', color: '#1f2937', fontWeight: 'bold' };
  }
  if (value >= 10) {
    return { backgroundColor: '#facc15', color: '#1f2937', fontWeight: 'bold' };
  }
  if (value > 0) {
    return { backgroundColor: '#fef3c7', color: '#1f2937', fontWeight: 'medium' };
  }
  return { backgroundColor: '#f3f4f6', color: '#6b7280', fontWeight: 'normal' };
};

interface SegmentFilters {
  country: string;
  language: string;
}

export const CohortHeatmap: React.FC = () => {
  const t = useTranslations('admin');
  const [data, setData] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SegmentFilters>({ country: '', language: '' });

  const fetchCohortData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.country) params.country = filters.country;
      if (filters.language) params.language = filters.language;

      const response = await api.get<CohortData[]>('/api/admin/analytics/cohort', { params });
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch cohort data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCohortData();
  }, [fetchCohortData]);

  return (
    <Card sx={{ boxShadow: 3, mt: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              {t('analytics.cohort.title', { defaultValue: 'Cohort Retention Heatmap 🔥' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('analytics.cohort.description', { defaultValue: 'Each row shows a signup cohort. Darker colour = better retention.' })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('analytics.segmentation.country', { defaultValue: 'Country' })}</InputLabel>
              <Select
                value={filters.country}
                label={t('analytics.segmentation.country', { defaultValue: 'Country' })}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              >
                <MenuItem value="">{t('analytics.segmentation.allCountries', { defaultValue: 'All Countries' })}</MenuItem>
                <MenuItem value="TR">{t('analytics.segmentation.countries.TR', { defaultValue: 'Turkey' })}</MenuItem>
                <MenuItem value="US">{t('analytics.segmentation.countries.US', { defaultValue: 'USA' })}</MenuItem>
                <MenuItem value="GB">{t('analytics.segmentation.countries.GB', { defaultValue: 'UK' })}</MenuItem>
                <MenuItem value="DE">{t('analytics.segmentation.countries.DE', { defaultValue: 'Germany' })}</MenuItem>
                <MenuItem value="FR">{t('analytics.segmentation.countries.FR', { defaultValue: 'France' })}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('analytics.segmentation.language', { defaultValue: 'Language' })}</InputLabel>
              <Select
                value={filters.language}
                label={t('analytics.segmentation.language', { defaultValue: 'Language' })}
                onChange={(e) => setFilters({ ...filters, language: e.target.value })}
              >
                <MenuItem value="">{t('analytics.segmentation.allLanguages', { defaultValue: 'All Languages' })}</MenuItem>
                <MenuItem value="tr">{t('analytics.segmentation.languages.tr', { defaultValue: 'Turkish' })}</MenuItem>
                <MenuItem value="en">{t('analytics.segmentation.languages.en', { defaultValue: 'English' })}</MenuItem>
                <MenuItem value="de">{t('analytics.segmentation.languages.de', { defaultValue: 'German' })}</MenuItem>
                <MenuItem value="fr">{t('analytics.segmentation.languages.fr', { defaultValue: 'French' })}</MenuItem>
              </Select>
            </FormControl>
          </Box>
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
          <TableContainer 
            component={Paper} 
            sx={{ 
              maxHeight: 600, 
              overflowX: 'auto',
              backgroundColor: 'transparent',
              boxShadow: 'none',
            }}
          >
            <Table stickyHeader size="small" sx={{ backgroundColor: 'transparent' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#1e40af', color: '#ffffff' }}>
                    {t('analytics.cohort.signupDate', { defaultValue: 'Signup Date' })}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#1e40af', color: '#ffffff' }}>
                    {t('analytics.cohort.newUsers', { defaultValue: 'New Users' })}
                  </TableCell>
                  {[1, 3, 7, 14, 30].map((day) => (
                    <TableCell key={day} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#1e40af', color: '#ffffff' }}>
                      {t('analytics.cohort.day', { day, defaultValue: `Day ${day}` })}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow 
                    key={index} 
                    hover
                    sx={{ 
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 'medium', backgroundColor: '#1e40af', color: '#ffffff' }}>
                      {row.signup_date}
                    </TableCell>
                    <TableCell align="center" sx={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                      {row.new_users}
                    </TableCell>
                    {[
                      row.day_1,
                      row.day_3,
                      row.day_7,
                      row.day_14,
                      row.day_30,
                    ].map((value, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        align="center"
                        sx={{
                          ...getColorStyle(value),
                          minWidth: 80,
                          padding: '8px 12px',
                        }}
                      >
                        {value > 0 ? `${value.toFixed(1)}%` : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Legend */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {t('analytics.cohort.legend', { defaultValue: 'Legend:' })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 24, height: 24, backgroundColor: '#16a34a', borderRadius: 1 }} />
            <Typography variant="caption">≥70%</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 24, height: 24, backgroundColor: '#84cc16', borderRadius: 1 }} />
            <Typography variant="caption">40-69%</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 24, height: 24, backgroundColor: '#facc15', borderRadius: 1 }} />
            <Typography variant="caption">10-39%</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 24, height: 24, backgroundColor: '#fef3c7', borderRadius: 1 }} />
            <Typography variant="caption">1-9%</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Box sx={{ width: 24, height: 24, backgroundColor: '#f3f4f6', borderRadius: 1 }} />
            <Typography variant="caption">0%</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

