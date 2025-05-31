import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SidebarMenuEditor from './admin/SidebarMenuEditor';
import SidebarMenuCategoryEditor from './admin/SidebarMenuCategoryEditor';
import SidebarMenuItemEditor from './admin/SidebarMenuItemEditor';
import GenericFileEditor from './components/GenericFileEditor';
import CacheManagement from './components/CacheManagement';

const themeOptions = [
  { value: 'christus', label: 'CHRISTUS Health' },
  { value: 'default', label: 'Default (Blue/Orange)' },
];

const getStoredTheme = () => localStorage.getItem('theme') || 'christus';

const api = async (url, method = 'GET', body) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
};

const SettingsPage = () => {
  const [tab, setTab] = useState(0);
  const [theme, setTheme] = useState(getStoredTheme());
  const [generalSettings, setGeneralSettings] = useState([]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  useEffect(() => {
    const fetchGeneralSettings = async () => {
      const settings = await api('/api/settings/settings');
      setGeneralSettings(Array.isArray(settings) ? settings : []);
    };
    fetchGeneralSettings();
  }, []);

  const handleAddSetting = async (newSetting) => {
    await api('/api/settings/settings', 'POST', newSetting);
    const settings = await api('/api/settings/settings');
    setGeneralSettings(Array.isArray(settings) ? settings : []);
  };

  const handleUpdateSetting = async (updatedSetting) => {
    await api(`/api/settings/settings/${updatedSetting.id}`, 'PUT', updatedSetting);
    const settings = await api('/api/settings/settings');
    setGeneralSettings(Array.isArray(settings) ? settings : []);
  };

  const handleRemoveSetting = async (settingId) => {
    await api(`/api/settings/settings/${settingId}`, 'DELETE');
    const settings = await api('/api/settings/settings');
    setGeneralSettings(Array.isArray(settings) ? settings : []);
  };

  const generalSettingsColumns = [
    { field: 'id', title: 'ID', dialogVisible: false },
    { field: 'key', title: 'Key' },
    { field: 'value', title: 'Value' },
    { field: 'category', title: 'Category' },
    { field: 'description', title: 'Description' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="General" />
        <Tab label="Theme" />
        <Tab label="Cache" />
        <Tab label="Localizations" />
        <Tab label="Menu Categories" />
        <Tab label="Menu Items" />
      </Tabs>
      {tab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>General Settings</Typography>
          <GenericFileEditor
            data={generalSettings}
            columns={generalSettingsColumns}
            onAddRow={handleAddSetting}
            onUpdateRow={handleUpdateSetting}
            onRemoveRow={handleRemoveSetting}
          />
        </Box>
      )}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Theme</Typography>
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel id="theme-select-label">Theme</InputLabel>
            <Select
              labelId="theme-select-label"
              value={theme}
              label="Theme"
              onChange={e => setTheme(e.target.value)}
            >
              {themeOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography sx={{ mt: 2 }} color="text.secondary">
            The selected theme will be applied across the application. (You may need to reload the page.)
          </Typography>
        </Box>
      )}
      {tab === 2 && (
        <CacheManagement />
      )}
      {tab === 3 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Localizations</Typography>
          <Typography color="text.secondary">(Localization settings go here.)</Typography>
        </Box>
      )}
      {tab === 4 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Menu Categories</Typography>
          <SidebarMenuCategoryEditor />
        </Box>
      )}
      {tab === 5 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Menu Items</Typography>
          <SidebarMenuItemEditor />
        </Box>
      )}
    </Box>
);
};

export default SettingsPage; 