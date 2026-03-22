'use client';

import React from 'react';
import { Admin, Resource } from 'react-admin';
import { AdminRoute } from '@/components/AdminRoute';
import { MUIThemeProvider } from '@/components/MUIThemeProvider';
import { dataProvider } from '@/lib/reactAdminDataProvider';
import { UserList, UserEdit, UserCreate } from '@/resources/users';
import { ActionList } from '@/resources/actions';
import { UserAnalyticsDashboard } from '@/resources/UserAnalyticsDashboard';

/**
 * Admin Panel page using React-Admin
 * Only accessible to users with 'admin' role
 * React-Admin provides its own layout system
 * 
 * CRUD operations map to:
 * - GET /api/admin/users (list)
 * - GET /api/admin/users/:id (get one)
 * - POST /api/admin/users (create)
 * - PUT /api/admin/users/:id (update)
 * - DELETE /api/admin/users/:id (delete)
 * - GET /api/admin/actions (audit log)
 */
export default function AdminPanel() {
  return (
    <AdminRoute>
      <MUIThemeProvider>
        <Admin dataProvider={dataProvider}>
          <Resource
            name="users"
            list={UserList}
            edit={UserEdit}
            create={UserCreate}
          />
          <Resource
            name="actions"
            list={ActionList}
            options={{ label: 'Audit Log' }}
          />
        </Admin>
      </MUIThemeProvider>
    </AdminRoute>
  );
}

