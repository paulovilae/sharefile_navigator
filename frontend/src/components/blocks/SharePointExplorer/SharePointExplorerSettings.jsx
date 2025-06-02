import React from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  TextField
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Speed as PerformanceIcon,
  Storage as CacheIcon
} from '@mui/icons-material';

const SharePointExplorerSettings = ({ 
  settings, 
  onSettingsChange, 
  settingsExpanded, 
  setSettingsExpanded 
}) => {
  const handleSettingChange = (key, value) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <Accordion
      expanded={settingsExpanded}
      onChange={() => setSettingsExpanded(!settingsExpanded)}
      sx={{ mb: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Block Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              icon={<FilterIcon />}
              label={settings.showOnlyPDFs ? 'PDFs Only' : 'All Files'}
              size="small"
              color={settings.showOnlyPDFs ? 'primary' : 'default'}
              variant="outlined"
            />
            <Chip
              icon={<ViewIcon />}
              label={settings.viewMode}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          {/* File Filtering Settings */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterIcon sx={{ mr: 1, fontSize: 16 }} />
              File Filtering
            </Typography>
            <Box sx={{ pl: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showOnlyPDFs}
                    onChange={(e) => handleSettingChange('showOnlyPDFs', e.target.checked)}
                    color="primary"
                  />
                }
                label="Show only PDF files"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                When enabled, only PDF files will be displayed in the file list. Other file types will be hidden.
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableFileTypeFilter}
                    onChange={(e) => handleSettingChange('enableFileTypeFilter', e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable file type filtering"
                sx={{ mt: 1 }}
              />
              
              {settings.enableFileTypeFilter && (
                <TextField
                  label="File extensions (comma-separated)"
                  value={settings.allowedExtensions.join(', ')}
                  onChange={(e) => handleSettingChange('allowedExtensions', 
                    e.target.value.split(',').map(ext => ext.trim().toLowerCase())
                  )}
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                  placeholder="pdf, docx, xlsx"
                />
              )}
            </Box>
          </Grid>

          {/* Display Settings */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ViewIcon sx={{ mr: 1, fontSize: 16 }} />
              Display Options
            </Typography>
            <Box sx={{ pl: 2 }}>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>View Mode</InputLabel>
                <Select
                  value={settings.viewMode}
                  label="View Mode"
                  onChange={(e) => handleSettingChange('viewMode', e.target.value)}
                >
                  <MenuItem value="table">Table View</MenuItem>
                  <MenuItem value="grid">Grid View</MenuItem>
                  <MenuItem value="list">List View</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Items per page</InputLabel>
                <Select
                  value={settings.itemsPerPage}
                  label="Items per page"
                  onChange={(e) => handleSettingChange('itemsPerPage', e.target.value)}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showFilePreview}
                    onChange={(e) => handleSettingChange('showFilePreview', e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable file preview"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          {/* Performance Settings */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PerformanceIcon sx={{ mr: 1, fontSize: 16 }} />
              Performance
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2" gutterBottom>
                Auto-refresh interval (seconds)
              </Typography>
              <Slider
                value={settings.autoRefreshInterval}
                onChange={(e, value) => handleSettingChange('autoRefreshInterval', value)}
                min={0}
                max={300}
                step={30}
                marks={[
                  { value: 0, label: 'Off' },
                  { value: 60, label: '1m' },
                  { value: 180, label: '3m' },
                  { value: 300, label: '5m' }
                ]}
                valueLabelDisplay="auto"
                sx={{ mt: 1, mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableMetrics}
                    onChange={(e) => handleSettingChange('enableMetrics', e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable performance metrics"
              />
            </Box>
          </Grid>

          {/* Cache Settings */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <CacheIcon sx={{ mr: 1, fontSize: 16 }} />
              Caching
            </Typography>
            <Box sx={{ pl: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableCaching}
                    onChange={(e) => handleSettingChange('enableCaching', e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable caching"
              />
              
              <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                Cache TTL (minutes)
              </Typography>
              <Slider
                value={settings.cacheTTL}
                onChange={(e, value) => handleSettingChange('cacheTTL', value)}
                min={1}
                max={60}
                step={5}
                marks={[
                  { value: 5, label: '5m' },
                  { value: 15, label: '15m' },
                  { value: 30, label: '30m' },
                  { value: 60, label: '1h' }
                ]}
                valueLabelDisplay="auto"
                disabled={!settings.enableCaching}
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default SharePointExplorerSettings;