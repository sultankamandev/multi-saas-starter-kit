'use client';

import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  EmailField,
  EditButton,
  DeleteButton,
  Edit,
  SimpleForm,
  TextInput,
  Create,
  SelectInput,
  BooleanInput,
  BooleanField,
  required,
  email,
  minLength,
  TopToolbar,
  CreateButton,
  ExportButton,
  useRecordContext,
  useUpdate,
  useNotify,
} from 'react-admin';
import { MenuItem, Select } from '@mui/material';

const userFilters = [
  <TextInput
    label="Search"
    source="q"
    alwaysOn
    placeholder="Search by name, email..."
  />,
];

const UserListActions = () => (
  <TopToolbar>
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const FullNameField = ({ label }: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
  return <span>{fullName || '-'}</span>;
};

const RoleFieldEditable = ({ label }: { label?: string }) => {
  const record = useRecordContext();
  const [update] = useUpdate();
  const notify = useNotify();

  if (!record) return null;

  const handleChange = (event: { target: { value: unknown } }) => {
    const newRole = event.target.value as string;
    update(
      'users',
      {
        id: record.id,
        data: { role: newRole },
        previousData: record,
      },
      {
        onSuccess: () => {
          notify(`Role updated to ${newRole} for ${record.email}`, {
            type: 'success',
          });
        },
        onError: () => {
          notify('Failed to update role', { type: 'error' });
        },
      }
    );
  };

  return (
    <Select
      value={record.role || 'user'}
      onChange={handleChange}
      variant="standard"
      sx={{ minWidth: 120 }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem value="user">User</MenuItem>
      <MenuItem value="admin">Admin</MenuItem>
    </Select>
  );
};

export const UserList = () => (
  <List filters={userFilters} actions={<UserListActions />}>
    <Datagrid rowClick="edit">
      <TextField source="id" sortable />
      <TextField source="first_name" label="First Name" sortable />
      <TextField source="last_name" label="Last Name" sortable />
      <FullNameField label="Name" />
      <EmailField source="email" sortable />
      <BooleanField source="two_fa_enabled" label="2FA" sortable />
      <RoleFieldEditable label="Role" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const UserEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput source="first_name" validate={[required()]} label="First Name" />
      <TextInput source="last_name" validate={[required()]} label="Last Name" />
      <TextInput source="email" validate={[required(), email()]} />
      <SelectInput
        source="role"
        choices={[
          { id: 'user', name: 'User' },
          { id: 'admin', name: 'Admin' },
        ]}
        validate={[required()]}
      />
      <TextInput
        source="password"
        type="password"
        label="New Password (leave empty to keep current)"
        validate={(value) => {
          if (value && value.length < 8) {
            return 'Password must be at least 8 characters';
          }
          return undefined;
        }}
        helperText="Only fill this if you want to change the password"
      />
      <BooleanInput
        source="two_fa_enabled"
        label="Two-factor authentication (2FA) enabled"
        helperText="Turn off to disable 2FA for this user; any TOTP secret stored for them is cleared when disabled."
      />
    </SimpleForm>
  </Edit>
);

export const UserCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="first_name" validate={[required()]} label="First Name" />
      <TextInput source="last_name" validate={[required()]} label="Last Name" />
      <TextInput source="email" validate={[required(), email()]} />
      <TextInput
        source="password"
        type="password"
        validate={[required(), minLength(8, 'Password must be at least 8 characters')]}
      />
      <SelectInput
        source="role"
        choices={[
          { id: 'user', name: 'User' },
          { id: 'admin', name: 'Admin' },
        ]}
        defaultValue="user"
        validate={[required()]}
      />
    </SimpleForm>
  </Create>
);
