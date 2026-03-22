'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNotify } from 'react-admin';
import { api } from '@/lib/api';

/**
 * Settings component - displays and manages application settings
 */
export const SettingsList = () => {
  const notify = useNotify();
  const [requireVerification, setRequireVerification] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVerificationSetting();
  }, []);

  const fetchVerificationSetting = async () => {
    try {
      const response = await api.get<{
        require_email_verification: boolean;
        source: string;
      }>('/admin/settings/verification/status');
      
      setRequireVerification(response.data.require_email_verification);
    } catch (error: any) {
      console.error('Failed to fetch verification setting:', error);
      notify('Failed to load settings', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSaving(true);

    try {
      await api.put('/admin/settings/verification', {
        require_email_verification: newValue,
      });
      
      setRequireVerification(newValue);
      notify(
        `Email verification ${newValue ? 'enabled' : 'disabled'} successfully`,
        { type: 'success' }
      );
    } catch (error: any) {
      console.error('Failed to update verification setting:', error);
      notify('Failed to update setting', { type: 'error' });
      // Revert the toggle on error
      setRequireVerification(!newValue);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Application Settings
      </Typography>
      
      <Card sx={{ mt: 3, maxWidth: 800 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Email Verification
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            When email verification is disabled, new users can log in immediately after registration without verifying their email.
            You can still manually verify individual users from the Users page.
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={requireVerification}
                onChange={handleVerificationToggle}
                disabled={saving}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  Require Email Verification
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {requireVerification
                    ? 'New users must verify their email before logging in'
                    : 'New users can log in immediately after registration'}
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>
    </Box>
  );
};
