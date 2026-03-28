'use client';

import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  TopToolbar,
  ExportButton,
  useNotify,
  useRefresh,
  useRecordContext,
  Button,
} from 'react-admin';
import { api } from '@/lib/api';

const BlockedIPsListActions = () => (
  <TopToolbar>
    <ExportButton />
  </TopToolbar>
);

const UnblockButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();

  if (!record) return null;

  const handleUnblock = async () => {
    try {
      await api.delete(`/api/admin/blocked-ips/${encodeURIComponent(record.ip)}`);
      notify('IP address unblocked successfully', { type: 'success' });
      refresh();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err.response?.data?.error || 'Failed to unblock IP address';
      notify(errorMessage, { type: 'error' });
    }
  };

  return (
    <Button
      label="Unblock"
      onClick={handleUnblock}
      color="primary"
      variant="outlined"
      size="small"
    />
  );
};

export const BlockedIPsList = () => (
  <List
    perPage={25}
    sort={{ field: 'blocked_until', order: 'DESC' }}
    actions={<BlockedIPsListActions />}
    title="Blocked IP Addresses"
  >
    <Datagrid
      rowClick={false}
      rowSx={(record) => ({
        backgroundColor: record.remaining_seconds > 0 ? '#fff3cd' : 'transparent',
      })}
    >
      <TextField source="ip" label="IP Address" sortable />
      <NumberField source="requests" label="Requests" sortable />
      <DateField source="last_seen" showTime sortable label="Last Seen" />
      <DateField source="blocked_until" showTime sortable label="Blocked Until" />
      <NumberField
        source="remaining_seconds"
        label="Remaining (seconds)"
        sortable
        options={{
          style: 'unit',
          unit: 'second',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }}
      />
      <UnblockButton />
    </Datagrid>
  </List>
);
