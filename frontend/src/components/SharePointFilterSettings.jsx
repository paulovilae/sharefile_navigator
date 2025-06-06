import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Snackbar,
  Button,
  Stack
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import {
  fetchSharePointFilterSettings,
  updateSharePointFilterSetting,
  updateMultipleSharePointFilterSettings,
  SHAREPOINT_FILTER_SETTING_DEFINITIONS
} from '../utils/sharepointFilterSettings';

import { useTranslate } from 'react-admin';

const SharePointFilterSettings = ({ onClose, onReload }) => {
  const translate = useTranslate();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const fetchedSettings = await fetchSharePointFilterSettings();
      setSettings(fetchedSettings);
    } catch (error) {
      console.error('Error loading SharePoint filter settings:', error);
      showNotification(translate('settings.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setUpdating(prev => Object.keys(settings).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    try {
      const success = await updateMultipleSharePointFilterSettings(settings);
      
      if (success) {
        showNotification(translate('settings.update_success'), 'success');
        if (onClose) onClose();
        if (onReload) onReload();
      } else {
        showNotification(translate('settings.update_failed'), 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification(translate('settings.update_error'), 'error');
    } finally {
      setUpdating({});
    }
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          {translate('settings.loading_sharepoint_settings')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {translate('settings.sharepoint_file_explorer')}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {translate('settings.sharepoint_description')}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {SHAREPOINT_FILTER_SETTING_DEFINITIONS.map((definition) => (
            <Grid item xs={12} md={6} key={definition.key}>
              <FormControl fullWidth size="small">
                <InputLabel>{translate(definition.labelKey)}</InputLabel>
                <Select
                  value={settings[definition.key] || ''}
                  label={translate(definition.labelKey)}
                  onChange={(e) => handleSettingChange(definition.key, e.target.value)}
                  disabled={updating[definition.key]}
                  endAdornment={
                    updating[definition.key] ? (
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                    ) : null
                  }
                >
                  {definition.options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {translate(option.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {translate(definition.descriptionKey)}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            startIcon={<SaveIcon />}
            disabled={Object.values(updating).some(Boolean)}
          >
            Guardar configuración
          </Button>
        </Stack>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            {translate('settings.sharepoint_defaults_description')}
          </Typography>
        </Alert>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SharePointFilterSettings;