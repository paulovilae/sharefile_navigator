import * as React from "react";
import { Admin, Resource, CustomRoutes } from "react-admin";
import dataProvider from "./dataProvider";
import SettingsPage from "./SettingsPage";
// import DashboardPage from "./DashboardPage"; // Removed, file deleted
import FolderIcon from '@mui/icons-material/Folder';
import MyLayout from "./admin/MyLayout";
import { LocalizationList, LocalizationEdit, LocalizationCreate } from './resources/localizations';
import SharePointLibrariesExplorer from './resources/sharepoint/SharePointLibrariesExplorer';
import christusTheme, { christusDarkTheme } from './theme/christusTheme';
import defaultTheme from './theme/defaultTheme';
import defaultDarkTheme from './theme/defaultDarkTheme';
import BlocksPage from './resources/BlocksPage';
import WorkflowEngine from './resources/sharepoint/WorkflowEngine';
import SidebarMenuEditor from './admin/SidebarMenuEditor';
import { Route } from 'react-router-dom';

const themeMap = {
  christus: christusTheme,
  default: defaultTheme,
};
const darkThemeMap = {
  christus: christusDarkTheme,
  default: defaultDarkTheme,
};

function getSelectedTheme() {
  return localStorage.getItem('theme') || 'christus';
}

export default function App() {
  const [themeKey, setThemeKey] = React.useState(getSelectedTheme());

  React.useEffect(() => {
    const handler = () => setThemeKey(getSelectedTheme());
    window.addEventListener('themechange', handler);
    return () => window.removeEventListener('themechange', handler);
  }, []);

  return (
    <Admin
      dataProvider={dataProvider}
      layout={MyLayout}
      theme={themeMap[themeKey]}
      darkTheme={darkThemeMap[themeKey]}
    >
      <CustomRoutes>
        <Route path="/admin/sidebar-menus" element={<SidebarMenuEditor />} />
      </CustomRoutes>
      <Resource
        name="sharepoint/libraries"
        options={{ label: "SharePoint Libraries" }}
        list={SharePointLibrariesExplorer}
      />
      <Resource
        name="blocks"
        options={{ label: "Blocks" }}
        list={BlocksPage}
      />
      <Resource
        name="settings/settings"
        options={{ label: "Settings" }}
        list={SettingsPage}
      />
      <Resource
        name="workflow-engine"
        options={{ label: "Workflow Engine" }}
        list={WorkflowEngine}
      />
    </Admin>
  );
} 