import { List, Datagrid, TextField, DateField } from "react-admin";

export function ActionList() {
  return (
    <List>
      <Datagrid>
        <TextField source="id" />
        <TextField source="admin_email" />
        <TextField source="action" />
        <TextField source="target_email" />
        <TextField source="message" />
        <DateField source="created_at" showTime />
      </Datagrid>
    </List>
  );
}
