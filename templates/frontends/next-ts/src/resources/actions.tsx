'use client';

import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  TopToolbar,
  ExportButton,
} from 'react-admin';

/**
 * Custom toolbar for Action List with Export button
 */
const ActionListActions = () => (
  <TopToolbar>
    <ExportButton />
  </TopToolbar>
);

/**
 * Action List component - displays audit log of admin actions
 * Features:
 * - Read-only view (no edit/delete/create)
 * - Sorted by created_at descending (newest first)
 * - 25 items per page
 * - Export functionality
 */
export const ActionList = () => (
  <List 
    perPage={25} 
    sort={{ field: 'created_at', order: 'DESC' }}
    actions={<ActionListActions />}
    title="Audit Log"
  >
    <Datagrid rowClick={false}>
      <TextField source="id" sortable />
      <TextField source="admin_email" label="Performed by" sortable />
      <TextField source="action" sortable />
      <TextField source="target_email" label="Target User" sortable />
      <TextField source="message" />
      <DateField 
        source="created_at" 
        showTime 
        sortable
        label="Created At"
      />
    </Datagrid>
  </List>
);

