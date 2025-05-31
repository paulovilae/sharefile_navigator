import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Accordion, AccordionSummary, AccordionDetails, Tooltip, Grid, CircularProgress, Divider, Alert, TextField, Select, MenuItem, FormControlLabel, Checkbox, InputLabel, FormControl as MUIFormControl } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { useTheme } from '@mui/material/styles';
// import { blockTemplate } from '../../theme/blockTemplate'; // Theme might be passed or accessed differently

// Default configuration for the PDF Converter Block
const defaultConfig = {
    engine: 'pymupdf',
    lang: 'en',
    dpi: 200,
    width: 0,
    height: 0,
    scale: 1.0,
    colorspace: 'rgb',
    alpha: false,
    rotation: 0,
    image_format: 'png',
    page_range: '',
    grayscale: false,
    transparent: false,
};

function arrayify(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [val];
}

const PDFConverterBlock = ({ 
    config: initialConfig = {}, 
    inputData = [], // Expects an array of file objects from explorerSelection
    onConfigChange, 
    onProcessComplete, // Callback with { success: boolean, data: any, error?: string }
    blockId // Unique ID for this block instance
}) => {
  const [paramsOpen, setParamsOpen] = useState(false);
  const [config, setConfig] = useState({ ...defaultConfig, ...initialConfig });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // Stores the output of this block
  const [error, setError] = useState(null);
  const theme = useTheme();
  // const template = blockTemplate(theme); // Consider how to handle theming

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
  
  const fetchPdfAsBase64 = async (file) => {
    // Assuming file object has drive_id and id for SharePoint, adapt if structure is different
    if (!file || !file.drive_id || !file.id) {
        throw new Error('Invalid file object for fetching PDF data.');
    }
    const url = `/api/sharepoint/file_content?drive_id=${file.drive_id}&item_id=${file.id}&download=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch PDF for ${file.name}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleConvert = async () => {
    if (!inputData || inputData.length === 0) {
        setError("No input files selected.");
        if(onProcessComplete) onProcessComplete({ success: false, error: "No input files selected.", data: null });
        return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    // For now, process only the first file if multiple are selected by explorer
    // Future enhancement: allow choosing which file or processing all
    const fileToProcess = inputData.find(item => item.itemType === 'file' && item.name?.toLowerCase().endsWith('.pdf'));

    if (!fileToProcess) {
        setError("No PDF file found in selection to process.");
        setLoading(false);
        if(onProcessComplete) onProcessComplete({ success: false, error: "No PDF file found in selection.", data: null });
        return;
    }

    try {
      const pdf_data = await fetchPdfAsBase64(fileToProcess);
      const payload = {
        file_id: fileToProcess.id,
        directory_id: fileToProcess.parentReference?.id || fileToProcess.drive_id, // Adjust as per actual file object structure
        pdf_data,
        ...config // Spread the current config for the API
      };
      
      const res = await fetch('/api/ocr/preprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'PDF conversion failed with status ' + res.status }));
        throw new Error(errData.message || 'PDF conversion failed');
      }
      const data = await res.json();
      setResult(data); // Keep for internal preview of raw API response

      // Transform data for onProcessComplete as per older block's structured output
      const structuredOutput = (data.image_urls || []).map((url, index) => ({
        id: `${fileToProcess.id}_page_${index + 1}`,
        name: `Page ${index + 1} of ${fileToProcess.name}`,
        type: 'image',
        imageUrl: url,
        text: data.page_texts?.[index] || '',
        sourceFileId: fileToProcess.id,
        sourceFileName: fileToProcess.name,
      }));

      if(onProcessComplete) onProcessComplete({ success: true, data: structuredOutput });
    } catch (e) {
      console.error("PDF Conversion error:", e);
      setError(e.message);
      if(onProcessComplete) onProcessComplete({ success: false, error: e.message, data: null });
    } finally {
      setLoading(false);
    }
  };

  const hasResults = result && (result.image_urls?.length || result.page_texts?.length);

  return (
    <Box sx={{ p: 1 }}> {/* Removed template.block for now */}
      {loading && <CircularProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Accordion expanded={paramsOpen} onChange={() => setParamsOpen(o => !o)} sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>Conversion Parameters</AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={3}>
              <MUIFormControl fullWidth size="small">
                <InputLabel>Engine</InputLabel>
                <Select value={config.engine} label="Engine" onChange={e => handleParamChange('engine', e.target.value)}>
                  <MenuItem value="pymupdf">PyMuPDF</MenuItem>
                  <MenuItem value="pdf2image">pdf2image</MenuItem>
                </Select>
              </MUIFormControl>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <MUIFormControl fullWidth size="small">
                <InputLabel>Language</InputLabel>
                <Select value={config.lang} label="Language" onChange={e => handleParamChange('lang', e.target.value)}>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                </Select>
              </MUIFormControl>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <TextField label="DPI" type="number" size="small" fullWidth InputProps={{ inputProps: { min: 72, max: 600 } }} value={config.dpi} onChange={e => handleParamChange('dpi', Number(e.target.value))} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <TextField label="Width" type="number" size="small" fullWidth InputProps={{ inputProps: { min: 0 } }} value={config.width} onChange={e => handleParamChange('width', Number(e.target.value))} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <TextField label="Height" type="number" size="small" fullWidth InputProps={{ inputProps: { min: 0 } }} value={config.height} onChange={e => handleParamChange('height', Number(e.target.value))} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <TextField label="Scale" type="number" size="small" fullWidth InputProps={{ inputProps: { step: 0.01, min: 0.1, max: 10 } }} value={config.scale} onChange={e => handleParamChange('scale', Number(e.target.value))} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <MUIFormControl fullWidth size="small">
                <InputLabel>Colorspace</InputLabel>
                <Select value={config.colorspace} label="Colorspace" onChange={e => handleParamChange('colorspace', e.target.value)}>
                  <MenuItem value="rgb">RGB</MenuItem>
                  <MenuItem value="gray">Gray</MenuItem>
                  <MenuItem value="cmyk">CMYK</MenuItem>
                </Select>
              </MUIFormControl>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <TextField label="Rotation (deg)" type="number" size="small" fullWidth InputProps={{ inputProps: { min: 0, max: 360 } }} value={config.rotation} onChange={e => handleParamChange('rotation', Number(e.target.value))} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <MUIFormControl fullWidth size="small">
                <InputLabel>Image Format</InputLabel>
                <Select value={config.image_format} label="Image Format" onChange={e => handleParamChange('image_format', e.target.value)}>
                  <MenuItem value="png">PNG</MenuItem>
                  <MenuItem value="jpeg">JPEG</MenuItem>
                  <MenuItem value="tiff">TIFF</MenuItem>
                </Select>
              </MUIFormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField label="Page Range" type="text" size="small" fullWidth placeholder="e.g. 1-3,5" value={config.page_range} onChange={e => handleParamChange('page_range', e.target.value)} />
            </Grid>
            <Grid item xs={4} sm={3} md={2}>
              <FormControlLabel control={<Checkbox checked={config.alpha} onChange={e => handleParamChange('alpha', e.target.checked)} />} label="Alpha" />
            </Grid>
            <Grid item xs={4} sm={3} md={2}>
              <FormControlLabel control={<Checkbox checked={config.grayscale} onChange={e => handleParamChange('grayscale', e.target.checked)} />} label="Grayscale" />
            </Grid>
            <Grid item xs={4} sm={3} md={2}>
              <FormControlLabel control={<Checkbox checked={config.transparent} onChange={e => handleParamChange('transparent', e.target.checked)} />} label="Transparent" />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {hasResults && (
        <Box mb={2}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Converted Images Preview:</Typography>
          <Grid container spacing={1}>
            {arrayify(result.image_urls).slice(0,5).map((img, idx) => ( // Show max 5 previews
              <Grid item key={idx}>
                <Tooltip title={result.page_texts?.[idx] || `Page ${idx + 1}`} placement="top" arrow>
                  <img src={img} alt={`PDF page ${idx + 1}`} style={{ maxWidth: 100, maxHeight: 140, borderRadius: 4, border: `1px solid ${theme.palette.divider}` }} />
                </Tooltip>
              </Grid>
            ))}
          </Grid>
          {arrayify(result.image_urls).length > 5 && <Typography variant="caption">Showing first 5 previews...</Typography>}
        </Box>
      )}
      {hasResults && result.metrics && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">Metrics: {JSON.stringify(result.metrics)}</Typography>
        </Box>
      )}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button
          variant="contained" // sx={template.button.sx} color={template.button.color}
          onClick={handleConvert}
          startIcon={<PictureAsPdfIcon />}
          disabled={loading || !inputData || inputData.length === 0 || !inputData.find(item => item.itemType === 'file' && item.name?.toLowerCase().endsWith('.pdf'))}
        >
          {hasResults ? 'Re-Convert PDF' : 'Convert PDF'}
        </Button>
      </Box>
    </Box>
  );
};

export default PDFConverterBlock;