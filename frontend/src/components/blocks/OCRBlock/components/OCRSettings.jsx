import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  TextField
} from '@mui/material';
import {
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  AutoFixHigh as PreprocessIcon,
  TextFields as OcrIcon,
  Refresh as RetryIcon
} from '@mui/icons-material';

/**
 * OCR Settings Component - Configurable settings for PDF and OCR processing
 */
const OCRSettings = ({ settings, onSettingChange, title = "OCR Settings" }) => {
  const [expanded, setExpanded] = useState(false);

  const handleSettingChange = (setting, value) => {
    if (onSettingChange) {
      onSettingChange(setting, value);
    }
  };

  return (
    <Accordion 
      expanded={expanded} 
      onChange={() => setExpanded(!expanded)}
      sx={{ mb: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
            <Chip
              label={`${settings.dpi} DPI`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={settings.ocrEngine}
              size="small"
              color="secondary"
              variant="outlined"
            />
            <Chip
              label={settings.enableGpuAcceleration ? 'GPU' : 'CPU'}
              size="small"
              color={settings.enableGpuAcceleration ? 'success' : 'default'}
              variant="outlined"
            />
            {settings.retryOnFailure && (
              <Chip
                label={`Retry ${settings.maxRetries}x`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          {/* PDF Conversion Settings */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PreprocessIcon sx={{ mr: 1, fontSize: 16 }} />
              PDF Conversion Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="DPI"
                  type="number"
                  value={settings.dpi}
                  onChange={(e) => handleSettingChange('dpi', parseInt(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{ min: 72, max: 600 }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Image Format</InputLabel>
                  <Select
                    value={settings.imageFormat}
                    onChange={(e) => handleSettingChange('imageFormat', e.target.value)}
                  >
                    <MenuItem value="PNG">PNG</MenuItem>
                    <MenuItem value="JPEG">JPEG</MenuItem>
                    <MenuItem value="TIFF">TIFF</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Color Mode</InputLabel>
                  <Select
                    value={settings.colorMode}
                    onChange={(e) => handleSettingChange('colorMode', e.target.value)}
                  >
                    <MenuItem value="RGB">RGB</MenuItem>
                    <MenuItem value="Grayscale">Grayscale</MenuItem>
                    <MenuItem value="Monochrome">Monochrome</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Page Range</InputLabel>
                  <Select
                    value={settings.pageRange}
                    onChange={(e) => handleSettingChange('pageRange', e.target.value)}
                  >
                    <MenuItem value="all">All Pages</MenuItem>
                    <MenuItem value="range">Page Range</MenuItem>
                    <MenuItem value="first">First Page Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {settings.pageRange === 'range' && (
                <>
                  <Grid item xs={6}>
                    <TextField
                      label="Start Page"
                      type="number"
                      value={settings.pageStart}
                      onChange={(e) => handleSettingChange('pageStart', parseInt(e.target.value))}
                      size="small"
                      fullWidth
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="End Page"
                      type="number"
                      value={settings.pageEnd}
                      onChange={(e) => handleSettingChange('pageEnd', parseInt(e.target.value))}
                      size="small"
                      fullWidth
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>

          {/* OCR Settings */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <OcrIcon sx={{ mr: 1, fontSize: 16 }} />
              OCR Engine Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>OCR Engine</InputLabel>
                  <Select
                    value={settings.ocrEngine}
                    onChange={(e) => handleSettingChange('ocrEngine', e.target.value)}
                  >
                    <MenuItem value="tesseract-gpu">Tesseract GPU</MenuItem>
                    <MenuItem value="tesseract-cpu">Tesseract CPU</MenuItem>
                    <MenuItem value="paddleocr">PaddleOCR</MenuItem>
                    <MenuItem value="easyocr">EasyOCR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                  >
                    <MenuItem value="eng">English</MenuItem>
                    <MenuItem value="spa">Spanish</MenuItem>
                    <MenuItem value="fra">French</MenuItem>
                    <MenuItem value="deu">German</MenuItem>
                    <MenuItem value="por">Portuguese</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Confidence Threshold: {settings.confidenceThreshold}
                </Typography>
                <Slider
                  value={settings.confidenceThreshold}
                  onChange={(e, value) => handleSettingChange('confidenceThreshold', value)}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  marks
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableGpuAcceleration}
                      onChange={(e) => handleSettingChange('enableGpuAcceleration', e.target.checked)}
                    />
                  }
                  label="Enable GPU Acceleration"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Batch Size"
                  type="number"
                  value={settings.batchSize}
                  onChange={(e) => handleSettingChange('batchSize', parseInt(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{ min: 1, max: 20 }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoSave}
                      onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                    />
                  }
                  label="Auto Save"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Retry Settings */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <RetryIcon sx={{ mr: 1, fontSize: 16 }} />
              Intelligent Retry Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.retryOnFailure}
                      onChange={(e) => handleSettingChange('retryOnFailure', e.target.checked)}
                    />
                  }
                  label="Enable Automatic Retry on OCR Failure"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Max Retry Attempts"
                  type="number"
                  value={settings.maxRetries}
                  onChange={(e) => handleSettingChange('maxRetries', parseInt(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{ min: 0, max: 5 }}
                  disabled={!settings.retryOnFailure}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoImproveParams}
                      onChange={(e) => handleSettingChange('autoImproveParams', e.target.checked)}
                      disabled={!settings.retryOnFailure}
                    />
                  }
                  label="Auto-improve Parameters"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  When enabled, the system will automatically retry failed OCR with improved settings:
                  <br />• Retry 1: Higher DPI, alternative OCR engine
                  <br />• Retry 2: Maximum quality settings (600 DPI, EasyOCR, TIFF format)
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default OCRSettings;