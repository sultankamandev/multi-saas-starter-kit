import { Admin as ReactAdmin, Resource } from "react-admin";
import People from "@mui/icons-material/People";
import History from "@mui/icons-material/History";
import Block from "@mui/icons-material/Block";
import Settings from "@mui/icons-material/Settings";
import dataProvider from "@/lib/reactAdminDataProvider";
import UserAnalyticsDashboard from "@/resources/UserAnalyticsDashboard";
import { UserList, UserEdit, UserCreate } from "@/resources/users";
import { ActionList } from "@/resources/actions";
import { BlockedIPList } from "@/resources/blockedIPs";
import { SettingsList } from "@/resources/settings";

export default function Admin() {
  return (
    <ReactAdmin
      dataProvider={dataProvider}
      dashboard={UserAnalyticsDashboard}
      basename="/admin"
    >
      <Resource
        name="users"
        list={UserList}
        edit={UserEdit}
        create={UserCreate}
        icon={People}
      />
      <Resource name="actions" list={ActionList} icon={History} />
      <Resource name="blocked-ips" list={BlockedIPList} icon={Block} />
      <Resource name="settings" list={SettingsList} icon={Settings} />
    </ReactAdmin>
  );
}
