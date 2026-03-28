'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { List, useNotify } from 'react-admin';
import { api } from '@/lib/api';

function SettingsPanel() {
  const notify = useNotify();
  const [requireVerification, setRequireVerification] = useState<boolean>(true);
  const [require2FA, setRequire2FA] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [savingVerification, setSavingVerification] = useState(false);
  const [saving2FA, setSaving2FA] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const [verificationRes, twoFaRes] = await Promise.all([
        api.get<{
          require_email_verification: boolean;
          source: string;
        }>('/api/admin/settings/verification/status'),
        api.get<{
          require_2fa: boolean;
          source: string;
        }>('/api/admin/settings/2fa/status'),
      ]);

      setRequireVerification(verificationRes.data.require_email_verification);
      setRequire2FA(twoFaRes.data.require_2fa);
    } catch (error: unknown) {
      console.error('Failed to fetch settings:', error);
      notify('Failed to load settings', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleVerificationToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSavingVerification(true);

    try {
      await api.put('/api/admin/settings/verification', {
        require_email_verification: newValue,
      });

      setRequireVerification(newValue);
      notify(
        `Email verification ${newValue ? 'enabled' : 'disabled'} successfully`,
        { type: 'success' }
      );
    } catch (error: unknown) {
      console.error('Failed to update verification setting:', error);
      notify('Failed to update setting', { type: 'error' });
      setRequireVerification(!newValue);
    } finally {
      setSavingVerification(false);
    }
  };

  const handle2FAToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSaving2FA(true);

    try {
      await api.put('/api/admin/settings/2fa', {
        require_2fa: newValue,
      });

      setRequire2FA(newValue);
      notify(`Global 2FA requirement ${newValue ? 'enabled' : 'disabled'} successfully`, {
        type: 'success',
      });
    } catch (error: unknown) {
      console.error('Failed to update 2FA setting:', error);
      notify('Failed to update 2FA setting', { type: 'error' });
      setRequire2FA(!newValue);
    } finally {
      setSaving2FA(false);
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
    <Box sx={{ p: 1 }}>
      <Typography variant="h5" gutterBottom>
        Application Settings
      </Typography>

      <Card sx={{ mt: 2, maxWidth: 800 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Email Verification
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            When email verification is disabled, new users can log in immediately after registration without verifying
            their email. You can still manually verify individual users from the Users page. Default is on (required)
            unless changed here or via environment.
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={requireVerification}
                onChange={handleVerificationToggle}
                disabled={savingVerification}
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

      <Card sx={{ mt: 2, maxWidth: 800 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Two-factor authentication (2FA)
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            When enabled, all users must complete 2FA at login (in addition to their password). Default is off; users
            can still enable TOTP on their account when global 2FA is off.
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={require2FA}
                onChange={handle2FAToggle}
                disabled={saving2FA}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  Require 2FA for all users
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {require2FA
                    ? 'Every login must pass the configured second factor'
                    : '2FA is optional unless a user turns it on for their account'}
                </Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>
    </Box>
  );
}

export const SettingsList = () => (
  <List resource="settings" actions={false} pagination={false} perPage={100}>
    <SettingsPanel />
  </List>
);
