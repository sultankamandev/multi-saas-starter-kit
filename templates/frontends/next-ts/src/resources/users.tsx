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

/**
 * User filters - search and filter options
 */
const userFilters = [
  <TextInput 
    label="Search" 
    source="q" 
    alwaysOn 
    placeholder="Search by name, email..."
  />,
];

/**
 * Custom toolbar for User List with Create and Export buttons
 */
const UserListActions = () => (
  <TopToolbar>
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

/**
 * Custom field component to display full name (first_name + last_name)
 */
const FullNameField = ({ label }: { label?: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
  return <span>{fullName || '-'}</span>;
};

/**
 * Inline editable role field for the list view
 * Allows admins to quickly change user roles without opening the edit page
 */
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
      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking dropdown
    >
      <MenuItem value="user">User</MenuItem>
      <MenuItem value="admin">Admin</MenuItem>
    </Select>
  );
};

/**
 * User List component - displays all users in a table
 * Features:
 * - Search functionality (q parameter)
 * - Pagination (handled automatically by React-Admin)
 * - Sorting (clickable column headers)
 * - Create and Export buttons
 */
export const UserList = () => (
  <List 
    filters={userFilters}
    actions={<UserListActions />}
  >
    <Datagrid rowClick="edit">
      <TextField source="id" sortable />
      <TextField 
        source="first_name" 
        label="First Name"
        sortable
      />
      <TextField 
        source="last_name" 
        label="Last Name"
        sortable
      />
      <FullNameField label="Name" />
      <EmailField source="email" sortable />
      <RoleFieldEditable label="Role" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

/**
 * User Edit component - form for editing existing users
 */
export const UserEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput 
        source="first_name" 
        validate={[required()]}
        label="First Name"
      />
      <TextInput 
        source="last_name" 
        validate={[required()]}
        label="Last Name"
      />
      <TextInput 
        source="email" 
        validate={[required(), email()]}
      />
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
          // Only validate if password is provided
          if (value && value.length < 8) {
            return 'Password must be at least 8 characters';
          }
          return undefined;
        }}
        helperText="Only fill this if you want to change the password"
      />
    </SimpleForm>
  </Edit>
);

/**
 * User Create component - form for creating new users
 */
export const UserCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput 
        source="first_name" 
        validate={[required()]}
        label="First Name"
      />
      <TextInput 
        source="last_name" 
        validate={[required()]}
        label="Last Name"
      />
      <TextInput 
        source="email" 
        validate={[required(), email()]}
      />
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

