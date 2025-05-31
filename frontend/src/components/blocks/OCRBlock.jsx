import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Accordion, AccordionSummary, AccordionDetails, Tooltip, Grid, CircularProgress, Divider, Alert, Select, MenuItem, InputLabel, FormControl as MUIFormControl } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { useTheme } from '@mui/material/styles';
import { blockTemplate } from '../../theme/blockTemplate';

// Default configuration for the OCR Block
const defaultConfig = {
  engine: 'easyocr',
  lang: 'en',
  // Add other OCR specific parameters here if needed
};

const OCRBlock = ({ 
    config: initialConfig = {}, 
    inputData, // Expects { image_urls: [], file_id: '', directory_id: '' ... } from PDFConverterBlock
    onConfigChange, 
    onProcessComplete, 
    blockId 
}) => {
  const [paramsOpen, setParamsOpen] = useState(false);
  const [config, setConfig] = useState({ ...defaultConfig, ...initialConfig });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // Stores the OCR text and other results
  const [error, setError] = useState(null);
  const theme = useTheme();
  const template = blockTemplate(theme);

  useEffect(() => {
    setConfig({ ...defaultConfig, ...initialConfig });
  }, [initialConfig]);

  const handleParamChange = (paramName, value) => {
    const newConfig = { ...config, [paramName]: value };
    setConfig(newConfig);
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  const handleRunOCR = async () => {
    if (!inputData || !inputData.image_urls || inputData.image_urls.length === 0) {
      setError("No images provided for OCR from the previous step.");
      if(onProcessComplete) onProcessComplete({ success: false, error: "No images for OCR.", data: null });
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        file_id: inputData.file_id, // Pass along from PDFConverter output
        directory_id: inputData.directory_id, // Pass along
        image_urls: inputData.image_urls, // URLs of images to OCR
        engine: config.engine,
        lang: config.lang,
        // Include other OCR parameters from config if the API supports them
      };

      const res = await fetch('/api/ocr/ocr', { // Assuming this is the correct endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'OCR processing failed with status ' + res.status }));
        throw new Error(errData.message || 'OCR processing failed');
      }
      const data = await res.json();
      setResult(data); // data should include { ocr_text: "...", metrics: {...} }
      if(onProcessComplete) onProcessComplete({ success: true, data: data });
    } catch (e) {
      console.error("OCR error:", e);
      setError(e.message);
      if(onProcessComplete) onProcessComplete({ success: false, error: e.message, data: null });
    } finally {
      setLoading(false);
    }
  };
  
  const hasResults = result && result.ocr_text;

  return (
    <Box sx={template.block}>
      {loading && <CircularProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Accordion expanded={paramsOpen} onChange={() => setParamsOpen(o => !o)} sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>OCR Parameters</AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <MUIFormControl fullWidth size="small">
                <InputLabel>OCR Engine</InputLabel>
                <Select value={config.engine} label="OCR Engine" onChange={e => handleParamChange('engine', e.target.value)}>
                  <MenuItem value="easyocr">EasyOCR</MenuItem>
                  <MenuItem value="tesseract">Tesseract</MenuItem>
                  {/* Add other engines as supported */}
                </Select>
              </MUIFormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <MUIFormControl fullWidth size="small">
                <InputLabel>Language</InputLabel>
                <Select value={config.lang} label="Language" onChange={e => handleParamChange('lang', e.target.value)}>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  {/* Add other languages as supported */}
                </Select>
              </MUIFormControl>
            </Grid>
            {/* Add more OCR parameters here as needed */}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {hasResults && (
        <Box mb={2}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>OCR Text Output:</Typography>
          <Box sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100], 
            borderRadius: 1, 
            p: 1.5, 
            maxHeight: 150, 
            overflow: 'auto', 
            fontSize: '0.875rem',
            border: `1px solid ${theme.palette.divider}`,
            whiteSpace: 'pre-wrap' // Preserve line breaks from OCR
          }}>
            {result.ocr_text}
          </Box>
        </Box>
      )}
      {hasResults && result.metrics && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">Metrics: {JSON.stringify(result.metrics)}</Typography>
        </Box>
      )}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button
          variant={template.button.variant}
          color={template.button.color}
          sx={template.button.sx}
          onClick={handleRunOCR}
          startIcon={<TextSnippetIcon />}
          disabled={loading || !inputData || !inputData.image_urls || inputData.image_urls.length === 0}
        >
          {hasResults ? 'Re-Run OCR' : 'Run OCR'}
        </Button>
      </Box>
    </Box>
  );
};

export default OCRBlock;