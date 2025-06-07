import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import SidebarMenuEditor from './admin/SidebarMenuEditor';
import SidebarMenuCategoryEditor from './admin/SidebarMenuCategoryEditor';
import SidebarMenuItemEditor from './admin/SidebarMenuItemEditor';
import GenericFileEditor from './components/GenericFileEditor';
import CacheManagement from './components/CacheManagement';
import SharePointFilterSettings from './components/SharePointFilterSettings';
import LocalizationSettings from './pages/LocalizationSettings';
import DatabaseSettings from './components/DatabaseSettings';
import { useTranslate } from 'react-admin';

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
  const translate = useTranslate();
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
    { field: 'key', title: translate('table.column.key') },
    { field: 'value', title: translate('table.column.value') },
    { field: 'category', title: translate('table.column.category') },
    { field: 'description', title: translate('table.column.description') },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={translate('settings.tab.general')} />
        <Tab label={translate('settings.tab.theme')} />
        <Tab label={translate('settings.tab.cache')} />
        <Tab label={translate('settings.tab.database')} />
        <Tab label={translate('settings.tab.localizations')} />
        <Tab label={translate('settings.tab.menu_categories')} />
        <Tab label={translate('settings.tab.menu_items')} />
      </Tabs>
      {tab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>{translate('settings.general_settings')}</Typography>
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
          <Typography variant="h6" sx={{ mb: 2 }}>{translate('settings.tab.theme')}</Typography>
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel id="theme-select-label">{translate('form.label.theme')}</InputLabel>
            <Select
              labelId="theme-select-label"
              value={theme}
              label={translate('form.label.theme')}
              onChange={e => setTheme(e.target.value)}
            >
              {themeOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography sx={{ mt: 2 }} color="text.secondary">
            {translate('settings.theme_description')}
          </Typography>
        </Box>
      )}
      {tab === 2 && (
        <CacheManagement />
      )}
      {tab === 3 && (
        <DatabaseSettings />
      )}
      {tab === 4 && (
        <LocalizationSettings />
      )}
      {tab === 5 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>{translate('settings.tab.menu_categories')}</Typography>
          <SidebarMenuCategoryEditor />
        </Box>
      )}
      {tab === 6 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>{translate('settings.tab.menu_items')}</Typography>
          <SidebarMenuItemEditor />
        </Box>
      )}
    </Box>
);
};

export default SettingsPage; 