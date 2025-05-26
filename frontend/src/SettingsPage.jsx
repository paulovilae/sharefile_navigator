import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ListBase, Datagrid, TextField, EditButton, CreateButton, TopToolbar } from 'react-admin';

const themeOptions = [
  { value: 'christus', label: 'CHRISTUS Health' },
  { value: 'default', label: 'Default (Blue/Orange)' },
];

const getStoredTheme = () => localStorage.getItem('theme') || 'christus';

const GeneralSettingsTable = () => (
  <ListBase resource="settings/settings">
    <TopToolbar>
      <CreateButton />
    </TopToolbar>
    <Datagrid>
      <TextField source="id" />
      <TextField source="key" />
      <TextField source="value" />
      <TextField source="category" />
      <TextField source="description" />
      <EditButton />
    </Datagrid>
  </ListBase>
);

const SettingsPage = () => {
  const [tab, setTab] = useState(0);
  const [theme, setTheme] = useState(getStoredTheme());

  useEffect(() => {
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  return (
    <Box sx={{ p: 3 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="General" />
        <Tab label="Theme" />
        <Tab label="Localizations" />
      </Tabs>
      {tab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>General Settings</Typography>
          <GeneralSettingsTable />
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
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Localizations</Typography>
          <Typography color="text.secondary">(Localization settings go here.)</Typography>
        </Box>
      )}
    </Box>
  );
};

export default SettingsPage; 