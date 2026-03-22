import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  BooleanInput,
  PasswordInput,
} from "react-admin";

const roleChoices = [
  { id: "user", name: "User" },
  { id: "admin", name: "Admin" },
];

export function UserList() {
  return (
    <List>
      <Datagrid>
        <TextField source="id" />
        <TextField source="first_name" />
        <TextField source="last_name" />
        <TextField source="email" />
        <TextField source="role" />
        <TextField source="language" />
        <DateField source="created_at" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}

export function UserEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="first_name" />
        <TextInput source="last_name" />
        <TextInput source="email" />
        <SelectInput source="role" choices={roleChoices} />
        <TextInput source="password" type="password" />
        <BooleanInput source="verified" />
        <BooleanInput source="two_fa_enabled" />
        <TextInput source="language" />
        <TextInput source="country" />
      </SimpleForm>
    </Edit>
  );
}

export function UserCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="first_name" />
        <TextInput source="last_name" />
        <TextInput source="email" />
        <PasswordInput source="password" isRequired />
        <SelectInput source="role" choices={roleChoices} />
        <TextInput source="language" />
      </SimpleForm>
    </Create>
  );
}
