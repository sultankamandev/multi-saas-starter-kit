import { List, Datagrid, TextField, useRecordContext, useRefresh } from "react-admin";
import { Button } from "@mui/material";
import { api } from "@/lib/api";

function UnblockButton() {
  const record = useRecordContext();
  const refresh = useRefresh();

  if (!record) return null;

  const handleUnblock = async () => {
    await api.delete(`/api/admin/blocked-ips/${record.id}`);
    refresh();
  };

  return (
    <Button size="small" color="error" onClick={handleUnblock}>
      Unblock
    </Button>
  );
}

export function BlockedIPList() {
  return (
    <List>
      <Datagrid>
        <TextField source="id" label="IP" />
        <TextField source="blocked_at" />
        <UnblockButton />
      </Datagrid>
    </List>
  );
}
