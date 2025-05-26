import * as React from "react";
import { Admin, Resource } from "react-admin";
import dataProvider from "./dataProvider";
import SettingsPage from "./SettingsPage";
import DashboardPage from "./DashboardPage";
import FolderIcon from '@mui/icons-material/Folder';
import MyLayout from "./admin/MyLayout";
import { LocalizationList, LocalizationEdit, LocalizationCreate } from './resources/localizations';
import SharePointLibrariesExplorer from './resources/sharepoint/SharePointLibrariesExplorer';
import christusTheme, { christusDarkTheme } from './theme/christusTheme';
import defaultTheme from './theme/defaultTheme';
import defaultDarkTheme from './theme/defaultDarkTheme';

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
      <Resource
        name="sharepoint/libraries"
        options={{ label: "SharePoint Libraries" }}
        list={SharePointLibrariesExplorer}
      />
      <Resource
        name="settings/settings"
        options={{ label: "Settings" }}
        list={SettingsPage}
      />
    </Admin>
  );
} 