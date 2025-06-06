import * as React from "react";
import { Admin, Resource, CustomRoutes, useTranslate } from "react-admin";
import dataProvider from "./dataProvider";
import i18nProvider from "./i18nProvider";
import SettingsPage from "./SettingsPage";
// import DashboardPage from "./DashboardPage"; // Removed, file deleted
import FolderIcon from '@mui/icons-material/Folder';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SearchIcon from '@mui/icons-material/Search';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import MyLayout from "./admin/MyLayout";
import { LocalizationList, LocalizationEdit, LocalizationCreate } from './resources/localizations';
import LocalizationSettings from './pages/LocalizationSettings';
import christusTheme, { christusDarkTheme } from './theme/christusTheme';
import defaultTheme from './theme/defaultTheme';
import defaultDarkTheme from './theme/defaultDarkTheme';
import BlocksPage from './admin/pages/blocks/BlocksAdminPage';
import SidebarMenuEditor from './admin/SidebarMenuEditor';
import OcrWorkflow from './components/OcrWorkflow';
import ImageSearchPage from './components/ImageSearchPage';
import ProcessHealthMonitor from './components/ProcessHealthMonitor';
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

// Function to load state from localStorage
const loadStateFromLocalStorage = () => {
  const selectedLibrary = JSON.parse(localStorage.getItem('selectedLibrary'));
  const currentFolder = JSON.parse(localStorage.getItem('currentFolder'));
  const selectedItems = JSON.parse(localStorage.getItem('selectedItems'));
  console.log('Loading state from localStorage:', { selectedLibrary, currentFolder, selectedItems });
  return { selectedLibrary, currentFolder, selectedItems };
};

// Function to save state to localStorage
const saveStateToLocalStorage = (selectedLibrary, currentFolder, selectedItems) => {
  console.log('Saving state to localStorage:', { selectedLibrary, currentFolder, selectedItems });
  localStorage.setItem('selectedLibrary', JSON.stringify(selectedLibrary));
  localStorage.setItem('currentFolder', JSON.stringify(currentFolder));
  localStorage.setItem('selectedItems', JSON.stringify(selectedItems));
};

// Localized App component that uses react-admin's useTranslate
function LocalizedApp({ selectedLibrary, setSelectedLibrary, currentFolder, setCurrentFolder, selectedItems, setSelectedItems, themeKey, darkMode }) {
  const translate = useTranslate();

  return (
    <Admin
      dataProvider={dataProvider}
      i18nProvider={i18nProvider}
      layout={MyLayout}
      theme={themeMap[themeKey]}
      darkTheme={darkThemeMap[themeKey]}
      defaultTheme={darkMode ? 'dark' : 'light'}
      dashboard={() => <OcrWorkflow />}
    >
      <CustomRoutes>
        <Route path="/admin/sidebar-menus" element={<SidebarMenuEditor />} />
        <Route path="/ocr-workflow" element={<OcrWorkflow />} />
        <Route path="/image-search" element={<ImageSearchPage />} />
        <Route path="/process-health" element={<ProcessHealthMonitor />} />
        <Route path="/settings/localizations" element={<LocalizationSettings />} />
        <Route path="/settings" element={<SettingsPage />} />
      </CustomRoutes>
      <Resource
        name="blocks"
        options={{ label: translate('nav.menu.blocks') }}
        list={BlocksPage}
      />
      <Resource
        name="settings/settings"
        options={{ label: translate('nav.menu.settings') }}
        list={SettingsPage}
      />
      <Resource
        name="ocr-workflow"
        options={{ label: translate('nav.menu.ocr_workflow') }}
        list={OcrWorkflow}
        icon={TextFieldsIcon}
      />
      <Resource
        name="image-search"
        options={{ label: translate('nav.menu.image_search') }}
        list={ImageSearchPage}
        icon={SearchIcon}
      />
      <Resource
        name="process-health"
        options={{ label: translate('nav.menu.process_health') }}
        list={ProcessHealthMonitor}
        icon={MonitorHeartIcon}
      />
      <Resource
        name="workflow-engine"
        options={{ label: translate('nav.menu.workflow_engine') }}
        // list={WorkflowEngine} // Commented out as the component was removed
      />
    </Admin>
  );
}

export default function App() {
  const [themeKey, setThemeKey] = React.useState(getSelectedTheme());
  const [darkMode, setDarkMode] = React.useState(localStorage.getItem('darkMode') === 'true');
  const [selectedLibrary, setSelectedLibrary] = React.useState(null);
  const [currentFolder, setCurrentFolder] = React.useState(null);
  const [selectedItems, setSelectedItems] = React.useState([]);

  React.useEffect(() => {
      const { selectedLibrary: storedSelectedLibrary, currentFolder: storedCurrentFolder, selectedItems: storedSelectedItems } = loadStateFromLocalStorage() || {};
      if (storedSelectedLibrary) {
          setSelectedLibrary(storedSelectedLibrary);
      }
      if (storedCurrentFolder) {
          setCurrentFolder(storedCurrentFolder);
      }
      if (storedSelectedItems) {
          setSelectedItems(storedSelectedItems);
      }

      const handler = () => {
        setThemeKey(getSelectedTheme());
        setDarkMode(localStorage.getItem('darkMode') === 'true');
      };
      window.addEventListener('themechange', handler);
      return () => {
          window.removeEventListener('themechange', handler);
          // saveStateToLocalStorage will be handled by a separate effect
      };
  }, []); // Empty dependency array to run only on mount

  // Effect to save state to localStorage whenever relevant state changes
  React.useEffect(() => {
      saveStateToLocalStorage(selectedLibrary, currentFolder, selectedItems);
  }, [selectedLibrary, currentFolder, selectedItems]);

  return (
    <LocalizedApp
      selectedLibrary={selectedLibrary}
      setSelectedLibrary={setSelectedLibrary}
      currentFolder={currentFolder}
      setCurrentFolder={setCurrentFolder}
      selectedItems={selectedItems}
      setSelectedItems={setSelectedItems}
      themeKey={themeKey}
      darkMode={darkMode}
    />
  );
}