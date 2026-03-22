import { List, Datagrid, TextField } from "react-admin";

export function SettingsList() {
  return (
    <List>
      <Datagrid>
        <TextField source="key" />
        <TextField source="value" />
      </Datagrid>
    </List>
  );
}
