import * as React from "react";
import { Admin, Resource, CustomRoutes } from "react-admin";
import dataProvider from "./dataProvider";
import SettingsPage from "./SettingsPage";
import Space from "./Space"; // Added import for Space component
// import DashboardPage from "./DashboardPage"; // Removed, file deleted
import FolderIcon from '@mui/icons-material/Folder';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import MyLayout from "./admin/MyLayout";
import { LocalizationList, LocalizationEdit, LocalizationCreate } from './resources/localizations';
import christusTheme, { christusDarkTheme } from './theme/christusTheme';
import defaultTheme from './theme/defaultTheme';
import defaultDarkTheme from './theme/defaultDarkTheme';
import BlocksPage from './admin/pages/blocks/BlocksAdminPage';
import SidebarMenuEditor from './admin/SidebarMenuEditor';
import OcrWorkflow from './components/OcrWorkflow';
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

export default function App() {
  const [themeKey, setThemeKey] = React.useState(getSelectedTheme());
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

      const handler = () => setThemeKey(getSelectedTheme());
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
    <Admin
      dataProvider={dataProvider}
      layout={MyLayout}
      theme={themeMap[themeKey]}
      darkTheme={darkThemeMap[themeKey]}
      dashboard={() => <OcrWorkflow />}
    >
      <CustomRoutes>
        <Route path="/admin/sidebar-menus" element={<SidebarMenuEditor />} />
        <Route path="/ocr-workflow" element={<OcrWorkflow />} />
      </CustomRoutes>
      <Resource
        name="sharepoint/libraries"
        options={{ label: "Workflow Studio" }} // Changed label to "Workflow Studio"
        list={Space} // Use Space component
        icon={FolderIcon} // Added FolderIcon
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
        name="ocr-workflow"
        options={{ label: "OCR Workflow" }}
        list={OcrWorkflow}
        icon={TextFieldsIcon}
      />
      <Resource
        name="workflow-engine"
        options={{ label: "Workflow Engine" }}
        // list={WorkflowEngine} // Commented out as the component was removed
      />
    </Admin>
  );
}