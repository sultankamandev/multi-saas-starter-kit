'use client';

import React from 'react';
import { Admin, Resource } from 'react-admin';
import { AdminRoute } from '@/components/AdminRoute';
import { AdminAppLayout } from '@/components/AdminLayout';
import { MUIThemeProvider } from '@/components/MUIThemeProvider';
import { dataProvider } from '@/lib/reactAdminDataProvider';
import { UserList, UserEdit, UserCreate } from '@/resources/users';
import { ActionList } from '@/resources/actions';
import { UserAnalyticsDashboard } from '@/resources/UserAnalyticsDashboard';
import { BlockedIPsList } from '@/resources/blockedIPs';
import { SettingsList } from '@/resources/settings';

/**
 * Admin Panel (React-Admin): dashboard, users CRUD, audit log, blocked IPs, settings.
 * API base: /api/admin/*
 */
export default function AdminPanel() {
  return (
    <AdminRoute>
      <MUIThemeProvider>
        <Admin
          layout={AdminAppLayout}
          dashboard={UserAnalyticsDashboard}
          dataProvider={dataProvider}
        >
          <Resource name="users" list={UserList} edit={UserEdit} create={UserCreate} />
          <Resource name="actions" list={ActionList} options={{ label: 'Audit Log' }} />
          <Resource name="blocked-ips" list={BlockedIPsList} options={{ label: 'Blocked IPs' }} />
          <Resource name="settings" list={SettingsList} options={{ label: 'Settings' }} />
        </Admin>
      </MUIThemeProvider>
    </AdminRoute>
  );
}
